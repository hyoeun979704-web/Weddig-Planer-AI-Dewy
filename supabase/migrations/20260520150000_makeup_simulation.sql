-- 메이크업 시뮬레이션: 카탈로그 + 시뮬레이션 결과 + Storage
-- "방구석 드레스 투어" 와 같은 방식의 신부 메이크업 미리보기 서비스.
-- 사용자가 메이크업 카탈로그에서 한 가지를 선택 → 본인 사진과 AI 합성.
--
-- 구조는 dress_samples / dress_fittings 와 1:1 대응이므로 운영·어드민
-- 도구를 그대로 확장할 수 있다 (열 이름·status 값·heart 비용 동일).

-- ============================================================================
-- 1. makeup_samples 테이블 (메이크업 룩 카탈로그)
-- ============================================================================
CREATE TABLE public.makeup_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- 메이크업 10축 (한국 신부 메이크업 도메인)
  base_finish TEXT,         -- DEWY | GLOWY | SATIN | MATTE | NATURAL_SKIN
  lip_color TEXT,           -- NUDE | CORAL | ROSE | RED | BERRY | MAUVE | PEACH | MLBB
  lip_finish TEXT,          -- GLOSSY | MATTE | SATIN | BLURRED | TINTED
  eye_style TEXT,           -- BARE | NATURAL | SMOKY | GLITTER | CAT_EYE | KOREAN_INNER | DOLL
  eye_color TEXT,           -- PEACH | ROSE_BROWN | BROWN | BURGUNDY | BRONZE | PLUM | NEUTRAL
  blush_color TEXT,         -- PEACH | PINK | CORAL | ROSE | NUDE | NONE
  blush_placement TEXT,     -- APPLE | UNDER_EYE | OUTER_CHEEK | DRAPED | NONE
  brow_shape TEXT,          -- KOREAN_STRAIGHT | SOFT_ARCH | NATURAL_FLAT | FEATHERY | DEFINED
  contour_intensity TEXT,   -- NONE | SUBTLE | NATURAL | DEFINED
  details TEXT[] DEFAULT '{}',  -- HIGHLIGHT, INNER_CORNER, FAUX_FRECKLE, GLITTER_TEAR, OMBRE_LIP
  mood TEXT[] DEFAULT '{}',     -- SOFT_KOREAN, ETHEREAL, GLAMOROUS, FRESH_NATURAL, CLASSIC, ROMANTIC

  -- 메타
  source TEXT,
  license_status TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_makeup_samples_active
  ON public.makeup_samples(is_active, display_order DESC)
  WHERE is_active = TRUE;
CREATE INDEX idx_makeup_samples_base ON public.makeup_samples(base_finish);
CREATE INDEX idx_makeup_samples_lip_color ON public.makeup_samples(lip_color);
CREATE INDEX idx_makeup_samples_eye_style ON public.makeup_samples(eye_style);
CREATE INDEX idx_makeup_samples_eye_color ON public.makeup_samples(eye_color);
CREATE INDEX idx_makeup_samples_brow ON public.makeup_samples(brow_shape);
CREATE INDEX idx_makeup_samples_details ON public.makeup_samples USING GIN (details);
CREATE INDEX idx_makeup_samples_mood ON public.makeup_samples USING GIN (mood);

ALTER TABLE public.makeup_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active makeup samples"
ON public.makeup_samples FOR SELECT
USING (is_active = TRUE);

-- 어드민 정책 — has_role('admin') 사용자에게만 쓰기 허용
CREATE POLICY "Admins can insert makeup samples"
ON public.makeup_samples FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update makeup samples"
ON public.makeup_samples FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete makeup samples"
ON public.makeup_samples FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_makeup_samples_updated_at
BEFORE UPDATE ON public.makeup_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. makeup_fittings 테이블 (사용자 시뮬레이션 결과)
-- ============================================================================
CREATE TABLE public.makeup_fittings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_image_path TEXT NOT NULL,
  result_image_path TEXT,
  selected_sample_id UUID REFERENCES public.makeup_samples(id),
  thumbnail_path TEXT,
  prompt_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  hearts_spent INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','done','failed','refunded')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_makeup_fittings_user_created
  ON public.makeup_fittings(user_id, created_at DESC);
CREATE INDEX idx_makeup_fittings_pending
  ON public.makeup_fittings(status) WHERE status = 'pending';
CREATE INDEX idx_makeup_fittings_sample
  ON public.makeup_fittings(selected_sample_id);

ALTER TABLE public.makeup_fittings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own makeup fittings"
ON public.makeup_fittings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own makeup fittings"
ON public.makeup_fittings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 결과 갱신·실패 처리는 service_role Edge Function 에서만 수행

CREATE TRIGGER update_makeup_fittings_updated_at
BEFORE UPDATE ON public.makeup_fittings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. Storage 버킷
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'makeup-samples', 'makeup-samples', TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'makeup-uploads', 'makeup-uploads', FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'makeup-results', 'makeup-results', FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Storage RLS 정책 (드레스와 같은 패턴)
-- ============================================================================

CREATE POLICY "makeup_samples_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'makeup-samples');

CREATE POLICY "makeup_uploads_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'makeup-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "makeup_uploads_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'makeup-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "makeup_uploads_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'makeup-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "makeup_results_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'makeup-results'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "makeup_results_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'makeup-results'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 5. spend_hearts / earn_hearts 이유 코드
-- ============================================================================
-- spend_hearts(reason: 'makeup_fitting') / earn_hearts(reason: 'refund_failed_makeup')
-- 별도 enum 이 없으므로 자유 텍스트 사용. heart_transactions.reason 으로 추적.
COMMENT ON TABLE public.makeup_fittings IS
  '메이크업 시뮬레이션 결과. hearts_spent = 5 / spend_hearts(reason="makeup_fitting").';
