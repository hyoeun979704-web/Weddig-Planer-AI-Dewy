-- 튜토리얼 포인트 파밍 차단: 유효한 tour_id 허용목록.
--
-- 문제: complete_tutorial 이 클라이언트가 보낸 p_tour_id 를 검증 없이 신뢰해,
-- 'feature_<아무거나>' 문자열마다 100P 를 지급했다. tutorial_completions PK 가
-- (user_id, tour_id) 라 같은 id 재호출은 막히지만, 가짜 id 를 무한히 만들어
-- 무제한 적립이 가능했다(포인트는 상품권·쇼핑 사용 가능).
--
-- 해결: 유효한 tour_id 허용목록 테이블을 두고, 목록에 없는 id 는 완료기록도
-- 남기지 않고 무시(awarded=false). 마스터 보너스 조건도 '= 5' → '>= 5' 로 견고화.
--
-- 드리프트 주의: 새 튜토리얼(레슨) 추가 시 src/data/tutorialChapters.ts 의 레슨 id
-- 에 맞춰 여기('feature_<레슨id>')에도 INSERT 해야 포인트가 지급된다.

CREATE TABLE IF NOT EXISTS public.tutorial_tours (
  tour_id text PRIMARY KEY
);
ALTER TABLE public.tutorial_tours ENABLE ROW LEVEL SECURITY;
-- 정책 없음: SECURITY DEFINER 함수(complete_tutorial)만 조회한다.

-- src/data/tutorialChapters.ts 의 TutorialLesson id 13개 + 레거시 별칭 app-tour.
INSERT INTO public.tutorial_tours (tour_id) VALUES
  ('feature_home-tour'),
  ('feature_mypage'),
  ('feature_ai-planner'),
  ('feature_ai-studio'),
  ('feature_schedule'),
  ('feature_budget'),
  ('feature_community'),
  ('feature_couple'),
  ('feature_premium'),
  ('feature_self-diy'),
  ('feature_remarriage-family'),
  ('feature_snap-flow'),
  ('feature_groom-tasks'),
  ('feature_app-tour')
ON CONFLICT DO NOTHING;

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

  -- 허용목록에 없는 tour_id 는 무시: 완료기록·포인트 모두 없음(가짜 id 파밍 차단).
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

    -- 5개 이상 완료 시 1회 마스터 보너스(>=5 + 미수령 가드로 멱등).
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
