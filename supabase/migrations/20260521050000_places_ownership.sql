-- 기업회원 업체 리스팅(공개 상세페이지) — places 기반.
--
-- places 의 테이블 레벨 RLS 상태가 레포에 없어(대시보드 관리 추정) 직접 정책을
-- 추가하면 공개 카탈로그가 깨지거나 보안 구멍이 생길 수 있다. 따라서 owner CRUD 와
-- 운영자 검토는 모두 SECURITY DEFINER RPC 안에서 권한을 확인해 처리하고, 테이블
-- RLS 는 손대지 않는다.
--
-- 컬럼 추가는 additive: 기존 행은 moderation_status='approved'(노출 유지),
-- owner_user_id=null. 오너가 만든 리스팅만 is_active=false + pending 으로 시작해
-- 운영자 승인 시 is_active=true + approved 가 된다(공개 쿼리는 is_active 만 보므로
-- 쿼리 변경 불필요).

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS idx_places_owner ON public.places(owner_user_id);

-- business service_category → places.category 매핑(대부분 동일, suit→tailor_shop)
CREATE OR REPLACE FUNCTION public._biz_category_to_place(p_cat TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_cat WHEN 'suit' THEN 'tailor_shop' ELSE p_cat END;
$$;

-- 오너 본인 리스팅 조회(prefill). 없으면 null row.
CREATE OR REPLACE FUNCTION public.get_my_listing()
RETURNS SETOF public.places
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.places WHERE owner_user_id = auth.uid() LIMIT 1;
$$;

-- 오너 리스팅 생성/수정 — 승인된 기업회원만. 저장 시 검토 대기(is_active=false,
-- moderation_status='pending'). category 는 business_profiles 의 service_category 로 고정.
CREATE OR REPLACE FUNCTION public.upsert_my_listing(
  p_name TEXT,
  p_description TEXT,
  p_city TEXT,
  p_district TEXT,
  p_main_image_url TEXT,
  p_min_price INT,
  p_tags TEXT[]
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_bp RECORD;
  v_place_id UUID;
  v_category TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT * INTO v_bp FROM public.business_profiles WHERE user_id = v_uid;
  IF v_bp.id IS NULL OR v_bp.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_approved');
  END IF;

  v_category := public._biz_category_to_place(v_bp.service_category);

  SELECT place_id INTO v_place_id FROM public.places WHERE owner_user_id = v_uid LIMIT 1;

  IF v_place_id IS NULL THEN
    v_place_id := gen_random_uuid();
    INSERT INTO public.places (
      place_id, category, owner_user_id, name, description, city, district,
      main_image_url, min_price, tags, is_active, moderation_status, is_partner, data_source
    ) VALUES (
      v_place_id, v_category, v_uid, p_name, p_description, p_city, p_district,
      p_main_image_url, p_min_price, p_tags, false, 'pending', true, 'business'
    );
  ELSE
    UPDATE public.places SET
      name = p_name, description = p_description, city = p_city, district = p_district,
      main_image_url = p_main_image_url, min_price = p_min_price, tags = p_tags,
      is_active = false, moderation_status = 'pending', updated_at = now()
    WHERE place_id = v_place_id AND owner_user_id = v_uid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'place_id', v_place_id);
END;
$$;

-- 운영자: 검토 대기 리스팅 목록 / 승인·반려
CREATE OR REPLACE FUNCTION public.admin_list_pending_listings()
RETURNS SETOF public.places
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.places
  WHERE owner_user_id IS NOT NULL AND moderation_status = 'pending'
  ORDER BY updated_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_listing(p_place_id TEXT, p_approved BOOLEAN)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.places SET
    moderation_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    is_active = p_approved,
    updated_at = now()
  WHERE place_id = p_place_id::uuid AND owner_user_id IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_my_listing(TEXT,TEXT,TEXT,TEXT,TEXT,INT,TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_pending_listings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_listing(TEXT,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_listing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_listing(TEXT,TEXT,TEXT,TEXT,TEXT,INT,TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_listing(TEXT,BOOLEAN) TO authenticated;
