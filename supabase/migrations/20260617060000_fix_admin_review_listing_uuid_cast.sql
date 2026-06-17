-- admin_review_listing: place_id uuid/text 타입 불일치로 'operator does not exist: uuid = text' 수정.
--
-- 라이브 places.place_id 는 uuid 인데 RPC 파라미터는 text → `WHERE place_id = p_place_id` 가
-- uuid=text 비교로 실패해 업체정보 검토(승인/반려)가 안 됐다. (repo 내부도 place_id 타입이
-- coupons/events=text vs media/products=uuid 로 불일치 — 정합성 보고서 docs/260617_consistency_audit.md.)
-- 파라미터는 text 유지(프론트가 문자열 전달, 다른 RPC 와 일관) + 컬럼을 text 로 캐스트해 타입 무관 비교.

create or replace function public.admin_review_listing(p_place_id text, p_approved boolean, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.places set
    moderation_status = case when p_approved then 'approved' else 'rejected' end,
    moderation_note = case when p_approved then null else p_note end,
    is_active = p_approved,
    updated_at = now()
  where place_id::text = p_place_id and owner_user_id is not null;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_review_listing(text, boolean, text) from public;
grant execute on function public.admin_review_listing(text, boolean, text) to authenticated;
