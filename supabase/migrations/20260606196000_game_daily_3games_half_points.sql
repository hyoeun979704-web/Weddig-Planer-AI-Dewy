-- 게임 적립 정책 변경:
--   1) 점수책정 절반: earned = score/20 → score/40
--   2) 하루 3판까지만 적립(기본 플레이 doubled=false 기준). 초과 판은 기록만(0P).
--   3) 광고 보너스(doubled=true)는 '추가 1×'(총 2×). 방금 친 게임이 적립 대상일 때만.
--
-- 이전(20260606194000)의 '게임 일일 500P 한도' 를 대체한다.
-- 판수 기준은 game_scores 의 doubled=false 행 수(KST). 보너스 행(doubled=true)은
-- 판수에 포함하지 않는다.

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
  v_daily_games  constant integer := 3;   -- 하루 적립 가능 판수
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot add points for other users';
  END IF;

  -- 점수책정 절반 (이전 score/20 → score/40).
  v_earned := GREATEST(1, p_score / 40);

  -- 오늘(KST) 기본 플레이 판수.
  SELECT count(*) INTO v_games
  FROM public.game_scores
  WHERE user_id = p_user_id
    AND doubled = false
    AND (created_at AT TIME ZONE 'Asia/Seoul')::date = v_today;

  IF NOT p_doubled THEN
    -- 기본 플레이: 하루 3판까지만 적립. 초과 시 점수는 기록(랭킹/최고점)하되 0P.
    IF v_games >= v_daily_games THEN
      INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
      VALUES (p_user_id, p_score, 0, false);
      RETURN 0;
    END IF;
    INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
    VALUES (p_user_id, p_score, v_earned, false)
    RETURNING id INTO v_score_id;
    SELECT balance_after INTO v_balance
    FROM public.earn_points(p_user_id, v_earned, 'merge_game', v_score_id);
    RETURN v_earned;
  ELSE
    -- 광고 보너스: 추가 1×. 방금 친 게임이 적립 대상(오늘 3판 이내)일 때만.
    IF v_games > v_daily_games THEN
      INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
      VALUES (p_user_id, p_score, 0, true);
      RETURN 0;
    END IF;
    INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
    VALUES (p_user_id, p_score, v_earned, true)
    RETURNING id INTO v_score_id;
    SELECT balance_after INTO v_balance
    FROM public.earn_points(p_user_id, v_earned, 'merge_game_doubled', v_score_id);
    RETURN v_earned;
  END IF;
END;
$function$;
