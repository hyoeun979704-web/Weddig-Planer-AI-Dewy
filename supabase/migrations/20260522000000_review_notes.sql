-- 업체정보·이벤트·상품 검토에 반려 사유(moderation_note)를 도입한다.
-- 운영자가 반려 시 사유를 남기고, 사업자가 그 사유를 확인해 수정·재요청할 수 있게 한다.
-- 기존 2-인자 RPC 는 DROP 후 3-인자(p_note 기본 NULL)로 교체한다.

ALTER TABLE public.places ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE public.business_events ADD COLUMN IF NOT EXISTS moderation_note TEXT;
ALTER TABLE public.business_products ADD COLUMN IF NOT EXISTS moderation_note TEXT;

-- 업체 정보 검토
DROP FUNCTION IF EXISTS public.admin_review_listing(TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_review_listing(p_place_id TEXT, p_approved BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.places SET
    moderation_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    moderation_note = CASE WHEN p_approved THEN NULL ELSE p_note END,
    is_active = p_approved,
    updated_at = now()
  WHERE place_id = p_place_id AND owner_user_id IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_listing(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_listing(TEXT, BOOLEAN, TEXT) TO authenticated;

-- 이벤트 검토
DROP FUNCTION IF EXISTS public.admin_review_event(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_review_event(p_id UUID, p_approved BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.business_events
  SET moderation_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      moderation_note = CASE WHEN p_approved THEN NULL ELSE p_note END
  WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_event(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_event(UUID, BOOLEAN, TEXT) TO authenticated;

-- 상품 검토
DROP FUNCTION IF EXISTS public.admin_review_product(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_review_product(p_id UUID, p_approved BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.business_products
  SET moderation_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      moderation_note = CASE WHEN p_approved THEN NULL ELSE p_note END
  WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_product(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_product(UUID, BOOLEAN, TEXT) TO authenticated;
