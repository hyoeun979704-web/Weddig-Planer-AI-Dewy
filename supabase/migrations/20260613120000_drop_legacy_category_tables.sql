-- 레거시 카테고리 테이블 정리.
-- 현 아키텍처는 `places` + 카테고리별 서브타입(`place_studios`, `place_hanboks`,
-- `place_honeymoons`, `place_tailor_shops`, `place_appliances` 등)으로 통일됐고,
-- 아래 6개 단독 테이블은 그 이전 구조의 잔재다.
--
-- 안전성 검증(2026-06-13):
--   · 6개 모두 row 0건.
--   · 코드(src + supabase/functions) 어디서도 `.from()` 으로 참조하지 않음.
--   · RPC/트리거 본문 참조 0 (단, get_my_listing_detail/upsert_my_listing_detail 의
--     'hanbok'/'honeymoon' 은 `v_place.category = 'hanbok'` 카테고리 문자열일 뿐
--     테이블 접근이 아님 — 실데이터는 place_hanboks/place_honeymoons).
--
-- 비어 있고 의존 객체가 없을 것으로 확인됐으나, 혹시 남은 정책/제약을 함께 정리하도록
-- CASCADE 로 드롭한다(row 0건이라 데이터 손실 없음).

DROP TABLE IF EXISTS public.appliances CASCADE;
DROP TABLE IF EXISTS public.hanbok CASCADE;
DROP TABLE IF EXISTS public.honeymoon CASCADE;
DROP TABLE IF EXISTS public.honeymoon_gifts CASCADE;
DROP TABLE IF EXISTS public.studios CASCADE;
DROP TABLE IF EXISTS public.suits CASCADE;
