-- create_quote_request 가 8인자(구·이미지 미처리)·9인자(p_image_paths 포함) 2개 공존(260624 코드리뷰 B1).
-- 이미지 없는 견적이 구 8인자로 라우팅돼 조용히 갈라지던 문제 해결 — 구 8인자 DROP.
-- 이후 8개 인자 호출도 9인자(p_image_paths DEFAULT '{}')로 매칭된다.
drop function if exists public.create_quote_request(
  text, text, text, integer, integer, date, text, text
);
