-- 사진보정을 비동기 잡으로 — 상태/결과/과금 기록 + 본인 읽기 RLS.
-- (이미 원격 DB 에는 apply_migration 으로 적용됨. 리포 정합성용 파일.)
create table if not exists public.photo_retouch_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  source_paths text[] not null default '{}',
  results jsonb not null default '[]'::jsonb,  -- [{source, path}]
  charged integer,
  discounted boolean,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.photo_retouch_jobs enable row level security;

drop policy if exists "photo jobs self read" on public.photo_retouch_jobs;
create policy "photo jobs self read"
  on public.photo_retouch_jobs
  for select using (auth.uid() = user_id);

create index if not exists idx_photo_jobs_user_created
  on public.photo_retouch_jobs (user_id, created_at desc);
