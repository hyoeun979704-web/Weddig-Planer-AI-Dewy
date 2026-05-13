-- ============================================================================
-- 포인트(P) 시스템 정비
-- ----------------------------------------------------------------------------
-- 기존 user_points (게임 누적 점수 저장용)에 거래 내역·총량 추적을 추가하고,
-- 가입 시 1,000P 지급 트리거를 도입한다. add_game_points는 새 earn_points
-- RPC를 통과하도록 갱신해 모든 적립이 거래 내역으로 남도록 한다.
--
-- 환산 가치: 1P = 0.2원 (5P = 1원).
-- ============================================================================

-- 1. user_points 확장 — 새 컬럼 추가 + 기존 total_points 데이터 백필
ALTER TABLE public.user_points
  ADD COLUMN IF NOT EXISTS balance      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent  integer NOT NULL DEFAULT 0;

UPDATE public.user_points
SET balance      = total_points,
    total_earned = total_points
WHERE balance = 0 AND total_points > 0;

ALTER TABLE public.user_points
  ADD CONSTRAINT user_points_balance_nonneg CHECK (balance >= 0);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_points" ON public.user_points;
CREATE POLICY "users_select_own_points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

-- 2. point_transactions 신규 (거래 내역)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount         integer NOT NULL,           -- 양수=적립, 음수=차감
  reason         text NOT NULL,
  ref_id         uuid,
  balance_after  integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
  ON public.point_transactions (user_id, created_at DESC);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_point_txns" ON public.point_transactions;
CREATE POLICY "users_select_own_point_txns" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 3. earn_points RPC (적립)
CREATE OR REPLACE FUNCTION public.earn_points(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_ref_id  uuid DEFAULT NULL
)
RETURNS TABLE (balance_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.user_points (user_id, balance, total_earned, total_points)
  VALUES (p_user_id, p_amount, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance      = public.user_points.balance + EXCLUDED.balance,
        total_earned = public.user_points.total_earned + EXCLUDED.total_earned,
        total_points = public.user_points.total_points + EXCLUDED.total_points,
        updated_at   = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.point_transactions (user_id, amount, reason, ref_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN QUERY SELECT v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.earn_points(uuid, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.earn_points(uuid, integer, text, uuid) TO service_role;

-- 4. spend_points RPC (차감)
CREATE OR REPLACE FUNCTION public.spend_points(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_ref_id  uuid DEFAULT NULL
)
RETURNS TABLE (balance_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE public.user_points
  SET balance     = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at  = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'user_points row not found';
  END IF;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  INSERT INTO public.point_transactions (user_id, amount, reason, ref_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN QUERY SELECT v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_points(uuid, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_points(uuid, integer, text, uuid) TO service_role;

-- 5. add_game_points 갱신 — 새 거래 내역 시스템을 사용하도록
CREATE OR REPLACE FUNCTION public.add_game_points(
  p_user_id  uuid,
  p_score    integer,
  p_doubled  boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earned    integer;
  v_balance   integer;
  v_score_id  uuid;
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot add points for other users';
  END IF;

  v_earned := GREATEST(1, p_score / 20);
  IF p_doubled THEN
    v_earned := v_earned * 2;
  END IF;

  INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
  VALUES (p_user_id, p_score, v_earned, p_doubled)
  RETURNING id INTO v_score_id;

  SELECT balance_after INTO v_balance
  FROM public.earn_points(
    p_user_id,
    v_earned,
    CASE WHEN p_doubled THEN 'merge_game_doubled' ELSE 'merge_game' END,
    v_score_id
  );

  RETURN v_earned;
END;
$$;

-- 6. 가입 트리거 갱신 — 5하트 제거 + 1,000P 지급
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_points (user_id, balance, total_earned, total_points)
  VALUES (NEW.id, 1000, 1000, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.point_transactions (user_id, amount, reason, balance_after)
  VALUES (NEW.id, 1000, 'signup_bonus', 1000);

  RETURN NEW;
END;
$$;
