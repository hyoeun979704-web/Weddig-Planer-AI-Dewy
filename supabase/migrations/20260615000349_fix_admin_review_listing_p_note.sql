-- 버그: 클라(AdminBusinessReview.reviewListing)가 admin_review_listing 을 3인자
-- (p_place_id, p_approved, p_note)로 호출하는데 함수는 2인자라 PostgREST 가 함수를
-- 못 찾아 호출이 항상 실패 → 업체 리스팅 승인/반려 불가("처리에 실패했어요").
-- 또 사장님 페이지(BusinessVendorEdit)는 반려 사유로 moderation_note 를 읽지만 places 에
-- 그 컬럼이 없어 항상 빈값이었다. → 컬럼 추가 + p_note 파라미터 추가로 정합성 복구.
alter table public.places add column if not exists moderation_note text;

drop function if exists public.admin_review_listing(text, boolean);

create function public.admin_review_listing(p_place_id text, p_approved boolean, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  update public.places set
    moderation_status = case when p_approved then 'approved' else 'rejected' end,
    is_active = p_approved,
    moderation_note = case when p_approved then null else p_note end,
    updated_at = now()
  where place_id = p_place_id::uuid and owner_user_id is not null;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end; $function$;

revoke all on function public.admin_review_listing(text, boolean, text) from public, anon;
grant execute on function public.admin_review_listing(text, boolean, text) to authenticated;
