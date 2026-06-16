-- place_media 포트폴리오 확장 — "같은 식장 포폴 우선" 매칭의 기반.
--
-- 업체가 포트폴리오(사진)를 등록할 때 ① 진행 장소(식장) ② 스타일 태그 ③ 설명을
-- 함께 입력할 수 있게 컬럼을 추가한다. 사용자가 확정한 식장
-- (user_wedding_settings.wedding_venue_place_id)과 같은 장소에서 진행한 포폴이 있는
-- 업체(스냅·DVD·보정 등)를 우선 추천/노출하기 위함.
-- 설계: docs/260616_reference_matching_design.md §3.5.
--
-- 모두 nullable·idempotent(add column if not exists) → 기존 행/쓰기 회귀 0.

alter table public.place_media
  -- 작업 진행 장소가 Dewy 에 등록돼 있으면 FK(관계/embed 안전 — 정합성 교훈).
  -- 식장이 삭제돼도 포폴 자체는 남기되 연결만 해제(set null).
  add column if not exists venue_place_id uuid references public.places(place_id) on delete set null,
  -- 식장이 미등록(지방·한옥·소규모 등)이면 자유 입력 폴백(표시·이름매칭용).
  add column if not exists venue_name text,
  -- 카테고리별 통제어휘 스타일 태그(필터·이미지매칭과 동일 어휘 — DRY).
  add column if not exists style_tags text[] not null default '{}',
  -- 포트폴리오 설명(검색 보조·노출 문구).
  add column if not exists description text;

-- 같은-식장 매칭 조회 가속(venue_place_id 로 포폴 보유 업체 역조회).
create index if not exists idx_place_media_venue on public.place_media(venue_place_id)
  where venue_place_id is not null;

comment on column public.place_media.venue_place_id is '포폴 진행 장소(식장) place_id. 사용자 확정 식장과 매칭해 우선 노출.';
comment on column public.place_media.venue_name is '식장 미등록 시 자유 입력 식장명(이름 매칭 폴백).';
comment on column public.place_media.style_tags is '스타일 태그(필터/이미지매칭 공용 통제어휘).';
