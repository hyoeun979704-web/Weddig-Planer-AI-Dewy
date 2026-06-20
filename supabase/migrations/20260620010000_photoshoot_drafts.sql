-- 웨딩촬영 시안 — 잡 큐(컨셉 + 컷×8) + Storage.
-- 30분 비동기라 단일 엣지함수로 못 돌린다 → drafts/cuts row 를 먼저 만들고,
-- 워커(별도 함수, 후속 마이그레이션에서 pg_cron 연결)가 pending cut 을 1개씩 처리한다.
-- 설계: docs/260620_wedding_photoshoot_draft_plan.md

-- ============================================================================
-- 1. photoshoot_drafts (컨셉 단위)
-- ============================================================================
CREATE TABLE public.photoshoot_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 입력 사진 경로(photoshoot-uploads/{userId}/...)
  bride_look_path TEXT NOT NULL,     -- 헤어·메이크업 완료
  bride_dress_path TEXT NOT NULL,    -- 드레스 착용
  groom_hair_path TEXT,              -- 헤어 셋팅 (P2 커플/신랑 컷에 필요)
  groom_suit_path TEXT,              -- 슈트 착용
  -- 텍스트화된 컨텍스트
  scene_text TEXT,
  props_text TEXT,
  refs_text TEXT,                    -- 레퍼런스 vision 분석 결과
  pdf_paths TEXT[] DEFAULT '{}',     -- 완료 시 PDF 2장
  hearts_spent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed','refunded')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_photoshoot_drafts_user_created
  ON public.photoshoot_drafts(user_id, created_at DESC);

ALTER TABLE public.photoshoot_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own photoshoot drafts"
ON public.photoshoot_drafts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own photoshoot drafts"
ON public.photoshoot_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_photoshoot_drafts_updated_at
BEFORE UPDATE ON public.photoshoot_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. photoshoot_draft_cuts (컷 단위 — 컨셉당 최대 8행, 워커가 1개씩 처리)
-- ============================================================================
CREATE TABLE public.photoshoot_draft_cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.photoshoot_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cut_index INTEGER NOT NULL,        -- 1~8 (photoshootPrompt.CUT_PLAN)
  subject TEXT NOT NULL,             -- bride | groom | couple_person | couple_scene
  framing TEXT NOT NULL,             -- full | bust
  prompt TEXT NOT NULL,
  result_path TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (draft_id, cut_index)
);

-- 워커가 빠르게 다음 작업을 집기 위한 인덱스.
CREATE INDEX idx_photoshoot_cuts_pending
  ON public.photoshoot_draft_cuts(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_photoshoot_cuts_draft ON public.photoshoot_draft_cuts(draft_id);

ALTER TABLE public.photoshoot_draft_cuts ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 컷 조회만(진행률 표시). 생성/갱신은 service_role 워커.
CREATE POLICY "Users view own photoshoot cuts"
ON public.photoshoot_draft_cuts FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_photoshoot_cuts_updated_at
BEFORE UPDATE ON public.photoshoot_draft_cuts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. Storage 버킷 + RLS (본인 폴더만)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photoshoot-uploads', 'photoshoot-uploads', FALSE, 20971520,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photoshoot-results', 'photoshoot-results', FALSE, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photoshoot_uploads_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photoshoot-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "photoshoot_uploads_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photoshoot-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "photoshoot_uploads_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photoshoot-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "photoshoot_results_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photoshoot-results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "photoshoot_results_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photoshoot-results' AND auth.uid()::text = (storage.foldername(name))[1]);

COMMENT ON TABLE public.photoshoot_drafts IS
  '웨딩촬영 시안 컨셉. 컷은 photoshoot_draft_cuts, 워커가 1개씩 high 생성. 설계: docs/260620_wedding_photoshoot_draft_plan.md';
