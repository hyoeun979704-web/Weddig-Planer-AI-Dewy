-- quote_responses.place_id → places(place_id) 외래키 보강
--
-- 왜: useQuoteResponses 가 `quote_responses` 에서 `places(...)` 를 PostgREST
-- 리소스 embed 로 가져오는데, embed 는 두 테이블 사이의 FK 관계가 있어야 동작한다.
-- quote_responses.place_id 에 FK 가 없으면 PGRST200("could not find a relationship")
-- 으로 응답 쿼리 전체가 빈 결과가 되어 '내 견적 응답' 화면이 조용히 비어 보인다.
-- (community_post_places·vendor_board_items·place_studio_products 는 동일 FK 가 있어
--  embed 가 정상 동작 — 동일 패턴으로 맞춘다.)
--
-- 안전장치:
--  1) place_id 를 포함하는 FK 가 이미 있으면 no-op — 중복 생성 시 embed 가
--     ambiguous(PGRST201) 해지는 것을 방지(라이브 DB 에 직접 추가돼 있을 수 있음).
--  2) NOT VALID — 기존 행을 검증하지 않으므로 고아 데이터가 있어도 배포가 실패하지
--     않는다. PostgREST 는 NOT VALID FK 도 관계로 인식하므로 embed 는 즉시 가능해진다.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.quote_responses'::regclass
      and c.contype = 'f'
      and (
        select a.attnum
        from pg_attribute a
        where a.attrelid = c.conrelid and a.attname = 'place_id'
      ) = any (c.conkey)
  ) then
    alter table public.quote_responses
      add constraint quote_responses_place_id_fkey
      foreign key (place_id) references public.places(place_id)
      on delete cascade
      not valid;
  end if;
end $$;

-- PostgREST 스키마 캐시 즉시 리로드(새 관계 반영).
notify pgrst, 'reload schema';
