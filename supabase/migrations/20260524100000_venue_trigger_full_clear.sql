-- Round 5 review #14 — venue 완전 clear 시 region/sigungu 도 같이 NULL.
-- Round 7 R6-3·R6-4 fix — v_city_changed 가 NULL/NULL 시 TRUE 평가 회귀 정정,
-- venue-clear 분기를 venue-change 분기와 동일한 fuzzy 매칭으로 대칭화.
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
  -- R6-3 — COALESCE(...,'') 가 `NULL IS DISTINCT FROM ''` = TRUE 만들어
  -- NULL→NULL 인 placeholder INSERT 와 city 가 계속 NULL 인 사용자의 district-only
  -- 업데이트도 '변경' 으로 잘못 인식. 둘 다 NULL 이면 진짜 변경 아니므로 plain
  -- IS DISTINCT FROM 으로 (NULL ≠ NULL → FALSE).
  v_city_changed :=
    NEW.wedding_venue_city IS DISTINCT FROM OLD.wedding_venue_city;
  v_district_changed :=
    NEW.wedding_venue_district IS DISTINCT FROM OLD.wedding_venue_district;

  -- R6-4 — region 보존 판정용 v_should_sync_region 을 양 분기 공통으로 사전 계산.
  -- 이전엔 venue-clear 분기가 exact `=` 만, venue-change 분기는 fuzzy ILIKE 를 써서
  -- '서울특별시' 로 sync 됐다가 사용자가 '서울특별시 강남구' 로 수동 정제한 region 이
  -- venue clear 시 보존되고 sigungu 만 NULL → UI 불일치. 동일 fuzzy 로직 공유.
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
  END IF;

  -- F#14 — venue → NULL 케이스 별도 분기. region/sigungu 도 같이 stale 제거.
  -- 가드 `OLD.wedding_venue_city IS NOT NULL` 으로 실제 값→NULL 전환만 진입
  -- (placeholder INSERT 의 NULL→NULL 진입 방지).
  IF v_city_changed
     AND NEW.wedding_venue_city IS NULL
     AND OLD.wedding_venue_city IS NOT NULL THEN
    NEW.wedding_venue_set_at := now();
    -- venue-change 분기와 동일한 fuzzy 매칭 — venue 와 연동된 region 이면 NULL 화.
    IF v_should_sync_region THEN
      NEW.wedding_region := NULL;
      NEW.wedding_region_tbd := TRUE;
    END IF;
    NEW.wedding_region_sigungu := NULL;
    RETURN NEW;
  END IF;

  -- 기존 경로 — city 가 명시값이고 city/district 중 하나 이상 변경.
  IF (v_city_changed OR v_district_changed) AND NEW.wedding_venue_city IS NOT NULL THEN
    NEW.wedding_venue_set_at := now();

    IF v_city_changed AND v_should_sync_region THEN
      NEW.wedding_region := NEW.wedding_venue_city;
      NEW.wedding_region_tbd := FALSE;
    END IF;

    -- district 는 NULL 도 명시 sync.
    NEW.wedding_region_sigungu := NEW.wedding_venue_district;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_user_wedding_settings_sync_venue_region() IS
  'v5 (R6-3·R6-4): NULL/NULL no-op + venue-clear 분기 region 보존 판정 대칭화. v4 기능 유지.';
