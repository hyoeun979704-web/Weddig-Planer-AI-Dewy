-- Phase 3: 견적 수락(연결 완료) + 매칭 랭킹 고도화.

-- 소비자가 받은 견적 중 하나를 수락 → 업체에 알림(연결 완료). 요청자 본인만.
create or replace function public.accept_quote_response(p_response_id uuid)
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_req uuid; v_owner uuid; v_requester uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  select qr.request_id, qr.owner_user_id into v_req, v_owner
    from public.quote_responses qr where qr.id = p_response_id;
  if v_req is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select user_id into v_requester from public.quote_requests where id = v_req;
  if v_requester is null or v_requester <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;

  update public.quote_responses set status = 'accepted' where id = p_response_id;
  insert into public.app_notifications (recipient_id, type, title, body, link)
  values (v_owner, 'quote_accepted', '고객이 견적을 수락했어요',
    '고객이 회원님의 견적을 선택했어요. 빠르게 연락해보세요.', '/business/leads');
  return jsonb_build_object('ok', true);
end; $function$;
revoke all on function public.accept_quote_response(uuid) from public, anon;
grant execute on function public.accept_quote_response(uuid) to authenticated;

-- 매칭 랭킹 고도화: 파트너 우선 → 예산 적합(min_price <= 예산상한) 우선 → 평점.
create or replace function public.create_quote_request(
  p_category text, p_city text, p_district text,
  p_budget_min int, p_budget_max int, p_wedding_date date, p_style text, p_note text
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
