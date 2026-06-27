-- ============================================================================
-- 블로그 — 자체 /blog 공개 발행 (Phase 1)
-- ============================================================================
--
-- 발행(status='published')된 글을 dewy-wedding.com/blog/<slug> 로 공개한다.
-- - SSR(api/blog.ts) 과 사용자 React 페이지가 anon 키로 읽을 수 있게 공개 SELECT 정책 추가.
-- - content_html: 발행 시점에 렌더된 HTML(react-markdown innerHTML)을 저장 → SSR 이 서버에서
--   마크다운을 다시 파싱하지 않고 그대로 주입(엣지 함수 의존성 0, 본문 일관성).
-- ============================================================================

-- 발행글 공개 읽기(anon·authenticated). 초안/검수 글은 기존 admin 정책으로만 접근(비공개 유지).
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_post_drafts;
CREATE POLICY "Public can read published blog posts"
  ON public.blog_post_drafts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- 발행 시점 렌더 HTML(SSR 주입용). 마크다운이 진실원천, 이건 발행 스냅샷.
ALTER TABLE public.blog_post_drafts
  ADD COLUMN IF NOT EXISTS content_html TEXT;

COMMENT ON COLUMN public.blog_post_drafts.content_html IS
  '발행 시 렌더된 HTML 스냅샷(react-markdown). SSR(api/blog.ts) 이 그대로 주입. 진실원천은 content_markdown.';
