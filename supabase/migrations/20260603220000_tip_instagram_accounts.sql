-- 인스타 릴스 수집 소스(유튜브의 tip_channels 대응). 큐레이션한 "비즈니스/크리에이터"
-- 계정 username 리스트 → Business Discovery 로 최근 릴스를 주기 수집해 tip_instagrams 에 적재.
create table if not exists public.tip_instagram_accounts (
  username text primary key,
  display_name text,
  category text not null default 'general',     -- 이 계정 릴스의 기본 카테고리
  is_active boolean not null default true,
  reel_count integer not null default 0,
  last_synced_at timestamptz,
  last_sync_new integer,
  last_sync_error text,
  added_at timestamptz default now(),
  notes text
);

alter table public.tip_instagram_accounts enable row level security;

create policy "tip_instagram_accounts admin all"
  on public.tip_instagram_accounts for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
