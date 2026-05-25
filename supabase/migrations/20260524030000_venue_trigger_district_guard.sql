-- 코드 리뷰 #8 + #9 — venue 트리거 보강.
--
-- #8: 외부 가드가 wedding_venue_city IS DISTINCT FROM 만 검사해 district-only
--     변경(같은 시도 안에서 시군구만 바뀜)을 무시. wedding_region_sigungu 가
--     stale 상태로 남고 큐레이션이 잘못된 시군구로 좁힘.
--
-- #9: wedding_region vs wedding_venue_city 정규화 불일치 — "Seoul" vs "서울특별시" /
--     "서울" vs "서울특별시" 같이 미세하게 다른 표기를 "user manual override"
--     로 잘못 인식해 sync 차단. 부분 매칭(ILIKE substring) 으로 흡수.

CREATE OR REPLACE FUNCTION public.tg_user_wedding_settings_sync_venue_region()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_city_changed BOOLEAN;
  v_district_changed BOOLEAN;
  v_should_sync_region BOOLEAN;
BEGIN
  v_city_changed :=
    NEW.wedding_venue_city IS DISTINCT FROM COALESCE(OLD.wedding_venue_city, '');
  v_district_changed :=
    NEW.wedding_venue_district IS DISTINCT FROM COALESCE(OLD.wedding_venue_district, '');

  -- F#8 — city 또는 district 둘 중 하나라도 바뀌면 갱신 대상.
  IF (v_city_changed OR v_district_changed) AND NEW.wedding_venue_city IS NOT NULL THEN
    NEW.wedding_venue_set_at := now();

    -- city 가 바뀌었으면 wedding_region 도 sync 검토. district-only 변경 시엔
    -- wedding_region 은 그대로(시도 동일).
    IF v_city_changed THEN
      -- F#9 — 정규화 다양성(서울/서울특별시/Seoul 등) 흡수: 부분 매칭 가드.
      -- 사용자가 명시적으로 다른 시도를 지정한 경우에만 sync 보존.
      v_should_sync_region :=
        NEW.wedding_region IS NULL
        OR NEW.wedding_region = COALESCE(OLD.wedding_venue_city, '')
        -- "서울" ⊂ "서울특별시" 또는 "서울특별시" ⊂ "서울특별시 강남구" 같은 케이스 동치 처리.
        OR (OLD.wedding_venue_city IS NOT NULL
            AND OLD.wedding_venue_city ILIKE '%' || NEW.wedding_region || '%')
        OR (OLD.wedding_venue_city IS NOT NULL
            AND NEW.wedding_region ILIKE '%' || OLD.wedding_venue_city || '%');

      IF v_should_sync_region THEN
        NEW.wedding_region := NEW.wedding_venue_city;
        NEW.wedding_region_tbd := FALSE;
      END IF;
    END IF;

    -- district 는 city 동기화 여부와 무관하게 항상 새 값 반영 (city 가 같아도 sigungu 큐레이션 정확도).
    IF NEW.wedding_venue_district IS NOT NULL THEN
      NEW.wedding_region_sigungu := NEW.wedding_venue_district;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_user_wedding_settings_sync_venue_region() IS
  'venue_city/district 변경 시 wedding_region/region_sigungu 동기화. 정규화 다양성(부분 매칭) 흡수. district-only 변경도 처리.';
