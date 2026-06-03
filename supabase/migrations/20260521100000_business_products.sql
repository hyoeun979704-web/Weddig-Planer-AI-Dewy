-- 업체 상품 — 운영자 검토 필수(요구사항). 저장 시 pending, 승인 시에만 공개.
-- 새 테이블이라 RLS 직접 정의. 검토 큐는 SECURITY DEFINER RPC(admin 체크).
-- (소비자 store 의 products 와 별개. 노출 연결은 후속.)

CREATE TABLE IF NOT EXISTS public.business_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INT,
  description TEXT,
  image_url TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_products_place ON public.business_products(place_id);
CREATE INDEX IF NOT EXISTS idx_business_products_owner ON public.business_products(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_products_pending ON public.business_products(moderation_status) WHERE moderation_status = 'pending';

ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved products"
  ON public.business_products FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "Owner can view own products"
  ON public.business_products FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can insert own products"
  ON public.business_products FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own products"
  ON public.business_products FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can delete own products"
  ON public.business_products FOR DELETE USING (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_list_pending_products()
RETURNS SETOF public.business_products
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.business_products WHERE moderation_status = 'pending' ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_product(p_id UUID, p_approved BOOLEAN)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.business_products
  SET moderation_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
  WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_pending_products() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_product(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_product(UUID, BOOLEAN) TO authenticated;

COMMENT ON TABLE public.business_products IS '업체 등록 상품. 운영자 검토 필수(pending→approved 공개).';
