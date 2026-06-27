-- ============================================================================
-- 블로그 원고 — AI 생성 파이프라인 메타데이터 컬럼
-- ============================================================================
--
-- blog-draft-generator edge function 이 채우는 컬럼들.
-- 파이프라인(2단계 Gemini, google_search 그라운딩):
--   ① 자료조사 + 신뢰성 검증(적대적 자가검증) → 출처 인용(sources)
--   ② wp_aio 작성(페르소나×AIO) + 자가 분석(analysis)
--
-- 인스타 instagram_post_drafts.caption_analysis 패턴을 블로그로 미러.
-- ============================================================================

ALTER TABLE public.blog_post_drafts
  -- 자가 분석(점수·AIO 체크칩·키워드·메모). 인스타 caption_analysis 와 동형.
  ADD COLUMN IF NOT EXISTS analysis JSONB,
  -- 자료조사 출처(그라운딩) — [{ title, url }]. 신뢰성 근거.
  ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 독자 페르소나(wedding-intel §4 mp_*). 빈 신호면 mp_general.
  ADD COLUMN IF NOT EXISTS reader_persona TEXT,
  -- 주제 앵글(wedding-intel §5, 예: "스드메 호구 안 되는 비교법").
  ADD COLUMN IF NOT EXISTS angle TEXT,
  -- 생성 모델 식별자(추적용).
  ADD COLUMN IF NOT EXISTS model TEXT,
  -- 생성 시각.
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.blog_post_drafts.analysis IS
  'AI 자가 분석 {score, checks{tldr·question_headings·faq·scannability·persona·no_fabrication}, keywords[], notes}';
COMMENT ON COLUMN public.blog_post_drafts.sources IS
  '자료조사 그라운딩 출처 [{title, url}] — 신뢰성 근거(지어내기 방지)';
