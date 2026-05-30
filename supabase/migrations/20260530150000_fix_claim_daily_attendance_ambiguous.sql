-- claim_daily_attendance: SELECT 가 RETURNS TABLE 의 current_streak 컬럼과
-- user_attendance 의 current_streak 컬럼 사이에서 ambiguous 한 회귀 (PG 17 strict).
-- 결과적으로 RPC 호출 시 ERROR 42702 발생 → 출석 체크가 항상 실패.
-- 테이블 alias 로 명시해서 해결. 동작 자체는 동일.

CREATE OR REPLACE FUNCTION public.claim_daily_attendance()
RETURNS TABLE(claimed boolean, base_amount integer, bonus_amount integer, current_streak integer, total_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT ua.last_date, ua.current_streak
    INTO v_last_date, v_streak
  FROM public.user_attendance ua
  WHERE ua.user_id = v_user_id;

  IF v_last_date = v_today THEN
    RETURN QUERY SELECT false, 0, 0, COALESCE(v_streak, 0), 0;
    RETURN;
  END IF;

  IF v_last_date = v_today - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  IF v_streak % 7 = 0 THEN
    v_bonus := v_bonus + 200;
  END IF;
  IF v_streak % 30 = 0 THEN
    v_bonus := v_bonus + 1000;
  END IF;

  INSERT INTO public.user_attendance (user_id, last_date, current_streak, longest_streak, total_check_ins)
  VALUES (v_user_id, v_today, v_streak, v_streak, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET last_date       = EXCLUDED.last_date,
        current_streak  = EXCLUDED.current_streak,
        longest_streak  = GREATEST(public.user_attendance.longest_streak, EXCLUDED.current_streak),
        total_check_ins = public.user_attendance.total_check_ins + 1,
        updated_at      = now();

  PERFORM public.earn_points(v_user_id, v_base, 'daily_attendance', NULL);
  IF v_bonus > 0 THEN
    PERFORM public.earn_points(v_user_id, v_bonus, 'attendance_streak_bonus', NULL);
  END IF;

  RETURN QUERY SELECT true, v_base, v_bonus, v_streak, v_base + v_bonus;
END;
$function$;
