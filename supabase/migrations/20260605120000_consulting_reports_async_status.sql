-- 컨설팅 보드를 비동기 잡으로 — 상태/결과/과금 추적 + 본인 읽기 RLS.
-- (이미 원격 DB 에는 apply_migration 으로 적용됨. 리포 정합성용 파일.)
alter table public.wedding_consulting_reports
  add column if not exists status text not null default 'completed',
  add column if not exists error text,
  add column if not exists charged integer,
  add column if not exists discounted boolean,
  add column if not exists results jsonb not null default '[]'::jsonb,
  add column if not exists source_path text,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.wedding_consulting_reports
    add constraint wedding_consulting_reports_status_chk
    check (status in ('processing','completed','failed'));
exception when duplicate_object then null; end $$;

-- 본인 리포트 조회(폴링/기록 화면). 기존 정책이 있으면 그대로 둠.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'wedding_consulting_reports' and cmd = 'SELECT'
  ) then
    create policy "consulting reports self read"
      on public.wedding_consulting_reports
      for select using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_consulting_reports_user_created
  on public.wedding_consulting_reports (user_id, created_at desc);
