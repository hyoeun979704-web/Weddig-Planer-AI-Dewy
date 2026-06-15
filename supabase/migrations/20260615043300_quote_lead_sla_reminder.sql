-- 미응답 SLA 독려: 24h 내 답변 안 한 리드를 업체에 한 번 리마인드(응답률↑ = 소비자 이득).
alter table public.quote_request_targets add column if not exists reminded_at timestamptz;

create or replace function public.remind_pending_quote_leads()
 returns int
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_count int;
begin
  with due as (
    select t.request_id, t.place_id, t.owner_user_id
    from public.quote_request_targets t
    join public.quote_requests r on r.id = t.request_id
    where r.status = 'open'
      and t.created_at < now() - interval '24 hours'
      and t.reminded_at is null
      and not exists (
        select 1 from public.quote_responses qr
        where qr.request_id = t.request_id and qr.owner_user_id = t.owner_user_id)
    limit 500
  ), notif as (
    insert into public.app_notifications (recipient_id, type, title, body, link)
    select owner_user_id, 'quote_lead_reminder', '아직 답변 안 한 견적이 있어요',
      '고객이 기다리고 있어요. 빠르게 답할수록 선택될 확률이 높아요.', '/business/leads'
    from due
    returning 1
  )
  update public.quote_request_targets t set reminded_at = now()
  from due d where t.request_id = d.request_id and t.place_id = d.place_id;
  get diagnostics v_count = row_count;
  return v_count;
end; $function$;
revoke all on function public.remind_pending_quote_leads() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('quote-lead-reminders') where exists (select 1 from cron.job where jobname='quote-lead-reminders');
exception when others then null;
end $$;
select cron.schedule('quote-lead-reminders', '0 * * * *', $$select public.remind_pending_quote_leads();$$);
