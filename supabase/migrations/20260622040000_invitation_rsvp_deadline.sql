-- I8-B: RSVP 응답 마감. 호스트가 응답을 '마감'하거나 마감일을 지정하면 그 이후 제출을 막는다.
-- 컬럼은 invitations 에 두고(청첩장 단위 설정), 익명 INSERT 경로를 트리거로 서버단 차단한다
-- (클라 게이트만으로는 우회 가능 — 방어는 DB 에서).
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS rsvp_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_deadline date;

COMMENT ON COLUMN public.invitations.rsvp_closed IS '호스트가 RSVP 응답 받기를 수동 마감(true=마감).';
COMMENT ON COLUMN public.invitations.rsvp_deadline IS 'RSVP 응답 마감일(포함). 이 날까지 응답 가능, 다음 날부터 마감. NULL=무기한.';

-- 마감/마감일 경과 시 제출 차단(BEFORE INSERT). 기존 cap·burst 트리거와 별개로 추가.
CREATE OR REPLACE FUNCTION public.check_invitation_rsvp_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed boolean;
  v_deadline date;
BEGIN
  SELECT rsvp_closed, rsvp_deadline
    INTO v_closed, v_deadline
    FROM public.invitations
    WHERE id = NEW.invitation_id;
  IF v_closed OR (v_deadline IS NOT NULL AND v_deadline < current_date) THEN
    RAISE EXCEPTION 'rsvp_closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invitation_rsvp_open ON public.invitation_rsvp;
CREATE TRIGGER trg_invitation_rsvp_open
BEFORE INSERT ON public.invitation_rsvp
FOR EACH ROW EXECUTE FUNCTION public.check_invitation_rsvp_open();
