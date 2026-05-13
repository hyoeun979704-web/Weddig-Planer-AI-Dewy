-- ============================================================================
-- 친구 초대(레퍼럴) 시스템
-- ----------------------------------------------------------------------------
-- 초대자: 본인 전용 8자리 영숫자 코드. 코드가 사용될 때마다 1,000P 적립.
-- 피초대자: 최초 1회 코드 입력 시 500P 적립.
-- 본인의 코드는 본인이 사용할 수 없음.
-- ============================================================================

CREATE TABLE public.referral_codes (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes (code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_referral_code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.referrals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code              text NOT NULL,
  redeemed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals (referrer_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);

-- 1. 본인 코드 조회/생성
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code    text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempt integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- 중복 회피 (최대 10회 시도)
  LOOP
    v_attempt := v_attempt + 1;
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_alphabet, (random() * length(v_alphabet))::integer + 1, 1);
    END LOOP;

    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (v_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique code';
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

-- 2. 코드 사용 (피초대자가 호출)
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS TABLE (
  redeemed        boolean,
  referee_amount  integer,
  referrer_amount integer,
  message         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_referrer    uuid;
  v_already     boolean;
  v_referee_p   integer := 500;
  v_referrer_p  integer := 1000;
  v_referral_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 코드 형식 검증
  IF p_code IS NULL OR length(p_code) <> 8 THEN
    RETURN QUERY SELECT false, 0, 0, '코드 형식이 올바르지 않습니다.'::text;
    RETURN;
  END IF;

  -- 이미 다른 코드를 사용했으면 거부
  SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referee_user_id = v_user_id)
    INTO v_already;
  IF v_already THEN
    RETURN QUERY SELECT false, 0, 0, '이미 친구 초대 코드를 사용하셨어요.'::text;
    RETURN;
  END IF;

  -- 코드 → referrer 찾기
  SELECT user_id INTO v_referrer
  FROM public.referral_codes
  WHERE code = upper(p_code);

  IF v_referrer IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, '존재하지 않는 코드입니다.'::text;
    RETURN;
  END IF;

  -- 본인 코드 사용 금지
  IF v_referrer = v_user_id THEN
    RETURN QUERY SELECT false, 0, 0, '본인의 코드는 사용할 수 없어요.'::text;
    RETURN;
  END IF;

  -- referrals INSERT
  INSERT INTO public.referrals (referrer_user_id, referee_user_id, code)
  VALUES (v_referrer, v_user_id, upper(p_code))
  RETURNING id INTO v_referral_id;

  -- 양쪽 적립
  PERFORM public.earn_points(v_user_id, v_referee_p, 'referral_redeemed', v_referral_id);
  PERFORM public.earn_points(v_referrer, v_referrer_p, 'referral_reward', v_referral_id);

  RETURN QUERY SELECT true, v_referee_p, v_referrer_p, '초대 코드가 적용되었어요!'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;
