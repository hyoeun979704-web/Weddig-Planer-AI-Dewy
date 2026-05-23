-- 페르소나 검토 P0 #4 — 후기 광고/협찬/검증 라벨링.
-- 기존 is_verified(boolean)만으로는 P3·P13·P18 페르소나의 "광고·협찬 후기 분간 어려움"
-- 페인을 해소 못 함. source_type enum 컬럼 추가:
--   user_verified  : 사용자 후기 + 운영자 검증 완료(기존 is_verified=true 매핑)
--   user_unverified: 사용자 후기, 미검증
--   editor         : DEWY 에디터/큐레이터 직접 작성
--   partner        : 업체 자체 제공(체험단·협찬 가능)
--   promotional    : 명확한 광고/유료 콘텐츠
--
-- 폴백: 기존 행은 is_verified 값에 따라 user_verified / user_unverified 로 백필.

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS source_type TEXT;

ALTER TABLE public.place_reviews
  DROP CONSTRAINT IF EXISTS place_reviews_source_type_check;
ALTER TABLE public.place_reviews
  ADD CONSTRAINT place_reviews_source_type_check
  CHECK (source_type IS NULL OR source_type IN (
    'user_verified', 'user_unverified', 'editor', 'partner', 'promotional'
  ));

-- 백필 — is_verified=true 면 user_verified, false/NULL이면 user_unverified.
-- editor/partner/promotional 은 운영자가 명시적으로 지정해야 한다.
UPDATE public.place_reviews
SET source_type = CASE
  WHEN is_verified = TRUE THEN 'user_verified'
  ELSE 'user_unverified'
END
WHERE source_type IS NULL;

COMMENT ON COLUMN public.place_reviews.source_type IS
  '후기 출처 분류 — user_verified/user_unverified/editor/partner/promotional. P3·P13·P18 페르소나의 광고·협찬 분간을 지원.';
