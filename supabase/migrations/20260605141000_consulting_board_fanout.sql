-- 컨설팅 보드 fan-out: 섹션별 1장씩 별도 워커가 생성 → 각자 이 RPC로 결과 기록.
-- 마지막 보드(boards_remaining=0)에서 리포트를 완료/실패로 마감 + 환불 정산.
-- (원격 DB 에는 apply_migration 으로 적용됨. 리포 정합성용 파일.)
alter table public.wedding_consulting_reports
  add column if not exists boards_remaining integer;

create or replace function public.consulting_board_done(
  p_report uuid, p_section text, p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare v record; v_total int; v_ok int; v_failed int; v_refund int;
begin
  update public.wedding_consulting_reports
     set results = case when p_path is not null and p_path <> ''
                        then results || jsonb_build_object('section', p_section, 'path', p_path)
                        else results end,
         boards_remaining = greatest(coalesce(boards_remaining, 1) - 1, 0),
         updated_at = now()
   where id = p_report and status = 'processing'
   returning * into v;
  if not found then return; end if;
  if v.boards_remaining > 0 then return; end if;

  v_total  := coalesce(array_length(v.sections, 1), 0);
  v_ok     := coalesce(jsonb_array_length(v.results), 0);
  v_failed := greatest(v_total - v_ok, 0);

  if v_ok = 0 then
    update public.wedding_consulting_reports
       set status='failed', error='all_failed', charged=0, updated_at=now() where id=p_report;
    if coalesce(v.charged,0) > 0 then
      perform public.earn_hearts(v.user_id, v.charged, 'wedding_consulting_refund', v.id);
    end if;
  else
    v_refund := case when v_failed>0 then round(v_failed::numeric / v_total * coalesce(v.charged,0)) else 0 end;
    update public.wedding_consulting_reports
       set status='completed', charged=coalesce(v.charged,0)-v_refund, updated_at=now() where id=p_report;
    if v_refund>0 then perform public.earn_hearts(v.user_id, v_refund, 'wedding_consulting_refund', v.id); end if;
    insert into public.wedding_consulting_usage(user_id, used_count, updated_at)
      values (v.user_id, 1, now())
      on conflict (user_id) do update set used_count = public.wedding_consulting_usage.used_count + 1, updated_at = now();
  end if;
end; $$;
