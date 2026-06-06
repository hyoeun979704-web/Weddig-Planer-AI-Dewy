-- 페르소나: remote_overseas(해외 거주·한국식) 가 international 에 가려지던 문제 수정.
--
-- 기존 is_international = (wedding_country<>'KR') OR (country<>wedding_country) 라,
-- 해외 거주자(country=US)가 예식을 한국(wedding_country=KR)에서 해도 두 번째 OR 조건
-- (US<>KR) 때문에 international 로 먼저 분류돼 remote_overseas 분기(아래 is_overseas)에
-- 절대 도달하지 못했다(사전 dead branch).
--
-- 수정: international 은 "예식 자체가 해외(wedding_country<>'KR')" 또는 이중식
-- (dual_ceremony, 아래 IF 에서 OR)일 때만. 거주지만 해외인 케이스는 is_overseas →
-- remote_overseas 로 흐른다. 클라이언트 weddingPersona.derivePersonaMode 와 동일.
-- (그 외 우선순위/조건은 기존과 동일 — 19모드 trigger 유지)

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
  IF s.role = 'groom' THEN RETURN 'standard_groom'; END IF;

  RETURN 'standard_bride';
END;
$function$;
