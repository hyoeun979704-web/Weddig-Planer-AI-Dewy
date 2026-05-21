-- 기업회원 운영자 승인 워크플로.
--
-- is_verified = 국세청(NTS) 사업자번호 검증(자동). 이와 별개로 운영자가 직접
-- 검토·승인하는 단계(approval_status)를 둔다: pending → approved | rejected.
-- 승인 전에는 상세정보 입력/대시보드 기능을 막는다.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 운영자(admin)만 호출 가능한 검토 큐/승인 RPC. RLS 를 넓히지 않고 SECURITY
-- DEFINER + admin 역할 체크로 처리.

CREATE OR REPLACE FUNCTION public.admin_list_pending_businesses()
RETURNS SETOF public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT * FROM public.business_profiles
  WHERE approval_status = 'pending'
  ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_business(
  p_profile_id UUID,
  p_approved BOOLEAN,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_status := CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;

  UPDATE public.business_profiles
  SET approval_status = v_status,
      review_note = p_note,
      reviewed_at = now()
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_pending_businesses() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_business(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_businesses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_business(UUID, BOOLEAN, TEXT) TO authenticated;
