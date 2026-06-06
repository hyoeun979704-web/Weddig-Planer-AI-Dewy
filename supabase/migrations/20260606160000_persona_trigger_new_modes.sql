-- 트리거에 신규 4모드 분기 추가 — 클라이언트 PERSONA_REGISTRY 우선순위와 동일.
--  remarriage_with_children: 재혼 + has_children (plain remarriage 위)
--  designer_late/budget_analytic/first_timer: planning_style (luxury_hotel 과 groom 사이)
CREATE OR REPLACE FUNCTION public.derive_wedding_persona(s user_wedding_settings)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  is_international BOOLEAN := COALESCE(s.wedding_country, 'KR') <> 'KR';
  is_overseas BOOLEAN := COALESCE(s.country, 'KR') <> 'KR';
  no_parents BOOLEAN := NOT COALESCE(s.has_parents_bride, TRUE)
                   AND NOT COALESCE(s.has_parents_groom, TRUE);
  metro_set TEXT[] := ARRAY['서울특별시','서울','경기도','경기','인천광역시','인천'];
  is_regional BOOLEAN := s.wedding_region IS NOT NULL
                    AND NOT (s.wedding_region = ANY(metro_set));
BEGIN
  IF COALESCE(s.pregnant, FALSE) THEN RETURN 'pregnancy'; END IF;
  IF is_international OR s.ceremony_type = 'dual_ceremony' THEN RETURN 'international'; END IF;
  IF s.marital_history = 'remarriage' AND COALESCE(s.has_children, FALSE) THEN RETURN 'remarriage_with_children'; END IF;
  IF s.marital_history = 'remarriage' THEN RETURN 'remarriage'; END IF;

  IF s.ceremony_type = 'snap_only' THEN RETURN 'snap_only'; END IF;
  IF s.ceremony_type = 'none' THEN RETURN 'no_wedding_travel'; END IF;
  IF s.ceremony_type = 'self_only' THEN RETURN 'self_no_ceremony'; END IF;

  IF s.ceremony_type = 'outdoor' THEN RETURN 'small_outdoor'; END IF;
  IF s.ceremony_type = 'public_facility' THEN RETURN 'small_budget'; END IF;
  IF s.ceremony_type IN ('small_real','restaurant') THEN RETURN 'small_intimate'; END IF;
  IF s.wedding_style = 'small' THEN
    IF s.ceremony_type = 'hotel' THEN RETURN 'small_luxury'; END IF;
    RETURN 'small_intimate';
  END IF;

  IF no_parents THEN RETURN 'single_household'; END IF;
  IF is_overseas THEN RETURN 'remote_overseas'; END IF;
  IF is_regional THEN RETURN 'regional'; END IF;
  IF s.ceremony_type = 'hotel' THEN RETURN 'luxury_hotel'; END IF;

  IF s.planning_style = 'designer' THEN RETURN 'designer_late'; END IF;
  IF s.planning_style = 'budget_analytic' THEN RETURN 'budget_analytic'; END IF;
  IF s.planning_style = 'beginner' THEN RETURN 'first_timer'; END IF;

  IF s.role = 'groom' THEN RETURN 'standard_groom'; END IF;
  RETURN 'standard_bride';
END;
$function$;
