-- 수집 파이프라인의 자식(홀/스튜디오상품) 전체교체를 원자적으로. 기존엔 스크립트가
-- delete 후 insert 를 따로 호출해, insert 가 (enum 위반·타입 불일치 등으로) 실패하면
-- delete 만 커밋되어 데이터가 통째로 유실됐다. 함수 본문은 단일 트랜잭션이라 insert 실패
-- 시 delete 도 함께 롤백된다. 관리자 배치 전용 → service_role 만 실행.

create or replace function public.replace_place_halls(p_place_id uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  delete from public.place_halls where place_id = p_place_id;
  insert into public.place_halls (
    place_id, hall_name, hall_type, floor, min_guarantee, max_guarantee, capacity_seated,
    capacity_standing, rental_fee, meal_price, meal_type, includes_drinks, drinks_separate_price,
    drinks_type, ceremony_type, ceremony_interval_min, ceremony_duration_min, simultaneous_events,
    ceiling_height, virgin_road_length, parking_available, concierge_fee, concierge_included,
    floral_included, floral_mandatory, floral_price, floral_decor, external_alcohol_allowed,
    decoration_diy_allowed, meal_ticket_provided, tags, event_options, main_image_url)
  select p_place_id, x.hall_name, x.hall_type, x.floor, x.min_guarantee, x.max_guarantee, x.capacity_seated,
    x.capacity_standing, x.rental_fee, x.meal_price, x.meal_type, x.includes_drinks, x.drinks_separate_price,
    x.drinks_type, x.ceremony_type, x.ceremony_interval_min, x.ceremony_duration_min, x.simultaneous_events,
    x.ceiling_height, x.virgin_road_length, x.parking_available, x.concierge_fee, x.concierge_included,
    x.floral_included, x.floral_mandatory, x.floral_price, x.floral_decor, x.external_alcohol_allowed,
    x.decoration_diy_allowed, x.meal_ticket_provided, x.tags, x.event_options, x.main_image_url
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as x(
    hall_name text, hall_type text, floor text, min_guarantee int, max_guarantee int, capacity_seated int,
    capacity_standing int, rental_fee numeric, meal_price numeric, meal_type text, includes_drinks boolean,
    drinks_separate_price numeric, drinks_type text, ceremony_type text, ceremony_interval_min int,
    ceremony_duration_min int, simultaneous_events boolean, ceiling_height numeric, virgin_road_length numeric,
    parking_available boolean, concierge_fee numeric, concierge_included boolean, floral_included boolean,
    floral_mandatory boolean, floral_price numeric, floral_decor text, external_alcohol_allowed boolean,
    decoration_diy_allowed boolean, meal_ticket_provided boolean, tags text[], event_options text[], main_image_url text)
  where coalesce(btrim(x.hall_name), '') <> '';
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.replace_studio_products(p_place_id uuid, p_rows jsonb)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  delete from public.place_studio_products where place_id = p_place_id;
  insert into public.place_studio_products (
    place_id, product_name, product_type, price, concepts, shoot_locations, original_count, retouch_count,
    album_pages, album_count, frame_included, dress_included, hair_makeup_included, outdoor_included,
    includes, notes, main_image_url, display_order)
  select p_place_id, x.product_name, x.product_type, x.price, x.concepts, x.shoot_locations, x.original_count,
    x.retouch_count, x.album_pages, x.album_count, x.frame_included, x.dress_included, x.hair_makeup_included,
    x.outdoor_included, x.includes, x.notes, x.main_image_url, coalesce(x.display_order, 0)
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as x(
    product_name text, product_type text, price numeric, concepts text[], shoot_locations text[],
    original_count int, retouch_count int, album_pages int, album_count int, frame_included boolean,
    dress_included boolean, hair_makeup_included boolean, outdoor_included boolean, includes text[],
    notes text, main_image_url text, display_order int)
  where coalesce(btrim(x.product_name), '') <> '';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.replace_place_halls(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.replace_studio_products(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_place_halls(uuid, jsonb) to service_role;
grant execute on function public.replace_studio_products(uuid, jsonb) to service_role;
