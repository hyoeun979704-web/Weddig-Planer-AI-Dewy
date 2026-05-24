-- 코드 리뷰 #7 + #12 — venue anchor 트리거 보정.
--
-- #7: tg_user_wedding_settings_sync_venue_region 가 wedding_venue_city 가 바뀌면
--     무조건 NEW.wedding_region 도 덮어씀. 한국은 거주지 ≠ 결혼식장 지역(하객 편의,
--     고향 결혼)이 흔해 사용자 의도 파괴. 가드: wedding_region 이 NULL 이거나
--     OLD.wedding_venue_city 와 같았을 때만 sync (= 사용자가 명시 region 안 둠).
--
-- #12: 트리거 alphabetical 순서로 derive_persona < sync_venue_region 이라
--     persona 가 stale wedding_region 기준으로 계산되고 그 후 region 갱신됨.
--     trigger 이름을 'a_'/'b_' prefix 로 명시 순서 정렬:
--       a_sync_venue_region  (먼저 — wedding_region 동기화)
--       b_derive_persona     (다음 — 동기화된 region 기준 persona 계산)

-- ───────────────────────────────────────────────────────────────────────────
-- #7 — 트리거 함수 보정 (가드 강화)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_sync_venue_region()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_should_sync_region BOOLEAN;
BEGIN
  -- venue_city 가 변경됐을 때만 동작.
  IF NEW.wedding_venue_city IS DISTINCT FROM COALESCE(OLD.wedding_venue_city, '')
     AND NEW.wedding_venue_city IS NOT NULL
  THEN
    NEW.wedding_venue_set_at := now();

    -- wedding_region 자동 sync 는 다음 조건일 때만 (사용자 의도 보존):
    --   ① wedding_region 이 NULL (한 번도 명시 설정 안 함)
    --   ② 또는 wedding_region 이 OLD.wedding_venue_city 와 같았음 (= 이전 venue
    --      등록으로 sync 된 값. 새 venue 로 자연스럽게 따라감)
    -- 사용자가 명시적으로 다른 wedding_region 을 둔 경우(예: 거주는 경기·식은
    -- 서울 venue 등록)는 sync 안 함 — 사용자 의도 보존.
    v_should_sync_region :=
      NEW.wedding_region IS NULL
      OR NEW.wedding_region = COALESCE(OLD.wedding_venue_city, '');

    IF v_should_sync_region THEN
      NEW.wedding_region := NEW.wedding_venue_city;
      NEW.wedding_region_tbd := FALSE;
      IF NEW.wedding_venue_district IS NOT NULL THEN
        NEW.wedding_region_sigungu := NEW.wedding_venue_district;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_user_wedding_settings_sync_venue_region() IS
  'venue_city 가 바뀌면 wedding_region 도 sync. 단 사용자가 명시 region 을 둔 경우 보존(거주 ≠ 식장 케이스).';

-- ───────────────────────────────────────────────────────────────────────────
-- #12 — 트리거 alphabetical 순서 보정
-- ───────────────────────────────────────────────────────────────────────────

-- 기존 트리거 둘 다 DROP 후 'a_' / 'b_' prefix 로 재생성. Postgres 는 같은 이벤트
-- 안에서 트리거를 alphabetical 순서로 실행하므로 a_ 가 먼저, b_ 가 다음.

DROP TRIGGER IF EXISTS user_wedding_settings_derive_persona ON public.user_wedding_settings;
DROP TRIGGER IF EXISTS user_wedding_settings_sync_venue_region ON public.user_wedding_settings;

-- a_ sync_venue_region: 먼저 wedding_region 을 venue_city 와 동기화.
CREATE TRIGGER a_sync_venue_region
  BEFORE INSERT OR UPDATE OF wedding_venue_city, wedding_venue_district
  ON public.user_wedding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_wedding_settings_sync_venue_region();

-- b_ derive_persona: sync 끝난 NEW 행 기준으로 persona 계산. region 이 갱신된
-- 상태에서 derive 하므로 regional/standard_bride 분기가 정확.
CREATE TRIGGER b_derive_persona
  BEFORE INSERT OR UPDATE ON public.user_wedding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_wedding_settings_derive_persona();
