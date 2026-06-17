-- 포트폴리오 앨범 — "같은 장소/패키지 작업"을 폴더처럼 묶어 등록·노출(#326 기획 기능1).
--
-- 기존 place_media 는 사진 1장=1행이라 같은 식장 다량 포폴 시 장소·태그를 매 사진 반복 입력해야 했다.
-- 앨범(place_media_albums)에 공통 메타(제목·촬영일·식장·스타일태그·상품/패키지·설명)를 1회 설정하고
-- 사진들을 album_id 로 귀속시킨다. 소비자 상세는 앨범 단위로 그룹 노출 + 식장/스타일/상품 필터.
--
-- 모두 nullable·idempotent → 기존 단독 사진(album_id=null)은 그대로 동작(호환).

create table if not exists public.place_media_albums (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(place_id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  shoot_date date,
  -- 진행 장소(식장). 등록된 식장이면 FK(같은-식장 우선노출 매칭), 미등록이면 venue_name 폴백.
  venue_place_id uuid references public.places(place_id) on delete set null,
  venue_name text,
  -- 스타일 태그(필터·이미지매칭 공용 통제어휘).
  style_tags text[] not null default '{}',
  description text,
  -- 이 앨범이 어떤 상품/패키지로 작업한 결과인지(포폴→상품 전환 동선). 상품 삭제 시 연결만 해제.
  product_id uuid references public.business_products(id) on delete set null,
  -- 커버 사진(place_media.id). 순환참조 회피 위해 FK 없이 보관(앱에서 정합 유지).
  cover_media_id uuid,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists place_media_albums_place_idx on public.place_media_albums(place_id, display_order);
create index if not exists place_media_albums_venue_idx on public.place_media_albums(venue_place_id)
  where venue_place_id is not null;
create index if not exists place_media_albums_product_idx on public.place_media_albums(product_id)
  where product_id is not null;

alter table public.place_media_albums enable row level security;

-- 공개 읽기(소비자 노출) · 소유자만 쓰기(place_media 와 동일 패턴).
drop policy if exists "Anyone can view albums" on public.place_media_albums;
create policy "Anyone can view albums" on public.place_media_albums for select using (true);
drop policy if exists "Owner can insert own albums" on public.place_media_albums;
create policy "Owner can insert own albums" on public.place_media_albums for insert with check (owner_user_id = auth.uid());
drop policy if exists "Owner can update own albums" on public.place_media_albums;
create policy "Owner can update own albums" on public.place_media_albums for update using (owner_user_id = auth.uid());
drop policy if exists "Owner can delete own albums" on public.place_media_albums;
create policy "Owner can delete own albums" on public.place_media_albums for delete using (owner_user_id = auth.uid());

drop trigger if exists place_media_albums_set_updated_at on public.place_media_albums;
create trigger place_media_albums_set_updated_at
  before update on public.place_media_albums
  for each row execute function public.set_updated_at();

-- 사진을 앨범에 귀속(없으면 단독 사진 — 호환).
alter table public.place_media add column if not exists album_id uuid references public.place_media_albums(id) on delete set null;
create index if not exists place_media_album_idx on public.place_media(album_id) where album_id is not null;

comment on table public.place_media_albums is '포트폴리오 앨범 — 공통 메타(식장·스타일·상품) 1회 설정 후 사진 묶음. 소비자 상세 앨범 단위 노출.';
