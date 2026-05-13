-- ============================================================================
-- 포인트 시스템 운영 이슈 수정
-- ----------------------------------------------------------------------------
-- 1) user_points 의 클라이언트용 INSERT/UPDATE/SELECT 정책 제거.
--    모든 변경은 SECURITY DEFINER RPC(earn_points/spend_points)를 통과해야
--    하며, 직접 INSERT 정책이 있는 상태에서는 가입 트리거의 user_points
--    INSERT 가 RLS 검증(auth.uid()=user_id)에 막혀 적립이 누락되었다.
--    SELECT 정책은 users_select_own_points 만 유지한다.
--
-- 2) PR #41 머지 이전 가입자(2명) 1,000P 가입 보너스 백필.
--
-- 3) handle_new_user 에 EXCEPTION 블록 추가. user_points 적립이 어떤
--    이유로 실패해도 가입 자체는 진행되도록 하여 더 이상 사용자가
--    유실되지 않게 한다.
-- ============================================================================

-- 1. 불필요한 INSERT/UPDATE 정책 제거
DROP POLICY IF EXISTS "Users can insert own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;

-- 2. 백필 — 기존 가입자에게 1,000P 적립 보너스 (이미 user_points 행이 있으면 건너뜀)
WITH new_rows AS (
  INSERT INTO public.user_points (user_id, balance, total_earned, total_points)
  SELECT u.id, 1000, 1000, 1000
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.user_points up WHERE up.user_id = u.id)
  RETURNING user_id
)
INSERT INTO public.point_transactions (user_id, amount, reason, balance_after)
SELECT user_id, 1000, 'signup_bonus_backfill', 1000 FROM new_rows;

-- 3. handle_new_user 안전장치
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    INSERT INTO public.user_points (user_id, balance, total_earned, total_points)
    VALUES (NEW.id, 1000, 1000, 1000)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.point_transactions (user_id, amount, reason, balance_after)
    VALUES (NEW.id, 1000, 'signup_bonus', 1000);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user signup_bonus failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
