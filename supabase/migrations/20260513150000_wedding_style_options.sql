-- Adds wedding_style preset + excluded_categories to user_wedding_settings.
-- Lets users mark certain prep categories (studio, makeup, hanbok, etc.) as
-- skipped, e.g. for small/self-wedding flows. Schedule items in skipped
-- categories are still stored but hidden from the schedule/checklist UI.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS wedding_style TEXT,
  ADD COLUMN IF NOT EXISTS excluded_categories TEXT[] NOT NULL DEFAULT '{}'::text[];

-- Constrain wedding_style to known presets (NULL = not chosen / 'general'
-- treatment). Drop-and-recreate so re-running the migration is safe.
ALTER TABLE public.user_wedding_settings
  DROP CONSTRAINT IF EXISTS user_wedding_settings_wedding_style_check;

ALTER TABLE public.user_wedding_settings
  ADD CONSTRAINT user_wedding_settings_wedding_style_check
  CHECK (wedding_style IS NULL OR wedding_style IN ('general', 'small', 'self', 'custom'));

COMMENT ON COLUMN public.user_wedding_settings.wedding_style IS
  '결혼 스타일 프리셋: general(일반) | small(스몰웨딩) | self(셀프웨딩) | custom(직접 선택). NULL이면 미설정.';

COMMENT ON COLUMN public.user_wedding_settings.excluded_categories IS
  '사용자가 제외한 체크리스트 카테고리 (예: studio, makeup_shop, hanbok). 빈 배열 = 제외 없음.';
