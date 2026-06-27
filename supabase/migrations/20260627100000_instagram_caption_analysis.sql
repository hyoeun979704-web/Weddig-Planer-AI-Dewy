-- 캡션 IG-로직 자가 점검 결과 저장(운영자 후작업 최소화).
-- instagram-draft-generator 가 캡션 생성 시 함께 채움: { score, checks{...}, keywords[], notes }.
ALTER TABLE public.instagram_post_drafts
  ADD COLUMN IF NOT EXISTS caption_analysis JSONB;

COMMENT ON COLUMN public.instagram_post_drafts.caption_analysis IS
  '캡션 인스타 도달 로직 자가 점검(hook·seo·fold·save/share/comment CTA·tone). 운영자 검수 가이드.';
