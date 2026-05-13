-- ============================================================================
-- 일일 출석 체크 시스템
-- ----------------------------------------------------------------------------
-- 매일 1회 출석 시 50P 적립. 연속 출석 시 매 7일마다 +200P, 매 30일마다
-- +1,000P 추가 보너스. 날짜 기준은 KST(Asia/Seoul).
-- ============================================================================

CREATE TABLE public.user_attendance (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_date       date NOT NULL,
  current_streak  integer NOT NULL DEFAULT 0,
  longest_streak  integer NOT NULL DEFAULT 0,
  total_check_ins integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_attendance" ON public.user_attendance
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_daily_attendance()
RETURNS TABLE (
  claimed         boolean,
  base_amount     integer,
  bonus_amount    integer,
  current_streak  integer,
  total_earned    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_today        date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_last_date    date;
  v_streak       integer;
  v_base         integer := 50;
  v_bonus        integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_date, current_streak
    INTO v_last_date, v_streak
  FROM public.user_attendance
  WHERE user_id = v_user_id;

  -- 이미 오늘 출석한 경우
  IF v_last_date = v_today THEN
    RETURN QUERY SELECT false, 0, 0, COALESCE(v_streak, 0), 0;
    RETURN;
  END IF;

  -- 연속 출석 계산
  IF v_last_date = v_today - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  -- 보너스 (매 7일, 매 30일)
  IF v_streak % 7 = 0 THEN
    v_bonus := v_bonus + 200;
  END IF;
  IF v_streak % 30 = 0 THEN
    v_bonus := v_bonus + 1000;
  END IF;

  -- upsert attendance
  INSERT INTO public.user_attendance (user_id, last_date, current_streak, longest_streak, total_check_ins)
  VALUES (v_user_id, v_today, v_streak, v_streak, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET last_date       = EXCLUDED.last_date,
        current_streak  = EXCLUDED.current_streak,
        longest_streak  = GREATEST(public.user_attendance.longest_streak, EXCLUDED.current_streak),
        total_check_ins = public.user_attendance.total_check_ins + 1,
        updated_at      = now();

  -- 적립
  PERFORM public.earn_points(v_user_id, v_base, 'daily_attendance', NULL);
  IF v_bonus > 0 THEN
    PERFORM public.earn_points(v_user_id, v_bonus, 'attendance_streak_bonus', NULL);
  END IF;

  RETURN QUERY SELECT true, v_base, v_bonus, v_streak, v_base + v_bonus;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_attendance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_attendance() TO authenticated;
