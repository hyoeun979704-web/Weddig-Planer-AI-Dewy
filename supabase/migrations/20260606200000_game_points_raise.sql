-- 포인트 상향(플레이 동기): 판당 적립을 억제하지 않음 — 일 비용은 '판수 캡(3+3)'으로만 통제.
-- (근거: 1판 5~10분 세션 → 배너 노출 多 → 플레이 길수록 흑자. 포인트=플레이 연료라
--  높일수록 세션·광고수익↑. 단 하루 6판 하드캡으로 총량 통제 + 리텐션.)
--  무료 판: score/40 (~96P).  광고 판: score/20 (~192P, 2배 → 보상형 시청 동기).
CREATE OR REPLACE FUNCTION public.add_game_points(p_user_id uuid, p_score integer, p_doubled boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_earned integer; v_balance integer; v_score_id uuid;
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_games integer; v_daily_games constant integer := 3;
BEGIN
  IF p_user_id <> auth.uid() THEN RAISE EXCEPTION 'Cannot add points for other users'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  v_earned := CASE WHEN p_doubled THEN GREATEST(1, p_score / 20)
                   ELSE GREATEST(1, p_score / 40) END;
  SELECT count(*) INTO v_games FROM public.game_scores
   WHERE user_id = p_user_id AND doubled = p_doubled
     AND (created_at AT TIME ZONE 'Asia/Seoul')::date = v_today;
  IF v_games >= v_daily_games THEN
    INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
    VALUES (p_user_id, p_score, 0, p_doubled);
    RETURN 0;
  END IF;
  INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
  VALUES (p_user_id, p_score, v_earned, p_doubled) RETURNING id INTO v_score_id;
  SELECT balance_after INTO v_balance FROM public.earn_points(
    p_user_id, v_earned, CASE WHEN p_doubled THEN 'merge_game_ad' ELSE 'merge_game' END, v_score_id);
  RETURN v_earned;
END;
$function$;
