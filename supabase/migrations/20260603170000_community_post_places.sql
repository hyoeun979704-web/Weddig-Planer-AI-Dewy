-- 커뮤니티 글 ↔ 업체(places) 연동. 한 글이 여러 업체를 태그할 수 있음(스드메 후기 등).
create table if not exists public.community_post_places (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  place_id uuid not null references public.places(place_id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, place_id)
);
create index if not exists idx_post_places_place on public.community_post_places(place_id);

alter table public.community_post_places enable row level security;

create policy "post_places public read" on public.community_post_places
  for select to public using (true);
create policy "post_places author insert" on public.community_post_places
  for insert to authenticated
  with check (exists (select 1 from public.community_posts p where p.id = post_id and p.user_id = auth.uid()));
create policy "post_places author delete" on public.community_post_places
  for delete to authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id and p.user_id = auth.uid()));
