-- 스드메 미리보기(합본): 장소+메이크업+헤어+드레스를 한 번에 합성한 결과.
-- 구조는 dress_fittings / makeup_fittings 와 1:1 대응(운영·어드민·정리 잡 그대로 확장).
-- 카탈로그는 신설하지 않고 기존 dress_samples/makeup_samples/hair_samples + fittingScenes 재사용.

-- ============================================================================
-- 1. sdm_previews 테이블 (사용자 합본 결과)
-- ============================================================================
CREATE TABLE public.sdm_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_image_path TEXT NOT NULL,
  result_image_path TEXT,
  -- 선택 요소 추적(어떤 드레스 샘플을 썼나 등). makeup/hair 는 현재 텍스트라 prompt_params 에.
  selected_dress_id UUID REFERENCES public.dress_samples(id),
  thumbnail_path TEXT,
  -- { scene_code, hair_style, makeup_summary, reference_mode } 등.
  prompt_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  hearts_spent INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','done','failed','refunded')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sdm_previews_user_created
  ON public.sdm_previews(user_id, created_at DESC);
CREATE INDEX idx_sdm_previews_pending
  ON public.sdm_previews(status) WHERE status = 'pending';

ALTER TABLE public.sdm_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sdm previews"
ON public.sdm_previews FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sdm previews"
ON public.sdm_previews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 결과 갱신·실패 처리는 service_role Edge Function 에서만 수행.

CREATE TRIGGER update_sdm_previews_updated_at
BEFORE UPDATE ON public.sdm_previews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. Storage 버킷 (드레스/메이크업과 같은 패턴)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sdm-uploads', 'sdm-uploads', FALSE, 20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sdm-results', 'sdm-results', FALSE, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Storage RLS — 본인 폴더(userId/...)만 read/write.
-- ============================================================================
CREATE POLICY "sdm_uploads_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sdm-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "sdm_uploads_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sdm-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "sdm_uploads_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sdm-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "sdm_results_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sdm-results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "sdm_results_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sdm-results' AND auth.uid()::text = (storage.foldername(name))[1]);

COMMENT ON TABLE public.sdm_previews IS
  '스드메 합본 미리보기 결과. hearts_spent=10 / spend_hearts(reason="sdm_preview").';
