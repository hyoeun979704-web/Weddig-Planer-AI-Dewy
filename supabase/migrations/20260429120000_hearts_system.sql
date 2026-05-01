-- AI Studio 하트(토큰) 시스템
-- v1: 드레스 피팅에 사용. v2에서 메이크업·청첩장 등 6개 서비스로 확장.
-- 비즈니스 모델: 챗봇은 구독제, AI Studio는 하트 토큰제로 분리.

-- ============================================================================
-- 1. 사용자 하트 잔액
-- ============================================================================
CREATE TABLE public.user_hearts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_hearts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hearts"
ON public.user_hearts FOR SELECT
USING (auth.uid() = user_id);

-- 직접 INSERT/UPDATE는 차단. 모든 변경은 spend_hearts/earn_hearts RPC 통과.

-- ============================================================================
-- 2. 하트 거래 로그 (감사·환불·디버깅)
-- ============================================================================
CREATE TABLE public.heart_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_heart_transactions_user_created
ON public.heart_transactions(user_id, created_at DESC);

ALTER TABLE public.heart_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own heart transactions"
ON public.heart_transactions FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON COLUMN public.heart_transactions.reason IS
  'signup_bonus | signup_bonus_backfill | purchase | first_purchase_bonus | dress_fitting | refund_failed_generation | share_bonus | invite_bonus | daily_attendance | manual_adjust';

-- ============================================================================
-- 3. 드레스 피팅 생성 기록
-- ============================================================================
CREATE TABLE public.dress_fittings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_image_path TEXT NOT NULL,
  result_image_path TEXT,
  prompt_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  hearts_spent INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','done','failed','refunded')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_dress_fittings_user_created
ON public.dress_fittings(user_id, created_at DESC);

CREATE INDEX idx_dress_fittings_pending
ON public.dress_fittings(status) WHERE status = 'pending';

ALTER TABLE public.dress_fittings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dress fittings"
ON public.dress_fittings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dress fittings"
ON public.dress_fittings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 결과 갱신은 Edge Function (service_role) 에서만 수행

CREATE TRIGGER update_dress_fittings_updated_at
BEFORE UPDATE ON public.dress_fittings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. Coming Soon 서비스 사전알림 신청 (마케팅 리스트)
-- ============================================================================
CREATE TABLE public.service_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  contact TEXT,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_id)
);

CREATE INDEX idx_service_waitlist_service ON public.service_waitlist(service_id);

ALTER TABLE public.service_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register to waitlist"
ON public.service_waitlist FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own waitlist entries"
ON public.service_waitlist FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

COMMENT ON COLUMN public.service_waitlist.service_id IS
  'makeup-finder | mobile-invitation | paper-invitation | wedding-photo | ceremony-video';

-- ============================================================================
-- 5. 하트 차감 RPC (race condition-safe atomic deduction)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.spend_hearts(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_ref_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, balance_after INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_current INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'invalid_amount'::TEXT;
    RETURN;
  END IF;

  -- 한 번의 UPDATE로 잔액 충분 검사 + 차감 (atomic)
  UPDATE public.user_hearts
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    SELECT balance INTO v_current FROM public.user_hearts WHERE user_id = p_user_id;
    RETURN QUERY SELECT FALSE, COALESCE(v_current, 0), 'insufficient_balance'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.heart_transactions (user_id, amount, reason, ref_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN QUERY SELECT TRUE, v_new_balance, 'ok'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_hearts(UUID, INTEGER, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_hearts(UUID, INTEGER, TEXT, UUID) TO service_role;

-- ============================================================================
-- 6. 하트 적립 RPC (가입·결제·공유·초대 모두 통과)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.earn_hearts(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_ref_id UUID DEFAULT NULL
)
RETURNS TABLE (balance_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.user_hearts (user_id, balance, total_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_hearts.balance + EXCLUDED.balance,
      total_earned = public.user_hearts.total_earned + EXCLUDED.total_earned,
      updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.heart_transactions (user_id, amount, reason, ref_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN QUERY SELECT v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.earn_hearts(UUID, INTEGER, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.earn_hearts(UUID, INTEGER, TEXT, UUID) TO service_role;

-- ============================================================================
-- 7. 가입 시 5 하트 자동 적립 (handle_new_user 확장)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_hearts (user_id, balance, total_earned)
  VALUES (NEW.id, 5, 5)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.heart_transactions (user_id, amount, reason, balance_after)
  VALUES (NEW.id, 5, 'signup_bonus', 5);

  RETURN NEW;
END;
$$;

-- 기존 트리거(on_auth_user_created)는 새 함수 정의를 자동 사용

-- ============================================================================
-- 8. 기존 사용자 백필 (신규 가입자와 동일하게 5 하트 보너스)
-- ============================================================================
WITH new_hearts AS (
  INSERT INTO public.user_hearts (user_id, balance, total_earned)
  SELECT id, 5, 5 FROM auth.users
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id
)
INSERT INTO public.heart_transactions (user_id, amount, reason, balance_after)
SELECT user_id, 5, 'signup_bonus_backfill', 5 FROM new_hearts;
