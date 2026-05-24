-- 결혼식장 위치 anchor — 사용자가 명시 등록한 식장을 큐레이션 기준점으로.
-- 스튜디오·드레스·메이크업·한복 등 식장과 같은 시·시군구의 업체를 우선 정렬.
-- v2 §6 위치 정보 전략: 사용자 명시 등록(L5 JIT)이 anchor, 실시간 위치는 보조 신호.
--
-- 컬럼 의도:
--   wedding_venue_place_id   DEWY 카탈로그 내 식장이면 FK. 외부 식장이면 NULL.
--   wedding_venue_name       표시용 이름. place_id 있어도 denormalize 해 빠른 표시.
--   wedding_venue_address    원문 주소 (사용자 표시).
--   wedding_venue_city       정규화 시도 (예: "서울특별시"). 같은 시 큐레이션에 ILIKE.
--   wedding_venue_district   정규화 시군구 (예: "강남구"). 같은 시군구 우선 정렬.
--   wedding_venue_lat/lng    근접 정렬용. 같은 시군구 안에서 거리순. Optional.
--   wedding_venue_set_at     마지막 변경 시각 (분석용).
--
-- 폴백: place_id 만 있고 city/district 빈 케이스는 places 와 JOIN 해서 채울 수 있도록
-- denormalize 컬럼은 저장 시점에 places 에서 가져옴. 단, 외부 식장은 사용자 입력 또는
-- 역 geocoding 결과로 직접 채움.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS wedding_venue_place_id UUID,
  ADD COLUMN IF NOT EXISTS wedding_venue_name TEXT,
  ADD COLUMN IF NOT EXISTS wedding_venue_address TEXT,
  ADD COLUMN IF NOT EXISTS wedding_venue_city TEXT,
  ADD COLUMN IF NOT EXISTS wedding_venue_district TEXT,
  ADD COLUMN IF NOT EXISTS wedding_venue_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS wedding_venue_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS wedding_venue_set_at TIMESTAMPTZ;

-- 외래키 — place 삭제 시 venue anchor 도 자동 NULL 화 (cascade 아닌 set null).
ALTER TABLE public.user_wedding_settings
  DROP CONSTRAINT IF EXISTS user_wedding_settings_wedding_venue_place_fk;
ALTER TABLE public.user_wedding_settings
  ADD CONSTRAINT user_wedding_settings_wedding_venue_place_fk
  FOREIGN KEY (wedding_venue_place_id)
  REFERENCES public.places(place_id)
  ON DELETE SET NULL;

-- 인덱스 — 큐레이션 쿼리(같은 city/district 안에서 필터·정렬) 가속.
CREATE INDEX IF NOT EXISTS user_wedding_settings_venue_city_idx
  ON public.user_wedding_settings(wedding_venue_city)
  WHERE wedding_venue_city IS NOT NULL;

COMMENT ON COLUMN public.user_wedding_settings.wedding_venue_place_id IS
  '결혼식장 anchor — DEWY 카탈로그 내 식장 FK. NULL = 외부 식장(name/address 사용자 입력).';
COMMENT ON COLUMN public.user_wedding_settings.wedding_venue_city IS
  '식장 시도 — 스튜디오·드레스·메이크업 등 같은 시 큐레이션에 ILIKE 매칭.';
COMMENT ON COLUMN public.user_wedding_settings.wedding_venue_district IS
  '식장 시군구 — 같은 시군구 업체 우선 정렬.';

-- 식장 anchor 변경 시 wedding_region/sigungu 도 자동 동기화 (역방향). 사용자가
-- 식장을 강남에서 등록했는데 wedding_region 이 다른 시도이면 혼란. 트리거로 일치 보장.
-- 단, 사용자가 명시적으로 wedding_region 만 바꾸는 경우는 트리거 안 건드림.
CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_sync_venue_region()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- venue 가 새로 설정/변경됐고 city 가 있으면 wedding_region 도 같이 갱신.
  IF NEW.wedding_venue_city IS NOT NULL
     AND NEW.wedding_venue_city IS DISTINCT FROM COALESCE(OLD.wedding_venue_city, '')
  THEN
    NEW.wedding_region := NEW.wedding_venue_city;
    NEW.wedding_region_tbd := FALSE;
    IF NEW.wedding_venue_district IS NOT NULL THEN
      NEW.wedding_region_sigungu := NEW.wedding_venue_district;
    END IF;
    NEW.wedding_venue_set_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_wedding_settings_sync_venue_region ON public.user_wedding_settings;
CREATE TRIGGER user_wedding_settings_sync_venue_region
  BEFORE INSERT OR UPDATE OF wedding_venue_city, wedding_venue_district
  ON public.user_wedding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_wedding_settings_sync_venue_region();
