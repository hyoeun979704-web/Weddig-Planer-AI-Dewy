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

-- vendor_id 자동 시퀀스
-- [FIX] START WITH를 고정값(10000) 대신 현재 MAX+1로 설정해 기존 데이터와 충돌 방지
DO $$
DECLARE
  next_val bigint;
BEGIN
  SELECT COALESCE(MAX(vendor_id), 0) + 1 INTO next_val FROM public.vendors;
  next_val := GREATEST(next_val, 10000); -- 최소 10000 보장

  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = 'vendors_vendor_id_seq'
  ) THEN
    EXECUTE format('CREATE SEQUENCE public.vendors_vendor_id_seq START WITH %s INCREMENT BY 1', next_val);
  END IF;
END $$;

-- [FIX] 시퀀스 소유권 설정 — 테이블 DROP 시 시퀀스도 함께 정리됨
ALTER SEQUENCE public.vendors_vendor_id_seq OWNED BY public.vendors.vendor_id;
ALTER TABLE public.vendors
  ALTER COLUMN vendor_id SET DEFAULT nextval('public.vendors_vendor_id_seq');

-- 3. 사업자 인증 정보 테이블
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id           integer     REFERENCES public.vendors(vendor_id) ON DELETE SET NULL,
  -- [FIX] 사업자등록번호 형식 검증: 숫자 10자리 (하이픈 제거 후 저장)
  business_number     text        NOT NULL CHECK (business_number ~ '^\d{10}$'),
  business_name       text        NOT NULL CHECK (length(trim(business_name)) > 0),
  ceo_name            text        NOT NULL CHECK (length(trim(ceo_name)) > 0),
  category_type       text        NOT NULL,
  verification_status text        NOT NULL DEFAULT 'pending'
                                  CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejection_reason    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 4. 업체 장점 카드 테이블 (최대 6개 권장)
CREATE TABLE IF NOT EXISTS public.vendor_advantage_cards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   integer     NOT NULL REFERENCES public.vendors(vendor_id) ON DELETE CASCADE,
  emoji       text        NOT NULL DEFAULT '⭐',
  title       text        NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 5. 업체 포토 갤러리 테이블 (최대 10개 권장)
CREATE TABLE IF NOT EXISTS public.vendor_gallery_images (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   integer     NOT NULL REFERENCES public.vendors(vendor_id) ON DELETE CASCADE,
  image_url   text        NOT NULL CHECK (length(trim(image_url)) > 0),
  caption     text,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- RLS 정책
-- =====================================================================

-- [FIX] vendors에 RLS가 활성화되지 않으면 정책이 동작하지 않음
-- 기존 마이그레이션에서 이미 활성화된 경우 중복 실행해도 안전
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_advantage_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_gallery_images ENABLE ROW LEVEL SECURITY;

-- ── business_profiles ──────────────────────────────────────────────
CREATE POLICY "본인 사업자 프로필 조회" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "본인 사업자 프로필 생성" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "본인 사업자 프로필 수정" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── vendor_advantage_cards ─────────────────────────────────────────
CREATE POLICY "장점 카드 공개 조회" ON public.vendor_advantage_cards
  FOR SELECT USING (true);

-- [FIX] WITH CHECK 명시 — INSERT 시에도 소유권 검증
CREATE POLICY "업체 소유자 장점 카드 관리" ON public.vendor_advantage_cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.vendor_id = vendor_advantage_cards.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.vendor_id = vendor_advantage_cards.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

-- ── vendor_gallery_images ──────────────────────────────────────────
CREATE POLICY "갤러리 이미지 공개 조회" ON public.vendor_gallery_images
  FOR SELECT USING (true);

-- [FIX] WITH CHECK 명시
CREATE POLICY "업체 소유자 갤러리 관리" ON public.vendor_gallery_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.vendor_id = vendor_gallery_images.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.vendor_id = vendor_gallery_images.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

-- ── vendors 소유자 정책 ────────────────────────────────────────────
-- CREATE OR REPLACE POLICY가 없으므로 IF NOT EXISTS 패턴 사용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vendors'
      AND policyname = '업체 소유자 수정'
  ) THEN
    CREATE POLICY "업체 소유자 수정" ON public.vendors
      FOR UPDATE
      USING (owner_user_id = auth.uid())
      WITH CHECK (owner_user_id = auth.uid()); -- [FIX] WITH CHECK 추가
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'vendors'
      AND policyname = '업체 소유자 신규 등록'
  ) THEN
    CREATE POLICY "업체 소유자 신규 등록" ON public.vendors
      FOR INSERT WITH CHECK (owner_user_id = auth.uid());
  END IF;
END $$;

-- =====================================================================
-- updated_at 자동 갱신 트리거
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER set_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 조회 성능 인덱스
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id
  ON public.business_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_vendors_owner_user_id
  ON public.vendors (owner_user_id)
  WHERE owner_user_id IS NOT NULL; -- 부분 인덱스: 기업 소유 업체만 인덱싱

CREATE INDEX IF NOT EXISTS idx_vendor_advantage_cards_vendor_id
  ON public.vendor_advantage_cards (vendor_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_vendor_gallery_images_vendor_id
  ON public.vendor_gallery_images (vendor_id, sort_order);
