-- Phase 4: 예약 전환(견적 성사 가시화) + 업체 ROI 퍼널.
alter table public.quote_responses drop constraint if exists quote_responses_status_check;
alter table public.quote_responses
  add constraint quote_responses_status_check check (status in ('sent','accepted','booked','declined'));

-- 소비자가 수락한 견적을 '예약 완료'로 전환(성사). 요청자 본인만, accepted/booked 에서만.
create or replace function public.mark_quote_booked(p_response_id uuid)
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_req uuid; v_owner uuid; v_requester uuid; v_status text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  select qr.request_id, qr.owner_user_id, qr.status into v_req, v_owner, v_status
    from public.quote_responses qr where qr.id = p_response_id;
  if v_req is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select user_id into v_requester from public.quote_requests where id = v_req;
  if v_requester is null or v_requester <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if v_status not in ('accepted','booked') then
    return jsonb_build_object('ok', false, 'error', 'not_accepted'); end if;

  update public.quote_responses set status = 'booked' where id = p_response_id;
  update public.quote_requests set status = 'closed' where id = v_req;
  insert into public.app_notifications (recipient_id, type, title, body, link)
  values (v_owner, 'quote_booked', '예약이 확정됐어요! ',
    '고객이 회원님과 예약을 확정했어요. 일정을 안내해주세요.', '/business/leads');
  return jsonb_build_object('ok', true);
end; $function$;
revoke all on function public.mark_quote_booked(uuid) from public, anon;
grant execute on function public.mark_quote_booked(uuid) to authenticated;

-- 업체 ROI 퍼널: 내 업체들이 받은 리드/응답/수락/예약 집계(집계만).
create or replace function public.get_business_quote_funnel()
 returns jsonb
 language sql security definer set search_path to 'public' stable
as $function$
  select jsonb_build_object(
    'leads', (select count(*) from public.quote_request_targets where owner_user_id = auth.uid()),
    'responded', (select count(*) from public.quote_responses where owner_user_id = auth.uid()),
    'accepted', (select count(*) from public.quote_responses where owner_user_id = auth.uid() and status in ('accepted','booked')),
    'booked', (select count(*) from public.quote_responses where owner_user_id = auth.uid() and status = 'booked')
  );
$function$;
revoke all on function public.get_business_quote_funnel() from public, anon;
grant execute on function public.get_business_quote_funnel() to authenticated;
