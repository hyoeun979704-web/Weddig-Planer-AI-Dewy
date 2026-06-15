-- 사진 첨부: 소비자가 견적 요청에 참고 사진을 올려 업체가 더 정확히 견적.
-- 공개 버킷(업체가 URL 로 열람) + 본인 폴더 업로드만.
insert into storage.buckets (id, name, public) values ('quote-uploads', 'quote-uploads', true)
on conflict (id) do nothing;

drop policy if exists "quote_uploads_insert_own" on storage.objects;
create policy "quote_uploads_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "quote_uploads_delete_own" on storage.objects;
create policy "quote_uploads_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'quote-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.quote_requests add column if not exists image_paths text[] not null default '{}';

create or replace function public.create_quote_request(
  p_category text,
  p_city text default null, p_district text default null,
  p_budget_min int default null, p_budget_max int default null,
  p_wedding_date date default null, p_style text default null, p_note text default null,
  p_image_paths text[] default '{}'
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
    budget_min, budget_max, wedding_date, style, note, image_paths)
  values (v_id, v_uid, p_category, nullif(btrim(coalesce(p_city,'')),''),
    nullif(btrim(coalesce(p_district,'')),''), p_budget_min, p_budget_max, p_wedding_date,
    nullif(btrim(coalesce(p_style,'')),''), nullif(btrim(coalesce(p_note,'')),''),
    coalesce(p_image_paths, '{}'));

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
