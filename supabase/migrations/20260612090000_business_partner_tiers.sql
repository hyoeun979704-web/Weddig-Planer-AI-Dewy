-- 기업회원 3등급 체계: basic(일반) / friends(프렌즈=제휴) / bff(이달의 베프, 매달 선정)
-- + 제휴(프렌즈) 신청 테이블(검토·개인면담 워크플로) + places.is_partner 동기화
-- + 운영자 등급 지정 RPC. 멱등 작성.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS partner_tier text NOT NULL DEFAULT 'basic';
ALTER TABLE public.business_profiles
  DROP CONSTRAINT IF EXISTS business_profiles_partner_tier_check;
ALTER TABLE public.business_profiles
  ADD CONSTRAINT business_profiles_partner_tier_check
    CHECK (partner_tier IN ('basic', 'friends', 'bff'));

-- 제휴(프렌즈) 신청 — 신청 != 확정. 운영자 검토 + 개인면담 후 등급 부여.
CREATE TABLE IF NOT EXISTS public.partnership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'interviewing', 'approved', 'rejected')),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 1000),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partnership_applications_profile
  ON public.partnership_applications(business_profile_id, created_at DESC);

ALTER TABLE public.partnership_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can apply" ON public.partnership_applications;
CREATE POLICY "Owners can apply"
ON public.partnership_applications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = partnership_applications.business_profile_id
      AND bp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can view own applications" ON public.partnership_applications;
CREATE POLICY "Owners can view own applications"
ON public.partnership_applications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 등급 변경 시 추천/목록 노출용 places.is_partner 동기화 (프렌즈·베프 = 파트너)
CREATE OR REPLACE FUNCTION public.sync_place_partner_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.places
  SET is_partner = (NEW.partner_tier IN ('friends', 'bff'))
  WHERE owner_user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_place_partner_flag ON public.business_profiles;
CREATE TRIGGER trg_sync_place_partner_flag
AFTER UPDATE OF partner_tier ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_place_partner_flag();

-- 운영자: 등급 직접 지정 (언제든 변경 가능 — 이달의 베프 매달 교체 등)
CREATE OR REPLACE FUNCTION public.admin_set_business_tier(p_profile_id UUID, p_tier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_tier NOT IN ('basic', 'friends', 'bff') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tier');
  END IF;
  UPDATE public.business_profiles SET partner_tier = p_tier WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 운영자: 승인된 기업회원 + 현재 등급 목록 (등급 지정 UI 용)
CREATE OR REPLACE FUNCTION public.admin_list_business_tiers()
RETURNS TABLE(id UUID, business_name TEXT, service_category TEXT, partner_tier TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.id, bp.business_name, bp.service_category, bp.partner_tier
  FROM public.business_profiles bp
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND bp.approval_status = 'approved'
  ORDER BY bp.partner_tier DESC, bp.created_at DESC;
$$;

-- 운영자: 대기/면담중 제휴 신청 목록
CREATE OR REPLACE FUNCTION public.admin_list_partnership_applications()
RETURNS TABLE(
  id UUID, business_profile_id UUID, business_name TEXT,
  service_category TEXT, status TEXT, message TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.id, pa.business_profile_id, bp.business_name,
         bp.service_category, pa.status, pa.message, pa.created_at
  FROM public.partnership_applications pa
  JOIN public.business_profiles bp ON bp.id = pa.business_profile_id
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND pa.status IN ('pending', 'interviewing')
  ORDER BY pa.created_at ASC;
$$;

-- 운영자: 제휴 신청 처리 — interviewing(면담 진행) / approved(프렌즈 부여) / rejected
CREATE OR REPLACE FUNCTION public.admin_review_partnership(
  p_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_status NOT IN ('interviewing', 'approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;
  UPDATE public.partnership_applications
  SET status = p_status,
      review_note = p_note,
      reviewed_at = CASE WHEN p_status = 'interviewing' THEN reviewed_at ELSE now() END
  WHERE id = p_id
  RETURNING business_profile_id INTO v_profile_id;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF p_status = 'approved' THEN
    UPDATE public.business_profiles SET partner_tier = 'friends' WHERE id = v_profile_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
