-- 헤어 샘플 카탈로그(단일 헤어 선택지) + 관리자 AI 잡 현황 RPC.
-- (원격엔 apply_migration 으로 적용됨. 리포 정합성용.)
create table if not exists public.hair_samples (
  id uuid primary key default gen_random_uuid(),
  name text not null, image_url text not null, prompt text, category text,
  is_active boolean not null default true, display_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.hair_samples enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='hair_samples' and cmd='SELECT')
  then create policy "Anyone can view active hair samples" on public.hair_samples for select using (is_active = true); end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='hair_samples' and cmd='INSERT')
  then create policy "Admins can insert hair samples" on public.hair_samples for insert with check (has_role(auth.uid(),'admin'::app_role)); end if;
  if not exists (select 1 from pg_policies where tablename='hair_samples' and cmd='UPDATE')
  then create policy "Admins can update hair samples" on public.hair_samples for update using (has_role(auth.uid(),'admin'::app_role)) with check (has_role(auth.uid(),'admin'::app_role)); end if;
  if not exists (select 1 from pg_policies where tablename='hair_samples' and cmd='DELETE')
  then create policy "Admins can delete hair samples" on public.hair_samples for delete using (has_role(auth.uid(),'admin'::app_role)); end if;
end $$;
insert into storage.buckets (id, name, public) values ('hair-samples','hair-samples',true) on conflict (id) do nothing;
-- 관리자 AI 잡 현황 집계 RPC 는 20260605160000 apply_migration 참조(admin_ai_job_stats).
