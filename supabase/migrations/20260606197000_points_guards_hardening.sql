-- 코드리뷰 후속 하드닝(포인트 적립 가드).
--
-- 1) add_game_points: 광고 보너스(doubled=true) 분기가 사실상 무제한이었음
--    - base 는 v_games>=3 로 막지만 bonus 는 v_games>3(off-by-one)이고, bonus 는
--      doubled=false 판수만 보므로 doubled=true 를 반복 호출해도 카운트가 안 늘어
--      한도를 우회 가능(직접 RPC 파밍). → base/bonus 각각 doubled 값 기준으로 3회 캡.
--    - COUNT(*) 가 비직렬 read 라 동시 호출 시 한도 초과 가능 → per-user advisory lock.
-- 2) claim_daily_attendance / complete_tutorial: FOR UPDATE 가 '아직 없는 행'은 못 잠가
--    최초 동시 호출이 유니크 인덱스 backstop 에서 '처리 안 된 예외'로 터져 정상 클레임을
--    롤백시킴. → per-user advisory lock 으로 직렬화(인덱스는 backstop 으로 유지).

-- ── add_game_points: 대칭 캡 + 직렬화 ──────────────────────────────────────
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
  v_today        date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_games        integer;
  v_daily_games  constant integer := 3;
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot add points for other users';
  END IF;

  -- 같은 유저의 동시 호출 직렬화(판수 카운트 TOCTOU 방지).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  v_earned := GREATEST(1, p_score / 40);

  -- 기본/보너스 각각 doubled 값 기준으로 하루 3회까지만 적립(대칭 캡).
  SELECT count(*) INTO v_games
  FROM public.game_scores
  WHERE user_id = p_user_id
    AND doubled = p_doubled
    AND (created_at AT TIME ZONE 'Asia/Seoul')::date = v_today;

  IF v_games >= v_daily_games THEN
    INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
    VALUES (p_user_id, p_score, 0, p_doubled);
    RETURN 0;
  END IF;

  INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
  VALUES (p_user_id, p_score, v_earned, p_doubled)
  RETURNING id INTO v_score_id;

  SELECT balance_after INTO v_balance
  FROM public.earn_points(
    p_user_id, v_earned,
    CASE WHEN p_doubled THEN 'merge_game_doubled' ELSE 'merge_game' END,
    v_score_id
  );
  RETURN v_earned;
END;
$function$;

-- ── claim_daily_attendance: per-user 직렬화(최초 동시 클레임 race 제거) ─────
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

  -- advisory lock 이 '행이 아직 없는' 최초 클레임까지 직렬화한다(FOR UPDATE 한계 보완).
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

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

-- ── complete_tutorial: per-user 직렬화(마스터 보너스 race → 예외 방지) ──────
CREATE OR REPLACE FUNCTION public.complete_tutorial(p_tour_id text)
RETURNS TABLE(awarded boolean, base_amount integer, bonus_amount integer, total_completed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_inserted  boolean := false;
  v_base      integer := 0;
  v_bonus     integer := 0;
  v_total     integer;
  v_row_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  IF NOT EXISTS (SELECT 1 FROM public.tutorial_tours t WHERE t.tour_id = p_tour_id) THEN
    SELECT COUNT(*) INTO v_total
    FROM public.tutorial_completions
    WHERE user_id = v_user_id AND tour_id LIKE 'feature_%';
    RETURN QUERY SELECT false, 0, 0, COALESCE(v_total, 0);
    RETURN;
  END IF;

  INSERT INTO public.tutorial_completions (user_id, tour_id)
  VALUES (v_user_id, p_tour_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_inserted := v_row_count > 0;

  IF v_inserted THEN
    v_base := CASE WHEN p_tour_id LIKE 'feature_%' THEN 100 ELSE 0 END;
    IF v_base > 0 THEN
      PERFORM public.earn_points(v_user_id, v_base, p_tour_id, NULL);
    END IF;

    SELECT COUNT(*) INTO v_total
    FROM public.tutorial_completions
    WHERE user_id = v_user_id AND tour_id LIKE 'feature_%';

    IF v_total >= 5 AND NOT EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE user_id = v_user_id AND reason = 'tutorial_master'
    ) THEN
      v_bonus := 500;
      PERFORM public.earn_points(v_user_id, v_bonus, 'tutorial_master', NULL);
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM public.tutorial_completions
    WHERE user_id = v_user_id AND tour_id LIKE 'feature_%';
  END IF;

  RETURN QUERY SELECT v_inserted, v_base, v_bonus, v_total;
END;
$function$;
