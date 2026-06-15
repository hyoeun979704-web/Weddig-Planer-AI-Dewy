-- 타입 안전: 견적 RPC 의 선택적 파라미터에 DEFAULT NULL 부여 → 생성 타입이 optional 로 잡혀
-- 클라가 값을 생략(undefined)할 수 있다(as-any 제거 시 컴파일 타임 인자 체크 확보).
-- 동작/시그니처(arg 타입) 불변 — DEFAULT 만 추가.
create or replace function public.create_quote_request(
  p_category text,
  p_city text default null, p_district text default null,
  p_budget_min int default null, p_budget_max int default null,
  p_wedding_date date default null, p_style text default null, p_note text default null
) returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_id uuid; v_open int; v_matched int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_category is null or btrim(p_category) = '' then
    return jsonb_build_object('ok', false, 'error', 'category_required'); end if;
  select count(*) into v_open from public.quote_requests where user_id = v_uid and status = 'open';
  if v_open >= 5 then return jsonb_build_object('ok', false, 'error', 'too_many_open'); end if;

  v_id := gen_random_uuid();
  insert into public.quote_requests (id, user_id, category, region_city, region_district,
    budget_min, budget_max, wedding_date, style, note)
  values (v_id, v_uid, p_category, nullif(btrim(coalesce(p_city,'')),''),
    nullif(btrim(coalesce(p_district,'')),''), p_budget_min, p_budget_max, p_wedding_date,
    nullif(btrim(coalesce(p_style,'')),''), nullif(btrim(coalesce(p_note,'')),''));

  insert into public.quote_request_targets (request_id, place_id, owner_user_id)
  select v_id, p.place_id, p.owner_user_id
  from public.places p
  where p.is_active = true and p.deleted_at is null and p.owner_user_id is not null
    and p.category = p_category
    and (p_city is null or btrim(p_city) = '' or p.city = btrim(p_city))
  order by p.partner_rank desc nulls last,
    (case when p_budget_max is not null and p.min_price is not null and p.min_price <= p_budget_max then 0 else 1 end),
    p.avg_rating desc nulls last
  limit 20;
  get diagnostics v_matched = row_count;

  insert into public.app_notifications (recipient_id, type, title, body, link)
  select t.owner_user_id, 'quote_lead', '새 견적 요청이 도착했어요',
    '고객이 ' || p_category || ' 견적을 요청했어요. 응답해보세요.', '/business/leads'
  from public.quote_request_targets t where t.request_id = v_id;

  return jsonb_build_object('ok', true, 'request_id', v_id, 'matched', v_matched);
end; $function$;

create or replace function public.submit_quote_response(
  p_request_id uuid, p_message text, p_price_min int default null, p_price_max int default null
) returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_place uuid; v_requester uuid; v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_message is null or btrim(p_message) = '' then
    return jsonb_build_object('ok', false, 'error', 'message_required'); end if;
  select t.place_id into v_place from public.quote_request_targets t
    where t.request_id = p_request_id and t.owner_user_id = v_uid;
  if v_place is null then return jsonb_build_object('ok', false, 'error', 'not_matched'); end if;
  select status, user_id into v_status, v_requester from public.quote_requests where id = p_request_id;
  if v_status <> 'open' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;

  insert into public.quote_responses (request_id, place_id, owner_user_id, message, price_min, price_max)
  values (p_request_id, v_place, v_uid, btrim(p_message), p_price_min, p_price_max)
  on conflict (request_id, place_id) do update
    set message = excluded.message, price_min = excluded.price_min,
        price_max = excluded.price_max, created_at = now();

  insert into public.app_notifications (recipient_id, type, title, body, link)
  values (v_requester, 'quote_response', '견적 답변이 도착했어요',
    '요청하신 견적에 업체가 답변했어요.', '/quote/' || p_request_id::text);

  return jsonb_build_object('ok', true);
end; $function$;
