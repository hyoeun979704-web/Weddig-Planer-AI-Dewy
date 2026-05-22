-- 업체 쿠폰 — 운영자 검토 면제(요구사항). 업체가 직접 발행/관리하고 즉시 노출.
-- 새 테이블이라 RLS 직접 정의: 공개 읽기(유효 쿠폰) + 소유자 쓰기.
-- 다운로드 수 집계(대시보드)는 후속(coupon_downloads).

CREATE TABLE IF NOT EXISTS public.business_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  discount_text TEXT NOT NULL,        -- 예: "10%" / "5만원 할인"
  min_order_won INT,                  -- 최소 주문 금액(원)
  expires_at DATE,                    -- 만료일(없으면 무기한)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_coupons_place ON public.business_coupons(place_id);
CREATE INDEX IF NOT EXISTS idx_business_coupons_owner ON public.business_coupons(owner_user_id);

ALTER TABLE public.business_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
  ON public.business_coupons FOR SELECT USING (true);
CREATE POLICY "Owner can insert own coupons"
  ON public.business_coupons FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own coupons"
  ON public.business_coupons FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can delete own coupons"
  ON public.business_coupons FOR DELETE USING (owner_user_id = auth.uid());

COMMENT ON TABLE public.business_coupons IS '업체 발행 쿠폰. 운영자 검토 면제, 즉시 노출.';
