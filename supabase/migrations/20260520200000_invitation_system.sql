-- 청첩장 인프라 (운영자 관리 카탈로그 + 사용자 청첩장 저장소).
--
-- 4개 테이블:
--   · invitation_templates  — 청첩장 템플릿 (디자인 시안 + 기본 레이아웃)
--   · invitation_assets     — 장식 에셋 (스티커·꽃·프레임 등)
--   · invitation_fonts      — 사용 가능한 폰트 목록
--   · invitations           — 사용자가 만든 청첩장
--
-- 4개 Storage 버킷:
--   · invitation-templates  — 템플릿 썸네일·프리뷰 (public)
--   · invitation-assets     — 장식 에셋 이미지 (public)
--   · invitation-fonts      — 폰트 파일 (.woff2 / .ttf, public)
--   · invitation-uploads    — 사용자 업로드 사진 (private, RLS)

-- ============================================================================
-- 1. invitation_templates
-- ============================================================================
CREATE TABLE public.invitation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  preview_url TEXT,                  -- 큰 미리보기 (선택)

  -- 매체: 모바일 청첩장 / 종이 청첩장 (PDF 출력)
  format TEXT NOT NULL DEFAULT 'mobile'
    CHECK (format IN ('mobile', 'paper')),

  -- 톤·무드 — 사용자가 첫 진입에서 톤만 고르면 그 톤 매칭 템플릿 노출
  tone TEXT NOT NULL,                -- ROMANTIC | MODERN | CLASSIC | MINIMAL | CUTE | LUXURY

  -- 가격 (하트). 0 = 무료. 가격대 가이드:
  --   · 종이: 0 (무료), 5 (누끼·복합), 15 (일러스트 변환·프리미엄)
  --   · 모바일: 0 (무료), 10 (누끼·복합), 20 (일러스트 변환·프리미엄)
  price_hearts INTEGER NOT NULL DEFAULT 0,

  -- 캔버스 기본 레이아웃 (JSON)
  --   { canvas: { w, h, bg }, slots: [{id, type, x, y, w, h, z, field,
  --     placeholder, ai_promptable, auto_cutout, auto_illustration,
  --     movable, resizable, editable_color, editable_font, locked, ...}] }
  -- 슬롯 type: text | image | asset | calendar | qr | map
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 기본 폰트 (선택)
  default_font_id UUID,

  -- AI 텍스트 생성 컨텍스트 (예: "따뜻한 봄 결혼식 인사말 톤")
  text_prompt_hint TEXT,

  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitation_templates_active
  ON public.invitation_templates(is_active, display_order DESC)
  WHERE is_active = TRUE;
CREATE INDEX idx_invitation_templates_tone ON public.invitation_templates(tone);
CREATE INDEX idx_invitation_templates_format ON public.invitation_templates(format);

ALTER TABLE public.invitation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active invitation templates"
ON public.invitation_templates FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admins can insert invitation templates"
ON public.invitation_templates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitation templates"
ON public.invitation_templates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitation templates"
ON public.invitation_templates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_invitation_templates_updated_at
BEFORE UPDATE ON public.invitation_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. invitation_assets (장식 에셋)
-- ============================================================================
CREATE TABLE public.invitation_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,           -- PNG 투명 배경 또는 SVG
  thumbnail_url TEXT,

  category TEXT NOT NULL,            -- FLOWER | FRAME | LINE | RIBBON | ICON | SHAPE | TEXT_STICKER
  tags TEXT[] DEFAULT '{}',          -- 검색용 태그
  /* 클라이언트에서 색상 변경 가능 여부 (단색 SVG/PNG 만 TRUE) */
  is_recolorable BOOLEAN NOT NULL DEFAULT FALSE,

  -- 자연 비율 — 캔버스에 떨어뜨릴 때 기본 크기 계산용
  natural_width INT,
  natural_height INT,

  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitation_assets_active
  ON public.invitation_assets(is_active, display_order DESC)
  WHERE is_active = TRUE;
CREATE INDEX idx_invitation_assets_category ON public.invitation_assets(category);
CREATE INDEX idx_invitation_assets_tags ON public.invitation_assets USING GIN (tags);

