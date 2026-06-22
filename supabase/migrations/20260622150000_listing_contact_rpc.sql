-- 업체 기본/운영 정보(연락처·운영시간·SNS·주차·교통) 직접 관리 RPC.
-- 배경: 공개 상세페이지는 place_details 의 tel/hours_*/website/SNS/parking/subway 를
--   읽어 보여주지만, 사장님이 이 값을 입력할 수 있는 경로가 없었다(전화·운영시간이 영영
--   빈칸 — 타 앱 대비 형편없던 핵심 원인). 카테고리 상세(upsert_my_listing_detail)와
--   분리된 **새 RPC** 로만 추가해 기존 저장 플로우(upsert_my_listing/update_my_branch)는
--   전혀 건드리지 않는다(무회귀, 멱등).
-- ⚠️ 배포 후 실DB에서 (사장님 저장→공개 상세페이지 노출) e2e 검증 필요.

-- ── 저장 ────────────────────────────────────────────────────────────
-- p_contact(jsonb) 의 키만 부분 갱신(키가 없으면 기존값 유지 → 부분 페이로드가
-- 기존 스크랩 데이터를 덮어쓰지 않음). URL 은 http(s) 만 허용(javascript:/data: 차단),
-- 전화는 안전문자만, 텍스트는 길이 캡. place_details 의 분석/스크랩 컬럼(pros·amenities
-- 등)은 ON CONFLICT 대상 외라 보존된다. 저장 시 재심사 대기(pending)로 — 기존 패턴 일치.
CREATE OR REPLACE FUNCTION public.upsert_my_listing_contact(p_contact jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_place_id UUID;
  d jsonb := coalesce(p_contact, '{}'::jsonb);
  -- 살균된 값(키 없으면 null; ON CONFLICT 에서 키 존재 여부로 보존/갱신 분기).
  v_tel text := nullif(btrim(regexp_replace(coalesce(d->>'tel',''), '[^0-9+()\-\. ]', '', 'g')), '');
  v_website text := CASE WHEN d->>'website_url' ~ '^https?://' THEN left(btrim(d->>'website_url'), 300) ELSE NULL END;
  v_instagram text := CASE WHEN d->>'instagram_url' ~ '^https?://' THEN left(btrim(d->>'instagram_url'), 300) ELSE NULL END;
  v_youtube text := CASE WHEN d->>'youtube_url' ~ '^https?://' THEN left(btrim(d->>'youtube_url'), 300) ELSE NULL END;
  v_naver_blog text := CASE WHEN d->>'naver_blog_url' ~ '^https?://' THEN left(btrim(d->>'naver_blog_url'), 300) ELSE NULL END;
  v_kakao text := CASE WHEN d->>'kakao_channel_url' ~ '^https?://' THEN left(btrim(d->>'kakao_channel_url'), 300) ELSE NULL END;
  v_facebook text := CASE WHEN d->>'facebook_url' ~ '^https?://' THEN left(btrim(d->>'facebook_url'), 300) ELSE NULL END;
  v_mon text := nullif(left(btrim(coalesce(d->>'hours_mon','')), 60), '');
  v_tue text := nullif(left(btrim(coalesce(d->>'hours_tue','')), 60), '');
  v_wed text := nullif(left(btrim(coalesce(d->>'hours_wed','')), 60), '');
  v_thu text := nullif(left(btrim(coalesce(d->>'hours_thu','')), 60), '');
  v_fri text := nullif(left(btrim(coalesce(d->>'hours_fri','')), 60), '');
  v_sat text := nullif(left(btrim(coalesce(d->>'hours_sat','')), 60), '');
  v_sun text := nullif(left(btrim(coalesce(d->>'hours_sun','')), 60), '');
  v_closed text := nullif(left(btrim(coalesce(d->>'closed_days','')), 120), '');
  v_holiday text := nullif(left(btrim(coalesce(d->>'holiday_notice','')), 200), '');
  v_park_loc text := nullif(left(btrim(coalesce(d->>'parking_location','')), 200), '');
  v_park_guest text := nullif(left(btrim(coalesce(d->>'parking_free_guest','')), 120), '');
  v_park_parents text := nullif(left(btrim(coalesce(d->>'parking_free_parents','')), 120), '');
  v_park_cap int := CASE WHEN d->>'parking_capacity' ~ '^[0-9]{1,6}$' THEN (d->>'parking_capacity')::int ELSE NULL END;
  v_subway_line text := nullif(left(btrim(coalesce(d->>'subway_line','')), 60), '');
  v_subway_station text := nullif(left(btrim(coalesce(d->>'subway_station','')), 60), '');
  v_walk int := CASE WHEN d->>'walk_minutes' ~ '^[0-9]{1,3}$' THEN (d->>'walk_minutes')::int ELSE NULL END;
  v_shuttle_avail boolean := CASE WHEN d ? 'shuttle_bus_available' THEN (d->>'shuttle_bus_available')::boolean ELSE NULL END;
  v_shuttle_info text := nullif(left(btrim(coalesce(d->>'shuttle_bus_info','')), 200), '');
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  -- 소유 업체 1곳(단일 리스팅 플로우). 멀티지점은 후속(p_place_id 인자) 과제.
  SELECT place_id INTO v_place_id FROM public.places WHERE owner_user_id = v_uid LIMIT 1;
  IF v_place_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'no_listing'); END IF;

  INSERT INTO public.place_details (
    place_id, tel, website_url, instagram_url, youtube_url, naver_blog_url, kakao_channel_url, facebook_url,
    hours_mon, hours_tue, hours_wed, hours_thu, hours_fri, hours_sat, hours_sun,
    closed_days, holiday_notice, parking_location, parking_free_guest, parking_free_parents, parking_capacity,
    subway_line, subway_station, walk_minutes, shuttle_bus_available, shuttle_bus_info, updated_at
  ) VALUES (
    v_place_id, v_tel, v_website, v_instagram, v_youtube, v_naver_blog, v_kakao, v_facebook,
    v_mon, v_tue, v_wed, v_thu, v_fri, v_sat, v_sun,
    v_closed, v_holiday, v_park_loc, v_park_guest, v_park_parents, v_park_cap,
    v_subway_line, v_subway_station, v_walk, v_shuttle_avail, v_shuttle_info, now()
  )
  ON CONFLICT (place_id) DO UPDATE SET
    tel = CASE WHEN d ? 'tel' THEN v_tel ELSE place_details.tel END,
    website_url = CASE WHEN d ? 'website_url' THEN v_website ELSE place_details.website_url END,
    instagram_url = CASE WHEN d ? 'instagram_url' THEN v_instagram ELSE place_details.instagram_url END,
    youtube_url = CASE WHEN d ? 'youtube_url' THEN v_youtube ELSE place_details.youtube_url END,
    naver_blog_url = CASE WHEN d ? 'naver_blog_url' THEN v_naver_blog ELSE place_details.naver_blog_url END,
    kakao_channel_url = CASE WHEN d ? 'kakao_channel_url' THEN v_kakao ELSE place_details.kakao_channel_url END,
    facebook_url = CASE WHEN d ? 'facebook_url' THEN v_facebook ELSE place_details.facebook_url END,
    hours_mon = CASE WHEN d ? 'hours_mon' THEN v_mon ELSE place_details.hours_mon END,
    hours_tue = CASE WHEN d ? 'hours_tue' THEN v_tue ELSE place_details.hours_tue END,
    hours_wed = CASE WHEN d ? 'hours_wed' THEN v_wed ELSE place_details.hours_wed END,
    hours_thu = CASE WHEN d ? 'hours_thu' THEN v_thu ELSE place_details.hours_thu END,
    hours_fri = CASE WHEN d ? 'hours_fri' THEN v_fri ELSE place_details.hours_fri END,
    hours_sat = CASE WHEN d ? 'hours_sat' THEN v_sat ELSE place_details.hours_sat END,
    hours_sun = CASE WHEN d ? 'hours_sun' THEN v_sun ELSE place_details.hours_sun END,
    closed_days = CASE WHEN d ? 'closed_days' THEN v_closed ELSE place_details.closed_days END,
    holiday_notice = CASE WHEN d ? 'holiday_notice' THEN v_holiday ELSE place_details.holiday_notice END,
    parking_location = CASE WHEN d ? 'parking_location' THEN v_park_loc ELSE place_details.parking_location END,
    parking_free_guest = CASE WHEN d ? 'parking_free_guest' THEN v_park_guest ELSE place_details.parking_free_guest END,
    parking_free_parents = CASE WHEN d ? 'parking_free_parents' THEN v_park_parents ELSE place_details.parking_free_parents END,
    parking_capacity = CASE WHEN d ? 'parking_capacity' THEN v_park_cap ELSE place_details.parking_capacity END,
    subway_line = CASE WHEN d ? 'subway_line' THEN v_subway_line ELSE place_details.subway_line END,
    subway_station = CASE WHEN d ? 'subway_station' THEN v_subway_station ELSE place_details.subway_station END,
    walk_minutes = CASE WHEN d ? 'walk_minutes' THEN v_walk ELSE place_details.walk_minutes END,
    shuttle_bus_available = CASE WHEN d ? 'shuttle_bus_available' THEN v_shuttle_avail ELSE place_details.shuttle_bus_available END,
    shuttle_bus_info = CASE WHEN d ? 'shuttle_bus_info' THEN v_shuttle_info ELSE place_details.shuttle_bus_info END,
    updated_at = now();

  -- 정보 변경 → 재심사 대기(기존 상세/기본 저장과 동일 정책).
  UPDATE public.places SET moderation_status='pending', is_active=false, updated_at=now()
  WHERE place_id = v_place_id AND owner_user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'place_id', v_place_id);
END;
$$;

-- ── 조회(프리필) ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_listing_contact()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_place_id UUID;
  v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT place_id INTO v_place_id FROM public.places WHERE owner_user_id = v_uid LIMIT 1;
  IF v_place_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT to_jsonb(t) INTO v_out FROM (
    SELECT tel, website_url, instagram_url, youtube_url, naver_blog_url, kakao_channel_url, facebook_url,
           hours_mon, hours_tue, hours_wed, hours_thu, hours_fri, hours_sat, hours_sun,
           closed_days, holiday_notice, parking_location, parking_free_guest, parking_free_parents, parking_capacity,
           subway_line, subway_station, walk_minutes, shuttle_bus_available, shuttle_bus_info
    FROM public.place_details WHERE place_id = v_place_id
  ) t;

  RETURN coalesce(v_out, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_listing_contact(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_listing_contact() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_listing_contact(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_listing_contact() TO authenticated;
