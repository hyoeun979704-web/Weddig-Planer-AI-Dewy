-- Round 4 review #D1·#E8 — venue 트리거 보강.
--
-- #D1: district NULL clearing 누락. 사용자가 시군구를 명시적으로 해제(NULL 화)
--   하면 wedding_region_sigungu 도 NULL 로 떨어져야 함. 이전 fix 는 `IF NEW.
--   wedding_venue_district IS NOT NULL` 가드로 NULL 케이스 skip → stale 잔존.
--
-- #E8: ILIKE 패턴이 NEW.wedding_region 을 raw 연결 — `%`/`_`/`\` 가 와일드카드
--   meta-char 로 동작. 사용자가 `%` 같은 region 명 입력 시 모든 venue_city 와
--   match 돼 silently overwrite. ESCAPE 명시 + 메타 문자 사전 치환.

CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_sync_venue_region()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_city_changed BOOLEAN;
  v_district_changed BOOLEAN;
  v_should_sync_region BOOLEAN;
  v_region_escaped TEXT;
  v_old_city_escaped TEXT;
BEGIN
  v_city_changed :=
    NEW.wedding_venue_city IS DISTINCT FROM COALESCE(OLD.wedding_venue_city, '');
  v_district_changed :=
    NEW.wedding_venue_district IS DISTINCT FROM COALESCE(OLD.wedding_venue_district, '');

  IF (v_city_changed OR v_district_changed) AND NEW.wedding_venue_city IS NOT NULL THEN
    NEW.wedding_venue_set_at := now();

    IF v_city_changed THEN
      -- E8 — 메타 문자 escape. backslash 먼저 (다른 escape 가 backslash 를 도입하므로).
      v_region_escaped :=
        replace(replace(replace(COALESCE(NEW.wedding_region, ''), '\', '\\'), '%', '\%'), '_', '\_');
      v_old_city_escaped :=
        replace(replace(replace(COALESCE(OLD.wedding_venue_city, ''), '\', '\\'), '%', '\%'), '_', '\_');

      v_should_sync_region :=
        NEW.wedding_region IS NULL
        OR NEW.wedding_region = COALESCE(OLD.wedding_venue_city, '')
        OR (OLD.wedding_venue_city IS NOT NULL
            AND OLD.wedding_venue_city ILIKE '%' || v_region_escaped || '%' ESCAPE '\')
        OR (OLD.wedding_venue_city IS NOT NULL
            AND NEW.wedding_region ILIKE '%' || v_old_city_escaped || '%' ESCAPE '\');

      IF v_should_sync_region THEN
        NEW.wedding_region := NEW.wedding_venue_city;
        NEW.wedding_region_tbd := FALSE;
      END IF;
    END IF;

    -- F#D1 — district 항상 sync (NULL 포함). 명시적 해제 시 stale 잔존 회피.
    NEW.wedding_region_sigungu := NEW.wedding_venue_district;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_user_wedding_settings_sync_venue_region() IS
  'venue 변경 시 region/sigungu sync. v3: D1(district NULL 명시 sync) + E8(ILIKE 메타 escape).';
