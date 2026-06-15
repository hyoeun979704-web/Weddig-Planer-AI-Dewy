-- ① 견적 요청/매칭 (1:N 수요 라우팅). 소비자가 필요를 올리면 조건 매칭 입점 업체에 리드를
-- 팬아웃하고, 업체가 메시지/견적으로 응답한다. 쓰기는 SECURITY DEFINER RPC 로만(직접쓰기 금지),
-- 읽기는 RLS(요청자 + 매칭된 업체 소유자)로 허용.

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  region_city text,
  region_district text,
  budget_min int,
  budget_max int,
  wedding_date date,
  style text,
  note text,
  status text not null default 'open' check (status in ('open','closed','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.quote_request_targets (
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  place_id uuid not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (request_id, place_id)
);
create index if not exists idx_qrt_owner on public.quote_request_targets(owner_user_id);

create table if not exists public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  place_id uuid not null,
  owner_user_id uuid not null,
  message text not null,
  price_min int,
  price_max int,
  status text not null default 'sent' check (status in ('sent','accepted','declined')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (request_id, place_id)
);

alter table public.quote_requests enable row level security;
alter table public.quote_request_targets enable row level security;
alter table public.quote_responses enable row level security;

create policy quote_requests_select on public.quote_requests for select using (
  user_id = auth.uid()
  or exists (select 1 from public.quote_request_targets t
             where t.request_id = quote_requests.id and t.owner_user_id = auth.uid())
);
create policy quote_requests_update_own on public.quote_requests for update using (user_id = auth.uid());

create policy quote_request_targets_select on public.quote_request_targets for select using (
  owner_user_id = auth.uid()
  or exists (select 1 from public.quote_requests r
             where r.id = quote_request_targets.request_id and r.user_id = auth.uid())
);

create policy quote_responses_select on public.quote_responses for select using (
  owner_user_id = auth.uid()
  or exists (select 1 from public.quote_requests r
             where r.id = quote_responses.request_id and r.user_id = auth.uid())
);

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
  order by p.partner_rank desc nulls last, p.avg_rating desc nulls last
  limit 20;
  get diagnostics v_matched = row_count;

  insert into public.app_notifications (recipient_id, type, title, body, link)
  select t.owner_user_id, 'quote_lead', '새 견적 요청이 도착했어요',
    '고객이 ' || p_category || ' 견적을 요청했어요. 응답해보세요.', '/business/leads'
  from public.quote_request_targets t where t.request_id = v_id;

  return jsonb_build_object('ok', true, 'request_id', v_id, 'matched', v_matched);
end; $function$;

create or replace function public.submit_quote_response(
  p_request_id uuid, p_message text, p_price_min int, p_price_max int
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

revoke all on function public.create_quote_request(text,text,text,int,int,date,text,text) from public, anon;
grant execute on function public.create_quote_request(text,text,text,int,int,date,text,text) to authenticated;
revoke all on function public.submit_quote_response(uuid,text,int,int) from public, anon;
grant execute on function public.submit_quote_response(uuid,text,int,int) to authenticated;
