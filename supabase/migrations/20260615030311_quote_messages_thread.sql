-- 연결 완성: 견적 요청-업체 간 인앱 메시지(전화 노출 없이 앱 안에서 대화). 스레드 = (요청, 업체).
-- 참여자: 요청 작성자(소비자) + 해당 업체 소유자. 읽기는 RLS, 쓰기는 RPC(검증+상대 알림).
create table if not exists public.quote_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  place_id uuid not null,
  sender_user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists idx_quote_messages_thread on public.quote_messages(request_id, place_id, created_at);

alter table public.quote_messages enable row level security;

create policy quote_messages_select on public.quote_messages for select using (
  exists (select 1 from public.quote_requests r where r.id = quote_messages.request_id and r.user_id = auth.uid())
  or exists (select 1 from public.quote_request_targets t
             where t.request_id = quote_messages.request_id and t.place_id = quote_messages.place_id
               and t.owner_user_id = auth.uid())
);

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
