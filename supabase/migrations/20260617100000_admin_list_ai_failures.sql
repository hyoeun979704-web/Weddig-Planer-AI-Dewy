-- 어드민 AI 작업 실패 상세 조회 — "기능 실패 시 왜 실패했는지 어드민에서 확인" (운영 관측성).
--
-- 그동안 AdminAIJobs 는 집계 카운트(admin_ai_job_stats)만 보여주고, 실패 개별 건의 사유는
-- 서버 로그(console.error)로만 남아 추적 불가였다. wedding_consulting_reports.error 에 실제
-- 사유를 저장(엣지펑션 수정)하고, 이 RPC 로 최근 실패를 사유와 함께 어드민에 노출한다.
--
-- SECURITY DEFINER + admin 역할 확인 → RLS(소유자 한정)를 우회해 전 사용자 실패를 조회.

create or replace function public.admin_list_ai_failures(p_limit int default 50)
returns table (
  report_id uuid,
  user_id uuid,
  status text,
  error text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'forbidden';
  end if;
  return query
    select r.id, r.user_id, r.status, r.error, r.created_at, r.updated_at
    from public.wedding_consulting_reports r
    where r.status = 'failed'
    order by r.updated_at desc nulls last
    limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

revoke all on function public.admin_list_ai_failures(int) from public;
grant execute on function public.admin_list_ai_failures(int) to authenticated;

comment on function public.admin_list_ai_failures is '어드민 전용 — 최근 실패한 AI 작업(웨딩컨설팅)을 실제 사유(error)와 함께 조회.';
