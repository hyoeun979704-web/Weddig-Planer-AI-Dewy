-- 드레스 샘플 카탈로그 + Storage 버킷
-- "방구석 드레스 투어" 서비스의 마네킹 드레스 샘플 이미지 카탈로그.
-- 사용자가 10축 필터로 마네킹 드레스를 선택 → 본인 사진과 AI 합성.

-- ============================================================================
-- 1. dress_samples 테이블 (마네킹 드레스 카탈로그)
-- ============================================================================
CREATE TABLE public.dress_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,           -- 마네킹 드레스 이미지 (Storage 또는 외부)
  thumbnail_url TEXT,                -- 그리드용 작은 썸네일 (선택)

  -- 10축 필터 (중요도 순)
  silhouette TEXT,                   -- A_LINE | MERMAID | BALL | EMPIRE | SHEATH | TRUMPET
  neckline TEXT,                     -- V | SWEETHEART | OFF_SHOULDER | HALTER | BOAT | SQUARE | ILLUSION
  sleeve TEXT,                       -- SLEEVELESS | CAP | SHORT | LONG | OFF_SHOULDER | CAPE
  length TEXT,                       -- MINI | MIDI | FULL | SHORT_TRAIN | CHAPEL | CATHEDRAL
  fabric TEXT,                       -- SILK | LACE | TULLE | CHIFFON | ORGANZA | MIKADO
  details TEXT[] DEFAULT '{}',       -- 복수 가능: MINIMAL, LACE, BEADING, EMBROIDERY, FLORAL, HANDWORK
  back_design TEXT,                  -- CLOSED | ILLUSION | OPEN | KEYHOLE | V_BACK | CORSET
  color TEXT,                        -- PURE_WHITE | IVORY | BLUSH | CHAMPAGNE | NUDE
  waist TEXT,                        -- NATURAL | EMPIRE | DROPPED | NONE
  mood TEXT[] DEFAULT '{}',          -- 복수 가능: CLASSIC, MODERN, BOHEMIAN, VINTAGE, MINIMAL, ROMANTIC

  -- 메타
  source TEXT,                       -- 'ai_generated' | 'unsplash' | 'partner_xxx' | 'self_shot'
  license_status TEXT,               -- 'cc0' | 'licensed' | 'self_generated' | 'partner_grant'
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스 (필터 성능)
CREATE INDEX idx_dress_samples_active
  ON public.dress_samples(is_active, display_order DESC)
  WHERE is_active = TRUE;
CREATE INDEX idx_dress_samples_silhouette ON public.dress_samples(silhouette);
CREATE INDEX idx_dress_samples_neckline ON public.dress_samples(neckline);
CREATE INDEX idx_dress_samples_sleeve ON public.dress_samples(sleeve);
CREATE INDEX idx_dress_samples_length ON public.dress_samples(length);
CREATE INDEX idx_dress_samples_color ON public.dress_samples(color);
CREATE INDEX idx_dress_samples_back ON public.dress_samples(back_design);

-- 배열 필드 GIN 인덱스 (multi-select 필터)
CREATE INDEX idx_dress_samples_details ON public.dress_samples USING GIN (details);
CREATE INDEX idx_dress_samples_mood ON public.dress_samples USING GIN (mood);

-- RLS: 활성 샘플은 누구나 조회 가능
ALTER TABLE public.dress_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dress samples"
ON public.dress_samples FOR SELECT
USING (is_active = TRUE);

-- INSERT/UPDATE/DELETE는 service_role만 (어드민 전용)

-- updated_at 자동 갱신
CREATE TRIGGER update_dress_samples_updated_at
BEFORE UPDATE ON public.dress_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. Storage 버킷
-- ============================================================================

-- 드레스 마네킹 샘플 (public 읽기, service_role 쓰기)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dress-samples',
  'dress-samples',
  TRUE,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 사용자 업로드 사진 (private, 본인만 접근)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dress-uploads',
  'dress-uploads',
  FALSE,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 드레스 피팅 결과 (private, 본인만 접근)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dress-results',
  'dress-results',
  FALSE,
  10485760,  -- 10MB (생성 이미지가 더 큼)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Storage RLS 정책
-- ============================================================================

-- 드레스 샘플: 모두 조회 가능
CREATE POLICY "dress_samples_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'dress-samples');

-- 사용자 업로드: 본인 폴더만 (auth.uid()/filename.jpg 형식)
CREATE POLICY "dress_uploads_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dress-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dress_uploads_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dress-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dress_uploads_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dress-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 드레스 결과: 본인 결과만 조회 가능 (Edge Function이 service_role로 INSERT)
CREATE POLICY "dress_results_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dress-results'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dress_results_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dress-results'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 4. dress_fittings 테이블 보강 (selected_sample_id 컬럼 추가)
-- ============================================================================

ALTER TABLE public.dress_fittings
  ADD COLUMN IF NOT EXISTS selected_sample_id UUID REFERENCES public.dress_samples(id),
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

CREATE INDEX IF NOT EXISTS idx_dress_fittings_sample
  ON public.dress_fittings(selected_sample_id);

COMMENT ON COLUMN public.dress_fittings.selected_sample_id IS
  '사용자가 선택한 마네킹 드레스 샘플 ID. AI 합성 시 reference 이미지로 사용.';
