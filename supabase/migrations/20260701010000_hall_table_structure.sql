-- 홀 테이블 구조 수집(①) — 좌석배치 미리보기 데이터 기반.
-- place_wedding_halls(파트너 편집 detail)에 table_count·seats_per_table 추가하고
-- upsert/get RPC 의 wedding_hall 분기를 확장(BusinessListingDetailForm 이 저장·복원).
-- 정밀 평면도가 아니라 "테이블 몇 개 × 좌석 몇" 구조 숫자만 수집(표준 그리드 미리보기용).
-- 좌석배치 UI 는 명단·구조가 쌓인 뒤 별도(plan 2-C 이월).

ALTER TABLE public.place_wedding_halls
  ADD COLUMN IF NOT EXISTS table_count integer,
  ADD COLUMN IF NOT EXISTS seats_per_table integer;

CREATE OR REPLACE FUNCTION public.upsert_my_listing_detail(p_detail jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid UUID := auth.uid(); v_place RECORD; d jsonb := coalesce(p_detail, '{}'::jsonb);
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT place_id, category INTO v_place FROM public.places WHERE owner_user_id = v_uid LIMIT 1;
  IF v_place.place_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'no_listing'); END IF;
  IF v_place.category = 'wedding_hall' THEN
    INSERT INTO public.place_wedding_halls (place_id, hall_styles, meal_types, min_guarantee, max_guarantee, table_count, seats_per_table)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'hall_styles'), _jsonb_to_text_arr(d->'meal_types'), (d->>'min_guarantee')::int, (d->>'max_guarantee')::int, (d->>'table_count')::int, (d->>'seats_per_table')::int)
    ON CONFLICT (place_id) DO UPDATE SET hall_styles=EXCLUDED.hall_styles, meal_types=EXCLUDED.meal_types, min_guarantee=EXCLUDED.min_guarantee, max_guarantee=EXCLUDED.max_guarantee, table_count=EXCLUDED.table_count, seats_per_table=EXCLUDED.seats_per_table;
  ELSIF v_place.category = 'studio' THEN
    INSERT INTO public.place_studios (place_id, shoot_styles, includes_originals, dress_provided)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'shoot_styles'), (d->>'includes_originals')::boolean, (d->>'dress_provided')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET shoot_styles=EXCLUDED.shoot_styles, includes_originals=EXCLUDED.includes_originals, dress_provided=EXCLUDED.dress_provided;
  ELSIF v_place.category = 'dress_shop' THEN
    INSERT INTO public.place_dress_shops (place_id, dress_styles, rental_only, fitting_count)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'dress_styles'), (d->>'rental_only')::boolean, (d->>'fitting_count')::int)
    ON CONFLICT (place_id) DO UPDATE SET dress_styles=EXCLUDED.dress_styles, rental_only=EXCLUDED.rental_only, fitting_count=EXCLUDED.fitting_count;
  ELSIF v_place.category = 'makeup_shop' THEN
    INSERT INTO public.place_makeup_shops (place_id, makeup_styles, includes_rehearsal, hair_makeup_separate)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'makeup_styles'), (d->>'includes_rehearsal')::boolean, (d->>'hair_makeup_separate')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET makeup_styles=EXCLUDED.makeup_styles, includes_rehearsal=EXCLUDED.includes_rehearsal, hair_makeup_separate=EXCLUDED.hair_makeup_separate;
  ELSIF v_place.category = 'hanbok' THEN
    INSERT INTO public.place_hanboks (place_id, hanbok_types, custom_available, delivery_available)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'hanbok_types'), (d->>'custom_available')::boolean, (d->>'delivery_available')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET hanbok_types=EXCLUDED.hanbok_types, custom_available=EXCLUDED.custom_available, delivery_available=EXCLUDED.delivery_available;
  ELSIF v_place.category = 'tailor_shop' THEN
    INSERT INTO public.place_tailor_shops (place_id, suit_styles, custom_available, fitting_count, fabric_options, size_options, production_days, rental_only, rental_includes_alterations)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'suit_styles'), (d->>'custom_available')::boolean, (d->>'fitting_count')::int, _jsonb_to_text_arr(d->'fabric_options'), _jsonb_to_text_arr(d->'size_options'), (d->>'production_days')::int, (d->>'rental_only')::boolean, (d->>'rental_includes_alterations')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET suit_styles=EXCLUDED.suit_styles, custom_available=EXCLUDED.custom_available, fitting_count=EXCLUDED.fitting_count, fabric_options=EXCLUDED.fabric_options, size_options=EXCLUDED.size_options, production_days=EXCLUDED.production_days, rental_only=EXCLUDED.rental_only, rental_includes_alterations=EXCLUDED.rental_includes_alterations;
  ELSIF v_place.category = 'invitation_venue' THEN
    INSERT INTO public.place_invitation_venues (place_id, venue_types, capacity_min, capacity_max, private_room_count)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'venue_types'), (d->>'capacity_min')::int, (d->>'capacity_max')::int, (d->>'private_room_count')::int)
    ON CONFLICT (place_id) DO UPDATE SET venue_types=EXCLUDED.venue_types, capacity_min=EXCLUDED.capacity_min, capacity_max=EXCLUDED.capacity_max, private_room_count=EXCLUDED.private_room_count;
  ELSIF v_place.category = 'honeymoon' THEN
    INSERT INTO public.place_honeymoons (place_id, themes, countries, nights, days, avg_budget)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'themes'), _jsonb_to_text_arr(d->'countries'), (d->>'nights')::int, (d->>'days')::int, (d->>'avg_budget')::int)
    ON CONFLICT (place_id) DO UPDATE SET themes=EXCLUDED.themes, countries=EXCLUDED.countries, nights=EXCLUDED.nights, days=EXCLUDED.days, avg_budget=EXCLUDED.avg_budget;
  ELSIF v_place.category = 'jewelry' THEN
    INSERT INTO public.place_jewelry (place_id, metals, product_categories, price_couple_set, couple_set_available, engraving_available)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'metals'), _jsonb_to_text_arr(d->'product_categories'), (d->>'price_couple_set')::int, (d->>'couple_set_available')::boolean, (d->>'engraving_available')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET metals=EXCLUDED.metals, product_categories=EXCLUDED.product_categories, price_couple_set=EXCLUDED.price_couple_set, couple_set_available=EXCLUDED.couple_set_available, engraving_available=EXCLUDED.engraving_available;
  ELSIF v_place.category = 'appliance' THEN
    INSERT INTO public.place_appliances (place_id, product_categories, brand_options, package_set_price, free_delivery, free_installation)
    VALUES (v_place.place_id, _jsonb_to_text_arr(d->'product_categories'), _jsonb_to_text_arr(d->'brand_options'), (d->>'package_set_price')::int, (d->>'free_delivery')::boolean, (d->>'free_installation')::boolean)
    ON CONFLICT (place_id) DO UPDATE SET product_categories=EXCLUDED.product_categories, brand_options=EXCLUDED.brand_options, package_set_price=EXCLUDED.package_set_price, free_delivery=EXCLUDED.free_delivery, free_installation=EXCLUDED.free_installation;
  ELSE RETURN jsonb_build_object('ok', false, 'error', 'unsupported_category'); END IF;
  UPDATE public.places SET moderation_status='pending', is_active=false, updated_at=now()
  WHERE place_id = v_place.place_id AND owner_user_id = v_uid;
  RETURN jsonb_build_object('ok', true);
