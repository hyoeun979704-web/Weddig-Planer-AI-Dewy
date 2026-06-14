-- 방어적 보안(audit P2): admin_* 비즈니스/제휴 RPC 들이 anon/PUBLIC 에도 EXECUTE 가
-- 열려 있었다. 내부 has_role('admin') 가드로 비관리자는 forbidden 이라 권한상승은
-- 없지만, 프로젝트 컨벤션(명시적 revoke)에 맞춰 anon/PUBLIC 을 닫고 authenticated 만 둔다
-- (관리자는 authenticated + has_role 로 호출하므로 정상 동작).
revoke all on function public.admin_list_business_tiers() from public, anon, authenticated;
grant execute on function public.admin_list_business_tiers() to authenticated;

revoke all on function public.admin_list_partnership_applications() from public, anon, authenticated;
grant execute on function public.admin_list_partnership_applications() to authenticated;

revoke all on function public.admin_review_partnership(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_review_partnership(uuid, text, text) to authenticated;

revoke all on function public.admin_set_business_tier(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_business_tier(uuid, text) to authenticated;
