-- ============================================================================
-- 업체 좌표(places.lat/lng) 백필 인프라
-- ============================================================================
-- place-geocode-backfill edge function 이 사용하는 DB 객체.
--   · geocode_backfill_log : 시도/검증 로그(감사용)
--   · geocode_admin        : 함수 호출용 관리자 토큰(RLS 잠금, service_role 만)
--   · pick_geocode_targets : 좌표 없는 + 미시도 업체 선별(반복 호출 시 진행 보장)
--   · favorites CHECK       : 드레스/메이크업 item_type 허용
-- 모두 멱등(if exists / create or replace / on conflict)이라 재적용 안전.
-- 주간 자동 백필 cron 은 MANUAL_20260602_geocode_pg_cron 파일 참고.
-- ============================================================================

-- 1) 백필 로그 ---------------------------------------------------------------
create table if not exists geocode_backfill_log (
  id bigint generated always as identity primary key,
  run_id uuid,
  place_id uuid,
  name text,
  district text,
  category text,
  query text,
  matched boolean,
  district_match boolean,
  used_fallback boolean,
  title text,
  address text,
  lat numeric,
  lng numeric,
  raw_mapx text,
  raw_mapy text,
  error text,
  dry_run boolean,
  created_at timestamptz default now()
);
alter table geocode_backfill_log enable row level security;

-- 2) 관리자 토큰 저장소 (RLS 활성 + 정책 없음 = anon/authenticated 거부) --------
create table if not exists geocode_admin (
  id int primary key default 1,
  token text not null,
  constraint geocode_admin_singleton check (id = 1)
);
alter table geocode_admin enable row level security;
insert into geocode_admin (id, token)
values (1, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- 3) 대상 선별 RPC ----------------------------------------------------------
create or replace function pick_geocode_targets(cats text[], lim int)
returns table(place_id uuid, name text, city text, district text, category text)
language sql
security definer
set search_path = public
as $$
  select p.place_id, p.name, p.city, p.district, p.category
  from places p
  where p.lat is null
    and p.is_active
    and (cats is null or p.category = any(cats))
    and not exists (
      select 1 from geocode_backfill_log g
      where g.place_id = p.place_id and g.dry_run = false
    )
  order by p.category
  limit lim
$$;
revoke all on function pick_geocode_targets(text[], int) from anon, authenticated;

-- 4) favorites 가 드레스/메이크업 찜을 받도록 CHECK 확장 -----------------------
alter table favorites drop constraint if exists favorites_item_type_check;
alter table favorites add constraint favorites_item_type_check
  check (item_type = any (array[
    'venue','studio','dress','makeup','honeymoon','honeymoon_gift','jewelry',
    'appliance','suit','hanbok','invitation_venues','community_post','deal',
    'product','influencer','tip_video'
  ]::text[]));
