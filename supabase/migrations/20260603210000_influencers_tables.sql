-- 인플루언서 기능이 코드(useInfluencers.ts, /influencers 페이지)엔 완성돼 있으나 실DB에
-- 테이블이 없어 항상 빈 화면이었다(드리프트). 훅 인터페이스 그대로 생성해 정합성 복구.
create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  platform text,
  profile_image_url text,
  cover_image_url text,
  bio text,
  follower_count integer not null default 0,
  category text,
  tags text[] not null default '{}',
  external_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.influencer_contents (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  title text not null,
  description text,
  thumbnail_url text,
  content_url text,
  content_type text,
  view_count integer not null default 0,
  like_count integer not null default 0,
  display_order integer not null default 0,
  created_at timestamptz default now()
);
create index if not exists idx_influencer_contents_inf on public.influencer_contents(influencer_id);
create index if not exists idx_influencers_active on public.influencers(is_active, display_order);

alter table public.influencers enable row level security;
alter table public.influencer_contents enable row level security;

create policy "influencers public read" on public.influencers for select to public using (true);
create policy "influencer_contents public read" on public.influencer_contents for select to public using (true);
