-- 사용자 쿠폰 다운로드(받기). 사용자는 본인 다운로드만 조회/생성. 업체는 본인
-- 쿠폰의 다운로드 수를 RPC 로 집계(대시보드 마케팅 지표).

CREATE TABLE IF NOT EXISTS public.coupon_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.business_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_downloads_user ON public.coupon_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_downloads_coupon ON public.coupon_downloads(coupon_id);

ALTER TABLE public.coupon_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own downloads"
  ON public.coupon_downloads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User can download (insert own)"
  ON public.coupon_downloads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User can delete own download"
  ON public.coupon_downloads FOR DELETE USING (user_id = auth.uid());

-- 업체 소유자: 본인 쿠폰들의 총 다운로드 수.
CREATE OR REPLACE FUNCTION public.get_my_coupon_download_count()
RETURNS INT
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int
  FROM public.coupon_downloads d
  JOIN public.business_coupons c ON c.id = d.coupon_id
  WHERE c.owner_user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_coupon_download_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_coupon_download_count() TO authenticated;

COMMENT ON TABLE public.coupon_downloads IS '사용자 쿠폰 받기. (coupon_id,user_id) 유니크.';
