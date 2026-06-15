-- 연결 완성: 견적 수락 시 업체가 고객에게 연락할 수 있도록, 수락된 견적에 한해 요청 고객의
-- 연락처(이름·전화)를 그 업체에만 공개한다. 고객의 '수락'이 곧 연락 동의. PII 라 정의자 권한
-- + 엄격 스코프(이 요청에 내 응답이 accepted 일 때만).
create or replace function public.get_quote_lead_contact(p_request_id uuid)
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_requester uuid; v_ok boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  select exists(
    select 1 from public.quote_responses
    where request_id = p_request_id and owner_user_id = v_uid and status = 'accepted'
  ) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'error', 'not_accepted'); end if;
  select user_id into v_requester from public.quote_requests where id = p_request_id;
  return jsonb_build_object(
    'ok', true,
    'name', (select display_name from public.profiles where user_id = v_requester),
    'phone', (select phone from public.profiles where user_id = v_requester)
  );
end; $function$;
revoke all on function public.get_quote_lead_contact(uuid) from public, anon;
grant execute on function public.get_quote_lead_contact(uuid) to authenticated;
