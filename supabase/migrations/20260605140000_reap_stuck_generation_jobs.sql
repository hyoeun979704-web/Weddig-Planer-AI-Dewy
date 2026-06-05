-- 생성 잡 자동 복구 — Edge 워커가 월클럭 제한으로 죽어 status 가 멈춘 경우,
-- 10분 경과한 processing/pending 행을 failed 로 내리고 하트를 환불(2분마다 pg_cron).
-- (원격 DB 에는 apply_migration 으로 적용됨. 리포 정합성용 파일.)
create or replace function public.reap_stuck_generation_jobs()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in update public.wedding_consulting_reports
       set status='failed', error='timeout_reaped', updated_at=now()
     where status='processing' and created_at < now() - interval '10 minutes'
     returning id, user_id, coalesce(charged,0) as amt loop
    if r.amt>0 then perform public.earn_hearts(r.user_id, r.amt, 'wedding_consulting_refund', r.id); end if; n:=n+1;
  end loop;
  for r in update public.photo_retouch_jobs
       set status='failed', error='timeout_reaped', updated_at=now()
     where status='processing' and created_at < now() - interval '10 minutes'
     returning id, user_id, coalesce(charged,0) as amt loop
    if r.amt>0 then perform public.earn_hearts(r.user_id, r.amt, 'photo_fix_batch_refund', r.id); end if; n:=n+1;
  end loop;
  for r in update public.dress_fittings
       set status='failed', error_message='timeout_reaped', updated_at=now()
     where status='pending' and created_at < now() - interval '10 minutes'
     returning id, user_id, coalesce(hearts_spent,0) as amt loop
    if r.amt>0 then perform public.earn_hearts(r.user_id, r.amt, 'refund_failed_generation', r.id); end if; n:=n+1;
  end loop;
  for r in update public.makeup_fittings
       set status='failed', error_message='timeout_reaped', updated_at=now()
     where status='pending' and created_at < now() - interval '10 minutes'
     returning id, user_id, coalesce(hearts_spent,0) as amt loop
    if r.amt>0 then perform public.earn_hearts(r.user_id, r.amt, 'refund_failed_makeup', r.id); end if; n:=n+1;
  end loop;
  return n;
end; $$;

select cron.unschedule('reap-stuck-generation')
  where exists (select 1 from cron.job where jobname='reap-stuck-generation');
select cron.schedule('reap-stuck-generation', '*/2 * * * *',
  $cron$select public.reap_stuck_generation_jobs();$cron$);
