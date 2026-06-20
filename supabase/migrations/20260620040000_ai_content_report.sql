-- AI 생성물 인앱 신고(생성형 AI 정책): community_reports 가 AI 결과 신고도 받도록 target_type 확장.
-- 추가형(허용값 1개 추가) — 기존 'post'/'comment' 행에 영향 없음. RLS INSERT 정책(reporter=auth.uid())은
-- 타입 무관이라 ai_content 신고도 동일하게 통과한다.

ALTER TABLE public.community_reports DROP CONSTRAINT IF EXISTS community_reports_target_type_check;
ALTER TABLE public.community_reports
  ADD CONSTRAINT community_reports_target_type_check
  CHECK (target_type IN ('post', 'comment', 'ai_content'));
