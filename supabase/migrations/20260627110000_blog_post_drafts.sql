-- ============================================================================
-- 블로그 원고 — 워드프레스 발행 큐 (blog_post_drafts)
-- ============================================================================
--
-- 마케팅 파이프라인 ②워드프레스 발행용. marketing-draft 스킬의 wp_aio 산출물
-- (TL;DR·FAQ·canonical 포함 본문)을 이 테이블에 적재해 운영자가 검수한 뒤,
-- 어드민에서 마크다운/HTML 을 복사해 워드프레스에 직접 게시하고 발행 결과를 기록한다
-- (카드뉴스와 동일한 수동 흐름 — 자격증명 없이 운용. 자동 REST 발행은 미사용).
--
-- 흐름(검수→발행):
--   draft      — 작성/적재됨, 아직 검수 안 함
--   review     — 운영자 검수 중
--   publishing — (예약) 전이 상태. 현재 수동 흐름에선 미사용
--   published  — 운영자가 워드프레스에 게시 완료로 표시(wp_url 기록)
--   failed     — (예약) 실패 상태. 현재 수동 흐름에선 미사용
--
-- wp_* 컬럼으로 워드프레스 발행 결과를 분리 기록한다(수동 흐름에선 wp_url·wp_status·
-- wp_published_at 사용. wp_post_id·wp_featured_media_id 는 향후 자동 발행 대비 예약 컬럼).
--
-- 운영자(admin)만 read/write. 사용자 데이터 아님 — 마케팅 운영 테이블.
-- instagram_post_drafts 와 동일 RLS·트리거 패턴.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_post_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 콘텐츠(wp_aio 산출물)
  title TEXT NOT NULL,                       -- 글 제목(WP post title)
  slug TEXT,                                 -- URL 슬러그(비우면 WP 가 제목에서 생성)
  content_markdown TEXT,                     -- 본문(Markdown) — 발행 시 HTML 로 변환
  excerpt TEXT,                              -- 요약(TL;DR) → WP excerpt
  canonical_url TEXT,                        -- 원본 canonical(네이버 등 선게시 시 중복 SEO 회피)
  featured_image_url TEXT,                   -- 대표 이미지 원본 URL(공개) → WP media 업로드
  categories TEXT[] NOT NULL DEFAULT '{}',   -- 카테고리 이름(발행 시 term id 로 해석/생성)
  tags TEXT[] NOT NULL DEFAULT '{}',         -- 태그 이름(발행 시 term id 로 해석/생성)

  -- 출처/저자
  author_persona TEXT NOT NULL DEFAULT 'brand'   -- 화자(content-distribution §0)
    CHECK (author_persona IN ('me', 'brand')),
  source_type TEXT NOT NULL DEFAULT 'manual',    -- 'manual' | 'blog_core' | 'notion'
  source_id TEXT,                                -- blog_core 슬러그 등 연결 키
  notion_page_id TEXT,                           -- 노션 원고 페이지(연동 시)

  -- 라이프사이클(Dewy 내부)
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'publishing', 'published', 'failed')),

  -- 워드프레스 발행 결과(부분 상태 추적)
  wp_post_id BIGINT,                         -- WP 글 id(재발행 시 PUT 갱신 키)
  wp_url TEXT,                               -- 발행된 글 permalink(link)
  wp_status TEXT                             -- WP 쪽 실제 상태
    CHECK (wp_status IS NULL OR wp_status IN ('draft', 'publish')),
  wp_featured_media_id BIGINT,               -- WP media id(featured_media, 재업로드 방지)
  wp_published_at TIMESTAMPTZ,               -- 발행 시각

  -- 추적
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,

  -- 감사
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 목록/큐 정렬: 상태 + 최신순
CREATE INDEX IF NOT EXISTS idx_blog_post_drafts_status_created
  ON public.blog_post_drafts(status, created_at DESC);

-- RLS: admin 만 전체 권한 (instagram_post_drafts 와 동일 패턴)
ALTER TABLE public.blog_post_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage blog post drafts" ON public.blog_post_drafts;
CREATE POLICY "Admins manage blog post drafts"
  ON public.blog_post_drafts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 자동 updated_at
DROP TRIGGER IF EXISTS update_blog_post_drafts_updated_at ON public.blog_post_drafts;
CREATE TRIGGER update_blog_post_drafts_updated_at
  BEFORE UPDATE ON public.blog_post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.blog_post_drafts IS
  'Dewy 블로그 원고 — 워드프레스 발행 큐. marketing-draft wp_aio 적재 → 검수 → wordpress-publisher 발행.';
