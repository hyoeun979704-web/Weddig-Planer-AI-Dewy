-- 업체 이벤트 — 운영자 검토 필수(요구사항). 저장 시 pending, 승인 시에만 공개.
-- 새 테이블이라 RLS 직접 정의. 운영자 검토 큐는 SECURITY DEFINER RPC(admin 체크).

CREATE TABLE IF NOT EXISTS public.business_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at DATE,
  ends_at DATE,
  moderation_status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_events_place ON public.business_events(place_id);
CREATE INDEX IF NOT EXISTS idx_business_events_owner ON public.business_events(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_events_pending ON public.business_events(moderation_status) WHERE moderation_status = 'pending';

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

-- 공개: 승인된 것만. 소유자: 본인 것 전부(상태 무관).
CREATE POLICY "Public can view approved events"
  ON public.business_events FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "Owner can view own events"
  ON public.business_events FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can insert own events"
  ON public.business_events FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own events"
  ON public.business_events FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can delete own events"
  ON public.business_events FOR DELETE USING (owner_user_id = auth.uid());

-- 운영자 검토 큐
CREATE OR REPLACE FUNCTION public.admin_list_pending_events()
RETURNS SETOF public.business_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.business_events WHERE moderation_status = 'pending' ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_event(p_id UUID, p_approved BOOLEAN)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  UPDATE public.business_events
  SET moderation_status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
  WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_pending_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_event(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_event(UUID, BOOLEAN) TO authenticated;

COMMENT ON TABLE public.business_events IS '업체 이벤트. 운영자 검토 필수(pending→approved 공개).';
