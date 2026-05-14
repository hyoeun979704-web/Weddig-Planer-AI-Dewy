-- community_posts 에 결혼 스타일 태그 추가
-- general(일반) / small(스몰웨딩) / self(셀프웨딩) / NULL(미지정)
-- 같은 스타일의 부부끼리 글을 묶어볼 수 있도록 함.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS wedding_style TEXT;

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_wedding_style_check;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_wedding_style_check
  CHECK (wedding_style IS NULL OR wedding_style IN ('general', 'small', 'self'));

COMMENT ON COLUMN public.community_posts.wedding_style IS
  '게시글이 다루는 결혼 유형: general(일반) | small(스몰웨딩) | self(셀프웨딩). NULL = 미지정/공통.';

CREATE INDEX IF NOT EXISTS community_posts_wedding_style_idx
  ON public.community_posts (wedding_style);

-- 샘플 데이터 백필: 카테고리·내용으로 유추.
UPDATE public.community_posts
SET wedding_style = 'general'
WHERE wedding_style IS NULL
  AND category IN ('웨딩홀', '스드메', '혼수', '허니문');
