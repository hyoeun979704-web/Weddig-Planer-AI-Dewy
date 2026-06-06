-- 포인트 파밍/중복지급 방지 (코드리뷰 260606_2 deferred 항목).
--
-- 1) add_game_points: 클라이언트가 보낸 p_score 를 그대로 신뢰 → 점수 위조로 자가
--    포인트 파밍 가능했음. 게임 보상에 '하루 합계 상한'(KST 기준)을 둬 근본 차단.
--    (상한값 500P/일 — 운영하며 조정 가능)
-- 2) claim_daily_attendance: SELECT~INSERT 사이 경합(더블탭/병렬)으로 하루 출석
--    포인트가 중복 지급될 수 있었음. user_attendance 행 잠금(FOR UPDATE)으로 기존
--    사용자의 동시호출을 직렬화하고, 최초 1회 경합까지 막도록 point_transactions 에
--    일자 부분 유니크 인덱스를 추가(미션 보너스와 동일 패턴, backstop).

-- ── 1. 게임 보상 일일 한도 ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_game_points(p_user_id uuid, p_score integer, p_doubled boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_earned       integer;
  v_balance      integer;
  v_score_id     uuid;
  v_today_earned integer;
  v_daily_cap    constant integer := 500;  -- 게임으로 하루 최대 획득 포인트
  v_allow        integer;
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot add points for other users';
  END IF;

  v_earned := GREATEST(1, p_score / 20);
  IF p_doubled THEN
    v_earned := v_earned * 2;
  END IF;

  -- 오늘(KST) 게임으로 이미 받은 포인트 합산 → 남은 한도까지만 지급.
  SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
  FROM public.point_transactions
  WHERE user_id = p_user_id
    AND reason IN ('merge_game', 'merge_game_doubled')
    AND (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date;

  v_allow := GREATEST(0, v_daily_cap - v_today_earned);
  v_earned := LEAST(v_earned, v_allow);

  INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
  VALUES (p_user_id, p_score, v_earned, p_doubled)
  RETURNING id INTO v_score_id;

  -- earn_points 는 양수만 허용 → 한도 소진 시(0) 호출 생략.
  IF v_earned > 0 THEN
    SELECT balance_after INTO v_balance
    FROM public.earn_points(
      p_user_id,
      v_earned,
      CASE WHEN p_doubled THEN 'merge_game_doubled' ELSE 'merge_game' END,
      v_score_id
    );
  END IF;

  RETURN v_earned;
END;
$function$;

-- ── 2. 출석 경합 방지: 행 잠금 + 일자 부분 유니크 인덱스(backstop) ──────────
CREATE UNIQUE INDEX IF NOT EXISTS daily_attendance_daily_unique
  ON public.point_transactions (user_id, ((created_at AT TIME ZONE 'Asia/Seoul')::date))
  WHERE reason = 'daily_attendance';

CREATE OR REPLACE FUNCTION public.claim_daily_attendance()
RETURNS TABLE(claimed boolean, base_amount integer, bonus_amount integer, current_streak integer, total_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_today     date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_last_date date;
  v_streak    integer;
  v_base      integer := 50;
  v_bonus     integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 행 잠금으로 동시 호출 직렬화 (기존 사용자의 더블탭/병렬 중복지급 차단).
  SELECT ua.last_date, ua.current_streak
    INTO v_last_date, v_streak
  FROM public.user_attendance ua
  WHERE ua.user_id = v_user_id
  FOR UPDATE;

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
