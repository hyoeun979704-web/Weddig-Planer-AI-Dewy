-- 웨딩플래너는 이 앱의 핵심 제품(AI 플래너)이므로 vendor 카테고리에서 제외.
-- place_planners 테이블은 Supabase Studio 대시보드에서 이미 삭제됨 (마이그레이션
-- 히스토리에 CREATE 흔적 없음). 이 파일은 신규 환경/CI에서 정합성 보장용.
DROP TABLE IF EXISTS public.place_planners;