END; $function$;


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
    SELECT to_jsonb(t) INTO v_out FROM (SELECT hall_styles, meal_types, min_guarantee, max_guarantee, table_count, seats_per_table FROM public.place_wedding_halls WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'studio' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT shoot_styles, includes_originals, dress_provided FROM public.place_studios WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'dress_shop' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT dress_styles, rental_only, fitting_count FROM public.place_dress_shops WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'makeup_shop' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT makeup_styles, includes_rehearsal, hair_makeup_separate, duration_min, companion_makeup, product_brands, travel_areas FROM public.place_makeup_shops WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'hanbok' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT hanbok_types, custom_available, delivery_available, rental_days, size_options, family_hanbok FROM public.place_hanboks WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'tailor_shop' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT suit_styles, custom_available, fitting_count, fabric_options, production_days, size_options FROM public.place_tailor_shops WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'invitation_venue' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT venue_types, capacity_min, capacity_max, private_room_count FROM public.place_invitation_venues WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'honeymoon' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT themes, countries, nights, days, avg_budget FROM public.place_honeymoons WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'jewelry' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT metals, product_categories, price_couple_set, couple_set_available, engraving_available FROM public.place_jewelry WHERE place_id = v_place.place_id) t;
  ELSIF v_place.category = 'appliance' THEN
    SELECT to_jsonb(t) INTO v_out FROM (SELECT product_categories, brand_options, package_set_price, free_delivery, free_installation FROM public.place_appliances WHERE place_id = v_place.place_id) t;
  END IF;

  RETURN jsonb_build_object('category', v_place.category, 'detail', coalesce(v_out, '{}'::jsonb));
END;
$$;

