-- 무료 3판 + 광고 3판 구조 + 포인트 차등.
--  doubled=false → 무료 판: 하루 3회, score/100 (~38P). 광고 백업 없음 → 적게.
--  doubled=true  → 광고(보상형 영상)로 푼 추가 판: 하루 3회, score/50 (~77P). 광고로 백업.
-- 캡/직렬화는 기존 하드닝 유지(advisory lock + doubled 값별 3회). 적립 캡일 뿐,
-- 판 자체는 막지 않음(한도 초과 플레이도 배너 노출 → 세션 수익).
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

  v_earned := CASE WHEN p_doubled THEN GREATEST(1, p_score / 50)
                   ELSE GREATEST(1, p_score / 100) END;

  SELECT count(*) INTO v_games FROM public.game_scores
   WHERE user_id = p_user_id AND doubled = p_doubled
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
    CASE WHEN p_doubled THEN 'merge_game_ad' ELSE 'merge_game' END,
    v_score_id
  );
  RETURN v_earned;
END;
$function$;
