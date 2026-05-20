-- PIPA 동의 기록 — 사용자가 어떤 정보 수집·이용에 동의했는지 추적.
--
-- consent_type 으로 동의 종류 분리:
--   'data_collection_v1' — 결혼 정보·예산·일정·AI 플래너 입력 등
--                          서비스 이용 핵심 데이터 수집 동의
--   (향후) 'marketing_v1', 'analytics_v1' 등
--
-- consent_version 으로 동의서 본문이 바뀐 경우 재동의 요청 가능.
-- 동의·거부 모두 row 로 기록 (PIPA 요구 — 처리 이력 보존).
-- 같은 user + consent_type 의 가장 최근 row 가 현재 상태.

CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_version INT NOT NULL DEFAULT 1,
  agreed BOOLEAN NOT NULL,
  agreed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  notes TEXT
);

CREATE INDEX idx_user_consents_user_type_latest
  ON public.user_consents(user_id, consent_type, agreed_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consents"
ON public.user_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consents"
ON public.user_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 동의 row 는 수정·삭제 불가 (PIPA — 이력 보존).
-- 재동의·동의 철회는 새 row INSERT 로 처리.

COMMENT ON TABLE public.user_consents IS
  'PIPA 동의 이력. 같은 user + consent_type 의 최신 row 가 현재 상태.';
COMMENT ON COLUMN public.user_consents.consent_type IS
  'data_collection_v1 / marketing_v1 등';
COMMENT ON COLUMN public.user_consents.agreed IS
  'TRUE=동의, FALSE=거부 또는 철회';
