-- Round 5 review #14 — venue 완전 clear 시 region/sigungu 도 같이 NULL.
--
-- 060000 가드: `IF (city_changed OR district_changed) AND NEW.wedding_venue_city IS NOT NULL`.
-- 사용자가 city+district 모두 NULL 로 해제 → city IS NOT NULL = false → 전체 skip →
-- region_sigungu 가 stale 잔존. 별도 분기로 명시 처리.

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

  -- F#14 — venue → NULL 케이스 별도 분기. region/sigungu 도 같이 stale 제거.
  -- v_should_sync_region 가드는 city 가 명시값일 때만 의미 있으므로 항상 sync.
  IF v_city_changed AND NEW.wedding_venue_city IS NULL THEN
    NEW.wedding_venue_set_at := now();
    -- 사용자 명시 region 이 있으면 보존 (다른 시도 거주 후 venue 만 cleared 케이스).
    -- 단, 이전 region 이 OLD.wedding_venue_city 로부터 sync 됐던 경우면 같이 NULL.
    IF NEW.wedding_region IS NOT NULL
       AND NEW.wedding_region = COALESCE(OLD.wedding_venue_city, '') THEN
      NEW.wedding_region := NULL;
      NEW.wedding_region_tbd := TRUE;
    END IF;
    NEW.wedding_region_sigungu := NULL;
    RETURN NEW;
  END IF;

  -- 기존 경로 — city 가 명시값이고 city/district 중 하나 이상 변경.
  IF (v_city_changed OR v_district_changed) AND NEW.wedding_venue_city IS NOT NULL THEN
    NEW.wedding_venue_set_at := now();

    IF v_city_changed THEN
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

    -- district 는 NULL 도 명시 sync.
    NEW.wedding_region_sigungu := NEW.wedding_venue_district;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_user_wedding_settings_sync_venue_region() IS
  'v4: venue→NULL 완전 clear 도 region/sigungu 같이 NULL 화 (F#14). 외 v3 기능 유지.';
