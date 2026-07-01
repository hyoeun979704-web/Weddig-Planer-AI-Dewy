-- P0(하트 미환불): 멈춘 잡 reaper 에 sdm_previews 블록이 없어, dewy-sdm 워커가
-- 월클럭 제한 등으로 죽으면 10하트짜리 잡이 pending 으로 영구 잔존 + 미환불이었다
-- (idx_sdm_previews_pending 인덱스만 있고 소비자가 없던 상태).
-- hair_preview_jobs 블록은 원격 DB 에 apply_migration 으로만 적용돼 리포 파일이 stale
-- 했으므로(20260605150000 주석 참조) 여기서 함께 리포에 정착시킨다.
-- 전체 함수를 CREATE OR REPLACE 로 재정의(멱등) — 기존 4개 테이블 블록은 동일 유지.

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
  -- 스드메 미리보기(10하트) — dress_fittings 와 동일 스키마 계열(pending/hearts_spent/error_message).
  for r in update public.sdm_previews
       set status='failed', error_message='timeout_reaped', updated_at=now()
     where status='pending' and created_at < now() - interval '10 minutes'
     returning id, user_id, coalesce(hearts_spent,0) as amt loop
    if r.amt>0 then perform public.earn_hearts(r.user_id, r.amt, 'refund_failed_generation', r.id); end if; n:=n+1;
  end loop;
  -- 헤어 미리보기 — 원격에만 있던 블록의 리포 정착(processing/charged/error).
  for r in update public.hair_preview_jobs
       set status='failed', error='timeout_reaped', updated_at=now()
     where status='processing' and created_at < now() - interval '10 minutes'
     returning id, user_id, coalesce(charged,0) as amt loop
    if r.amt>0 then perform public.earn_hearts(r.user_id, r.amt, 'hair_preview_refund', r.id); end if; n:=n+1;
  end loop;
  return n;
end; $$;
