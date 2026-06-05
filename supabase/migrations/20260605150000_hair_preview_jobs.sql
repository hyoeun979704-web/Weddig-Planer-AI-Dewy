-- 헤어 변형 미리보기 잡/사용카운트 + reaper 연동. (원격엔 apply_migration 적용됨)
create table if not exists public.hair_preview_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  source_path text,
  options text[] not null default '{}',
  single_style text,
  results jsonb not null default '[]'::jsonb,
  charged integer, discounted boolean, error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hair_preview_jobs enable row level security;
drop policy if exists "hair jobs self read" on public.hair_preview_jobs;
create policy "hair jobs self read" on public.hair_preview_jobs for select using (auth.uid() = user_id);
create index if not exists idx_hair_jobs_user_created on public.hair_preview_jobs (user_id, created_at desc);

create table if not exists public.hair_preview_usage (
  user_id uuid primary key, used_count integer not null default 0, updated_at timestamptz not null default now()
);
alter table public.hair_preview_usage enable row level security;
drop policy if exists "hair usage self read" on public.hair_preview_usage;
create policy "hair usage self read" on public.hair_preview_usage for select using (auth.uid() = user_id);
-- reaper 함수에 hair_preview_jobs 블록 추가됨(20260605150000 apply_migration 참조).
