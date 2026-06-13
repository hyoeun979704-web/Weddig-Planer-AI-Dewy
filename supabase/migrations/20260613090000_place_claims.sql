-- 기존 등록 업체(places, owner 없음) 관리권한 요청(Claim) → 운영자 승인 시 소유권 연결.
-- 크롤링/운영자가 넣은 place 에는 사업자번호가 없어 자동 매칭이 불가하므로, 사장님이
-- "이 업체가 우리예요" 신청 → 운영자가 승인해 owner_user_id 를 연결한다(중복 리스팅 방지).

CREATE TABLE IF NOT EXISTS public.place_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_number text,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 같은 사용자가 같은 업체에 중복 대기 신청 방지.
CREATE UNIQUE INDEX IF NOT EXISTS place_claims_unique_pending
  ON public.place_claims (place_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS place_claims_status_idx ON public.place_claims (status, created_at DESC);

ALTER TABLE public.place_claims ENABLE ROW LEVEL SECURITY;

-- 본인 신청 조회 / 운영자 전체 조회. INSERT·UPDATE 는 SECURITY DEFINER RPC 로만(위조 방지).
DROP POLICY IF EXISTS "own claims read" ON public.place_claims;
CREATE POLICY "own claims read" ON public.place_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 신청: 승인된 기업회원만, 아직 주인 없는 place 에만.
CREATE OR REPLACE FUNCTION public.request_place_claim(p_place_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bp RECORD;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT * INTO v_bp FROM public.business_profiles WHERE user_id = v_uid;
  IF v_bp.id IS NULL OR v_bp.approval_status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_approved');
  END IF;
  SELECT owner_user_id INTO v_owner FROM public.places WHERE place_id = p_place_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'place_not_found'); END IF;
  IF v_owner IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'already_owned'); END IF;

  INSERT INTO public.place_claims (place_id, user_id, business_number, note)
  VALUES (p_place_id, v_uid, v_bp.business_number, left(coalesce(p_note, ''), 500))
  ON CONFLICT (place_id, user_id) WHERE (status = 'pending') DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 운영자: 대기 신청 목록(업체명 포함).
CREATE OR REPLACE FUNCTION public.admin_list_place_claims()
RETURNS TABLE (
  id uuid, place_id uuid, place_name text, place_city text,
  user_id uuid, business_number text, note text, status text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.place_id, p.name, p.city, c.user_id, c.business_number, c.note, c.status, c.created_at
  FROM public.place_claims c JOIN public.places p ON p.place_id = c.place_id
  WHERE c.status = 'pending'
  ORDER BY c.created_at ASC;
END;
$$;

-- 운영자: 승인 시 place 소유권 연결(+파트너·business 소스), 반려 시 상태만.
CREATE OR REPLACE FUNCTION public.admin_review_place_claim(p_claim_id uuid, p_approved boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_claim RECORD;
  v_owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_claim FROM public.place_claims WHERE id = p_claim_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF p_approved THEN
    SELECT owner_user_id INTO v_owner FROM public.places WHERE place_id = v_claim.place_id;
    IF v_owner IS NOT NULL AND v_owner <> v_claim.user_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_owned');
    END IF;
    UPDATE public.places SET owner_user_id = v_claim.user_id, is_partner = true, data_source = 'business', updated_at = now()
    WHERE place_id = v_claim.place_id;
  END IF;

  UPDATE public.place_claims
    SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_claim_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.request_place_claim(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_place_claim(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_place_claims() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_place_claims() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_review_place_claim(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_place_claim(uuid, boolean) TO authenticated;
