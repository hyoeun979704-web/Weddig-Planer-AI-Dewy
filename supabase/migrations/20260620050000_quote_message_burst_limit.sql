-- R11(어뷰징 방지): 견적 메시지 도배 차단. 같은 스레드(request_id, place_id)에 같은 발신자가
-- 10분 내 10건을 초과해 보내면 차단한다(정상 대화엔 충분, 봇/스팸 급송만 차단 — RSVP 버스트와 동일 취지).
-- send_quote_message 를 동일 시그니처로 create-or-replace 하며 버스트 체크만 추가(권한 보존).

create or replace function public.send_quote_message(p_request_id uuid, p_place_id uuid, p_body text)
 returns jsonb
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_uid uuid := auth.uid(); v_requester uuid; v_owner uuid; v_other uuid; v_is_req boolean; v_is_owner boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_body is null or btrim(p_body) = '' then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  select user_id into v_requester from public.quote_requests where id = p_request_id;
  if v_requester is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select owner_user_id into v_owner from public.quote_request_targets
    where request_id = p_request_id and place_id = p_place_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'error', 'not_matched'); end if;
  v_is_req := (v_uid = v_requester);
  v_is_owner := (v_uid = v_owner);
  if not (v_is_req or v_is_owner) then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;

  -- 버스트 제한: 같은 스레드에 같은 발신자가 10분 내 10건 초과 차단.
  if (select count(*) from public.quote_messages
        where request_id = p_request_id and place_id = p_place_id
          and sender_user_id = v_uid
          and created_at > now() - interval '10 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.quote_messages (request_id, place_id, sender_user_id, body)
  values (p_request_id, p_place_id, v_uid, btrim(p_body));

  v_other := case when v_is_req then v_owner else v_requester end;
  insert into public.app_notifications (recipient_id, type, title, body, link)
  values (v_other, 'quote_message', '견적 메시지가 도착했어요',
    left(btrim(p_body), 60),
    case when v_is_req then '/business/leads' else '/quote/' || p_request_id::text end);

  return jsonb_build_object('ok', true);
end; $function$;

revoke all on function public.send_quote_message(uuid, uuid, text) from public, anon;
grant execute on function public.send_quote_message(uuid, uuid, text) to authenticated;
