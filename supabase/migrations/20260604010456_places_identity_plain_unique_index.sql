-- places upsert 가 ON CONFLICT 불일치로 전부 실패하던 문제 수정.
-- 코드(scripts/collect-places/upsert.ts)의 onConflict "category,name,city,district"
-- (맨 컬럼) 이 매칭하려면 유니크 인덱스도 표현식(COALESCE)이 아니라 맨 컬럼이어야 한다.
-- 표현식 인덱스였던 탓에 "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification" 로 야간 수집의 모든 upsert 가 실패(upserted: 0)했다.
-- 기존 데이터에 city/district NULL 은 0건이라 의미 동일·안전.

-- 1) NULL 정규화(현재 0건이지만 멱등) + NOT NULL/DEFAULT 강제
update public.places set city = coalesce(city, '') where city is null;
update public.places set district = coalesce(district, '') where district is null;

alter table public.places
  alter column city set default '',
  alter column district set default '',
  alter column city set not null,
  alter column district set not null;

-- 2) 표현식 인덱스 → 맨 컬럼 유니크 인덱스 교체
drop index if exists public.uq_places_identity;
create unique index uq_places_identity
  on public.places (category, name, city, district);
