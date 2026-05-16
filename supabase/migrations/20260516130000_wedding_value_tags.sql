-- 사용자 가치 기반 태그 (value_tags) 컬럼 추가. 페르소나 시뮬레이션 v2의
-- S-2 (비건 카페 운영 + 환경 NGO) 케이스에서 보고된 "가치 기반 필터 부재"
-- 페인포인트. AI Planner system prompt에 컨텍스트로 주입되어 답변 톤·추천
-- 카탈로그가 사용자 가치축에 맞춰진다.
--
-- 허용 태그(MVP 4종): eco(친환경) · vegan(비건) · pet(반려동물 동반) ·
-- foreign_guests(외국인 하객 다수). 빈 배열 = 가치 태그 미선택.
-- CHECK 제약은 두지 않음 — 향후 태그 추가 시 마이그레이션 부담을 줄이고,
-- 클라이언트에서 허용 목록을 검증하는 쪽이 더 유연.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS value_tags TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.user_wedding_settings.value_tags IS
  '사용자가 선택한 가치 기반 태그 (eco/vegan/pet/foreign_guests 등). AI 답변·카탈로그 추천 가중치에 사용.';
