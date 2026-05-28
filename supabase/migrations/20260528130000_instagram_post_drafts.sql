-- ============================================================================
-- Instagram 카드뉴스 발행 파이프라인 — 1단계: 초안 스키마
-- ============================================================================
--
-- 라이프사이클:
--   draft       — AI 또는 운영자가 만든 초안 (편집 가능)
--   approved    — 운영자 검토 완료, 발행 대기
--   scheduled   — 예약 발행 큐에 들어감 (scheduled_for 설정됨)
--   publishing  — instagram-publisher edge function 이 처리 중 (락)
--   published   — IG Graph API 발행 성공
--   failed      — 발행 실패 (last_error 기록)
--
-- 운영자(admin)만 read/write. 사용자 데이터 아님 — 마케팅 운영 테이블.
-- ============================================================================

CREATE TABLE public.instagram_post_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 콘텐츠 메타
  topic TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
    -- 'manual' | 'tip_blog' | 'tip_instagram' | 'tip_video'
    -- | 'partner_deal' | 'promotional_event' | 'place' | 'season'
  source_id UUID,
    -- 원본 row 의 PK (옵셔널, FK 안 검 — 소스 테이블이 다양해서)

  -- 생성된 콘텐츠
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  card_count INTEGER NOT NULL DEFAULT 0,
  card_image_urls TEXT[] NOT NULL DEFAULT '{}',
    -- Supabase Storage 의 public URL 순서대로
  card_texts JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- [{ "title": "...", "body": "...", "footer": "..." }, ...]
    -- 카드 재렌더링·편집에 사용

  -- 라이프사이클
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_permalink TEXT,
  published_media_id TEXT,

  -- 에러 추적
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- 감사
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 운영 쿼리: 상태별 목록, 예약 발행 큐 픽업
CREATE INDEX idx_ig_drafts_status_created
  ON public.instagram_post_drafts(status, created_at DESC);
CREATE INDEX idx_ig_drafts_scheduled_for
  ON public.instagram_post_drafts(scheduled_for)
  WHERE status = 'scheduled';

-- RLS: admin 만 전체 권한
ALTER TABLE public.instagram_post_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage instagram post drafts"
  ON public.instagram_post_drafts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 자동 updated_at
CREATE TRIGGER update_instagram_post_drafts_updated_at
  BEFORE UPDATE ON public.instagram_post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.instagram_post_drafts IS
  'Dewy 공식 인스타그램 카드뉴스 발행 파이프라인 — 초안/예약/발행 결과 통합 관리.';
