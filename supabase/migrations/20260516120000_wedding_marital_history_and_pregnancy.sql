-- Adds marital_history + pregnant flags to user_wedding_settings.
-- Drives onboarding-modal nuance and AI Planner context: 재혼/임신 케이스는
-- 체크리스트 추천(예: 한복 권유 톤)과 AI 답변 톤이 달라야 한다.
--
-- 두 컬럼 모두 옵셔널 — 기존 사용자 행에는 NULL/false로 시드. 모달에서
-- "선택" 표기, 미입력 시 AI 컨텍스트에서 생략된다.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS marital_history TEXT,
  ADD COLUMN IF NOT EXISTS pregnant BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_wedding_settings
  DROP CONSTRAINT IF EXISTS user_wedding_settings_marital_history_check;

ALTER TABLE public.user_wedding_settings
  ADD CONSTRAINT user_wedding_settings_marital_history_check
  CHECK (marital_history IS NULL OR marital_history IN ('first', 'remarriage'));

COMMENT ON COLUMN public.user_wedding_settings.marital_history IS
  '결혼 차수: first(초혼) | remarriage(재혼). NULL = 미선택.';

COMMENT ON COLUMN public.user_wedding_settings.pregnant IS
  '신부 임신 여부. true일 때 체크리스트 우선순위와 AI 답변 톤을 조정.';
