-- =====================================================================
-- 기업회원 자체 등록 시스템
-- 1. profiles: user_type 컬럼 추가 (personal/business)
-- 2. vendors: description, tagline, owner_user_id 컬럼 추가 + 자동 ID 시퀀스
-- 3. business_profiles: 사업자 인증 정보 테이블
-- 4. vendor_advantage_cards: 업체 장점 카드 테이블
-- 5. vendor_gallery_images: 업체 포토 갤러리 테이블
-- =====================================================================

-- 1. profiles 테이블에 user_type 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'personal'
    CHECK (user_type IN ('personal', 'business'));

-- 2. vendors 테이블 확장
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- vendor_id 자동 생성 시퀀스 (기존 수동 입력 ID와 충돌 방지: 10000부터 시작)
CREATE SEQUENCE IF NOT EXISTS public.vendors_vendor_id_seq
  START WITH 10000
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER TABLE public.vendors
  ALTER COLUMN vendor_id SET DEFAULT nextval('public.vendors_vendor_id_seq');

-- 3. 사업자 인증 정보 테이블
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id      integer REFERENCES public.vendors(vendor_id) ON DELETE SET NULL,
  business_number text NOT NULL,          -- 사업자등록번호 (XXX-XX-XXXXX)
  business_name   text NOT NULL,          -- 상호명
  ceo_name        text NOT NULL,          -- 대표자명
  category_type   text NOT NULL,          -- 업체 카테고리
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. 업체 장점 카드 테이블 (최대 6개 권장)
CREATE TABLE IF NOT EXISTS public.vendor_advantage_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   integer NOT NULL REFERENCES public.vendors(vendor_id) ON DELETE CASCADE,
  emoji       text NOT NULL DEFAULT '⭐',
  title       text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 5. 업체 포토 갤러리 테이블 (최대 10개 권장)
CREATE TABLE IF NOT EXISTS public.vendor_gallery_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   integer NOT NULL REFERENCES public.vendors(vendor_id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  caption     text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- RLS 정책
-- =====================================================================

-- business_profiles
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 사업자 프로필 조회" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "본인 사업자 프로필 생성" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "본인 사업자 프로필 수정" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- vendor_advantage_cards
ALTER TABLE public.vendor_advantage_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "장점 카드 공개 조회" ON public.vendor_advantage_cards
  FOR SELECT USING (true);

CREATE POLICY "업체 소유자 장점 카드 관리" ON public.vendor_advantage_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.vendor_id = vendor_advantage_cards.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

-- vendor_gallery_images
ALTER TABLE public.vendor_gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "갤러리 이미지 공개 조회" ON public.vendor_gallery_images
  FOR SELECT USING (true);

CREATE POLICY "업체 소유자 갤러리 관리" ON public.vendor_gallery_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.vendor_id = vendor_gallery_images.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

-- vendors: 소유자 수정 권한
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendors' AND policyname = '업체 소유자 수정'
  ) THEN
    CREATE POLICY "업체 소유자 수정" ON public.vendors
      FOR UPDATE USING (owner_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendors' AND policyname = '업체 소유자 신규 등록'
  ) THEN
    CREATE POLICY "업체 소유자 신규 등록" ON public.vendors
      FOR INSERT WITH CHECK (owner_user_id = auth.uid());
  END IF;
END $$;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER set_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