ALTER TABLE public.invitation_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active invitation assets"
ON public.invitation_assets FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admins can insert invitation assets"
ON public.invitation_assets FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitation assets"
ON public.invitation_assets FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitation assets"
ON public.invitation_assets FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_invitation_assets_updated_at
BEFORE UPDATE ON public.invitation_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. invitation_fonts
-- ============================================================================
CREATE TABLE public.invitation_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                -- UI 라벨 (예: "노토 산스 KR", "둥근모")
  family TEXT NOT NULL,              -- CSS font-family 식별자
  file_url TEXT NOT NULL,            -- .woff2 or .ttf URL
  preview_url TEXT,                  -- 폰트 미리보기 이미지

  category TEXT NOT NULL,            -- SERIF | SANS_SERIF | SCRIPT | DISPLAY | HANDWRITING
  weight TEXT NOT NULL DEFAULT '400',-- 100~900
  style TEXT NOT NULL DEFAULT 'normal',  -- normal | italic

  supports_korean BOOLEAN NOT NULL DEFAULT TRUE,
  license TEXT,                      -- 라이선스 메모 (예: "SIL Open Font License")

  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitation_fonts_active
  ON public.invitation_fonts(is_active, display_order DESC)
  WHERE is_active = TRUE;
CREATE INDEX idx_invitation_fonts_category ON public.invitation_fonts(category);

ALTER TABLE public.invitation_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active invitation fonts"
ON public.invitation_fonts FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admins can insert invitation fonts"
ON public.invitation_fonts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitation fonts"
ON public.invitation_fonts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitation fonts"
ON public.invitation_fonts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_invitation_fonts_updated_at
BEFORE UPDATE ON public.invitation_fonts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 템플릿이 폰트를 참조 — fonts 정의 이후에 FK 추가
ALTER TABLE public.invitation_templates
  ADD CONSTRAINT invitation_templates_default_font_fk
  FOREIGN KEY (default_font_id) REFERENCES public.invitation_fonts(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 4. invitations (사용자 청첩장)
-- ============================================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.invitation_templates(id) ON DELETE SET NULL,

  -- 사용자 입력 데이터 (이름·날짜·장소·연락처·계좌·인사말 등)
  user_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 편집된 캔버스 레이아웃 (텍스트·이미지·에셋 배치)
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- AI 가 1회 호출로 생성한 텍스트 (재호출 방지를 위해 캐시)
  ai_generated_text JSONB,

  -- 최종 렌더 미리보기 (선택)
  preview_image_path TEXT,

  -- 공유 슬러그 (URL: /i/{slug}) — published 일 때만 발급
  share_slug TEXT UNIQUE,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_user_created
  ON public.invitations(user_id, created_at DESC);
CREATE INDEX idx_invitations_slug
  ON public.invitations(share_slug)
  WHERE share_slug IS NOT NULL;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 본인 row 자유 접근
CREATE POLICY "Users can view their own invitations"
ON public.invitations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invitations"
ON public.invitations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invitations"
ON public.invitations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invitations"
ON public.invitations FOR DELETE
USING (auth.uid() = user_id);

-- 발행된 청첩장은 share_slug 를 알면 익명 SELECT 가능 (하객용)
CREATE POLICY "Published invitations are publicly viewable via slug"
ON public.invitations FOR SELECT
TO anon, authenticated
USING (status = 'published' AND share_slug IS NOT NULL);

CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. Storage 버킷
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invitation-templates', 'invitation-templates', TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invitation-assets', 'invitation-assets', TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invitation-fonts', 'invitation-fonts', TRUE,
  10485760,
  ARRAY[
    'font/woff2', 'font/woff', 'font/ttf', 'font/otf',
    'application/font-woff2', 'application/font-woff',
    'application/x-font-ttf', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invitation-uploads', 'invitation-uploads', FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. Storage RLS
-- ============================================================================

-- 카탈로그 3개 버킷: public read, admin write
CREATE POLICY "invitation_templates_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invitation-templates');

CREATE POLICY "invitation_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invitation-assets');

CREATE POLICY "invitation_fonts_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invitation-fonts');

-- 사용자 업로드: 본인 폴더 (auth.uid()/filename)
CREATE POLICY "invitation_uploads_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invitation-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "invitation_uploads_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invitation-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "invitation_uploads_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invitation-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
