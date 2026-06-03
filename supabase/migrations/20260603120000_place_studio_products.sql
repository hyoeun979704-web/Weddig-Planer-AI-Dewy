-- 스튜디오 "상품 구성" 1:N 테이블. place_halls(홀별)와 대칭 구조로,
-- 한 스튜디오의 패키지별(본식/리허설/풀패키지 등) 구성·컨셉을 담는다.
create table if not exists public.place_studio_products (
  product_id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(place_id) on delete cascade,
  product_name text not null,            -- 상품/패키지명 (예: "본식+리허설 풀패키지")
  product_type text,                     -- 본식/리허설/본식+리허설/풀패키지/스냅
  price numeric,                         -- 패키지 정액 KRW
  concepts text[] default '{}',          -- 컨셉·씬 (한옥/야간/야외/내추럴/빈티지...)
  shoot_locations text[] default '{}',   -- 촬영 장소
  original_count integer,                -- 원본 제공 장수
  retouch_count integer,                 -- 보정본(셀렉) 수
  album_pages integer,                   -- 앨범 페이지 수
  album_count integer,                   -- 앨범 권수
  frame_included boolean,                -- 액자 포함
  dress_included boolean,                -- 드레스 대여 포함
  hair_makeup_included boolean,          -- 헤어·메이크업 포함
  outdoor_included boolean,              -- 야외 촬영 포함
  includes text[] default '{}',          -- 포함 내역 리스트
  notes text,                            -- 추가 옵션/유의사항
  main_image_url text,                   -- 상품 대표 이미지
  display_order integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_studio_products_place on public.place_studio_products(place_id);

alter table public.place_studio_products enable row level security;

create policy "place_studio_products public read"
  on public.place_studio_products for select
  to public using (true);
