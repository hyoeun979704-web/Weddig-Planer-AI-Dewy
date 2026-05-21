-- 기업회원 업체 상세(카테고리별) 입력 — 카테고리마다 detail 테이블/컬럼이 달라
-- SECURITY DEFINER RPC 안에서 분기 처리. owner 본인 + places 소유 확인 후, 해당
-- 카테고리 detail 테이블에 upsert 하고 places 를 검토 대기(미노출)로 되돌린다.
-- detail 테이블은 place_id 1:1(PK) 가정.
--
-- 지원 카테고리(주요 7): wedding_hall, studio, dress_shop, makeup_shop, hanbok,
-- tailor_shop, invitation_venue. honeymoon/jewelry/appliance 는 후속.

-- jsonb 배열 → text[] (없으면 빈 배열)
CREATE OR REPLACE FUNCTION public._jsonb_to_text_arr(p jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IS NULL OR jsonb_typeof(p) <> 'array' THEN NULL
    ELSE ARRAY(SELECT jsonb_array_elements_text(p))
  END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_listing_detail(p_detail jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_place RECORD;
  d jsonb := coalesce(p_detail, '{}'::jsonb);
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;

  SELECT place_id, category INTO v_place FROM public.places WHERE owner_user_id = v_uid LIMIT 1;
  IF v_place.place_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_listing'); -- 기본 정보 먼저 저장 필요
  END IF;

  IF v_place.category = 'wedding_hall' THEN
    INSERT INTO public.place_wedding_halls (place_id, hall_styles, meal_types, min_guarantee, max_guarantee)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'hall_styles'), _jsonb_to_text_arr(d->'meal_types'),
            (d->>'min_guarantee')::int, (d->>'max_guarantee')::int)
    ON CONFLICT (place_id) DO UPDATE SET
      hall_styles = EXCLUDED.hall_styles, meal_types = EXCLUDED.meal_types,
      min_guarantee = EXCLUDED.min_guarantee, max_guarantee = EXCLUDED.max_guarantee;

  ELSIF v_place.category = 'studio' THEN
    INSERT INTO public.place_studios (place_id, shoot_styles, includes_originals, dress_provided)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'shoot_styles'),
            (d->>'includes_originals')::boolean, (d->>'dress_provided')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET
      shoot_styles = EXCLUDED.shoot_styles, includes_originals = EXCLUDED.includes_originals,
      dress_provided = EXCLUDED.dress_provided;

  ELSIF v_place.category = 'dress_shop' THEN
    INSERT INTO public.place_dress_shops (place_id, dress_styles, rental_only, fitting_count)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'dress_styles'),
            (d->>'rental_only')::boolean, (d->>'fitting_count')::int)
    ON CONFLICT (place_id) DO UPDATE SET
      dress_styles = EXCLUDED.dress_styles, rental_only = EXCLUDED.rental_only,
      fitting_count = EXCLUDED.fitting_count;

  ELSIF v_place.category = 'makeup_shop' THEN
    INSERT INTO public.place_makeup_shops (place_id, makeup_styles, includes_rehearsal, hair_makeup_separate)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'makeup_styles'),
            (d->>'includes_rehearsal')::boolean, (d->>'hair_makeup_separate')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET
      makeup_styles = EXCLUDED.makeup_styles, includes_rehearsal = EXCLUDED.includes_rehearsal,
      hair_makeup_separate = EXCLUDED.hair_makeup_separate;

  ELSIF v_place.category = 'hanbok' THEN
    INSERT INTO public.place_hanboks (place_id, hanbok_types, custom_available, delivery_available)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'hanbok_types'),
            (d->>'custom_available')::boolean, (d->>'delivery_available')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET
      hanbok_types = EXCLUDED.hanbok_types, custom_available = EXCLUDED.custom_available,
      delivery_available = EXCLUDED.delivery_available;

  ELSIF v_place.category = 'tailor_shop' THEN
    INSERT INTO public.place_tailor_shops (place_id, suit_styles, custom_available, fitting_count)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'suit_styles'),
            (d->>'custom_available')::boolean, (d->>'fitting_count')::int)
    ON CONFLICT (place_id) DO UPDATE SET
      suit_styles = EXCLUDED.suit_styles, custom_available = EXCLUDED.custom_available,
      fitting_count = EXCLUDED.fitting_count;

  ELSIF v_place.category = 'invitation_venue' THEN
    INSERT INTO public.place_invitation_venues (place_id, venue_types, capacity_min, capacity_max, private_room_count)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'venue_types'),
            (d->>'capacity_min')::int, (d->>'capacity_max')::int, (d->>'private_room_count')::int)
    ON CONFLICT (place_id) DO UPDATE SET
      venue_types = EXCLUDED.venue_types, capacity_min = EXCLUDED.capacity_min,
      capacity_max = EXCLUDED.capacity_max, private_room_count = EXCLUDED.private_room_count;

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'unsupported_category');
  END IF;

  -- 상세 변경도 검토 대상 — 리스팅을 다시 대기로.
  UPDATE public.places
  SET moderation_status = 'pending', is_active = false, updated_at = now()
  WHERE place_id = v_place.place_id AND owner_user_id = v_uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 카테고리별 상세 prefill — jsonb 로 반환.
CREATE OR REPLACE FUNCTION public.get_my_listing_detail()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_place RECORD;
  v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT place_id, category INTO v_place FROM public.places WHERE owner_user_id = v_uid LIMIT 1;
  IF v_place.place_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  IF v_place.category = 'wedding_hall' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT hall_styles, meal_types, min_guarantee, max_guarantee FROM public.place_wedding_halls WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'studio' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT shoot_styles, includes_originals, dress_provided FROM public.place_studios WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'dress_shop' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT dress_styles, rental_only, fitting_count FROM public.place_dress_shops WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'makeup_shop' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT makeup_styles, includes_rehearsal, hair_makeup_separate FROM public.place_makeup_shops WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'hanbok' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT hanbok_types, custom_available, delivery_available FROM public.place_hanboks WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'tailor_shop' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT suit_styles, custom_available, fitting_count FROM public.place_tailor_shops WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'invitation_venue' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT venue_types, capacity_min, capacity_max, private_room_count FROM public.place_invitation_venues WHERE place_id = v_place.place_id) t;
  END IF;

  RETURN jsonb_build_object('category', v_place.category, 'detail', coalesce(v_out, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_listing_detail(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_listing_detail() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_listing_detail(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_listing_detail() TO authenticated;
