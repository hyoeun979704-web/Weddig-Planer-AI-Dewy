-- 사진 AI 보정(화질+몸매) 사용 기록 — "계정당 첫 1회 무료" 판정용.
create table if not exists public.photo_retouch_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used_count int not null default 0,
  first_free_used boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.photo_retouch_usage enable row level security;

-- 사용자는 본인 기록만 조회 가능(무료 잔여 표시용). 쓰기는 service_role(엣지 함수)만.
drop policy if exists "retouch usage self read" on public.photo_retouch_usage;
create policy "retouch usage self read"
  on public.photo_retouch_usage for select
  using (auth.uid() = user_id);
