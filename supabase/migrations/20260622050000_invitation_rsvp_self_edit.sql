-- I8-C: 하객 본인 응답 수정. 익명 하객이 자기 응답을 나중에 고칠 수 있게 한다.
--
-- 보안 모델: 익명 UPDATE 를 RLS 로 열면 rsvp id(UUID)만 알면 누구나 남의 응답을 고칠 수
-- 있어 위험하다. 그래서 행마다 비밀 edit_token 을 두고, 제출 시 토큰을 제출자에게만
-- 돌려준 뒤(브라우저 localStorage 보관), 수정은 토큰을 검증하는 SECURITY DEFINER RPC 로만
-- 허용한다. 테이블 UPDATE 정책은 익명에게 열지 않는다(RPC 가 유일한 경로).

ALTER TABLE public.invitation_rsvp
  ADD COLUMN IF NOT EXISTS edit_token uuid NOT NULL DEFAULT gen_random_uuid();

-- ── 제출 RPC ────────────────────────────────────────────────────────────────
-- INSERT 후 edit_token 을 제출자에게 반환. SECURITY DEFINER 라 SELECT RLS(소유자 전용)
-- 와 무관하게 반환값을 받을 수 있다. cap·burst·closed 등 BEFORE INSERT 트리거와
-- CHECK 제약(child_count<=companion_count 등)은 definer INSERT 에도 그대로 적용된다.
-- 발행 게이트는 RLS WITH CHECK 가 definer 에서 우회되므로 함수 안에서 재확인한다.
CREATE OR REPLACE FUNCTION public.submit_invitation_rsvp(
  p_invitation_id uuid,
  p_name text,
  p_is_attending boolean,
  p_side text,
  p_meal_preference text,
  p_companion_count integer,
  p_child_count integer,
  p_message text
)
RETURNS TABLE (id uuid, edit_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.invitations
    WHERE invitations.id = p_invitation_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'invitation_not_published';
  END IF;

  RETURN QUERY
  INSERT INTO public.invitation_rsvp (
    invitation_id, name, is_attending, side,
    meal_preference, companion_count, child_count, message
  ) VALUES (
    p_invitation_id, p_name, p_is_attending, p_side,
    p_meal_preference, p_companion_count, p_child_count, p_message
  )
  RETURNING invitation_rsvp.id, invitation_rsvp.edit_token;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_invitation_rsvp(uuid, text, boolean, text, text, integer, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_invitation_rsvp(uuid, text, boolean, text, text, integer, integer, text) TO anon, authenticated;

-- ── 수정 RPC ────────────────────────────────────────────────────────────────
-- edit_token 이 일치하는 본인 행만 수정. INSERT 트리거(마감 검사)는 UPDATE 에 안 걸리므로
-- 마감 여부를 함수 안에서 재확인(제출과 동일 정책). 잘못된 토큰이면 예외.
CREATE OR REPLACE FUNCTION public.update_invitation_rsvp(
  p_id uuid,
  p_edit_token uuid,
  p_name text,
  p_is_attending boolean,
  p_side text,
  p_meal_preference text,
  p_companion_count integer,
  p_child_count integer,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id uuid;
  v_closed boolean;
  v_deadline date;
BEGIN
  SELECT r.invitation_id INTO v_invitation_id
    FROM public.invitation_rsvp r
    WHERE r.id = p_id AND r.edit_token = p_edit_token;
  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'rsvp_not_found_or_bad_token';
  END IF;

  SELECT rsvp_closed, rsvp_deadline INTO v_closed, v_deadline
    FROM public.invitations WHERE invitations.id = v_invitation_id;
  IF v_closed OR (v_deadline IS NOT NULL AND v_deadline < current_date) THEN
    RAISE EXCEPTION 'rsvp_closed';
  END IF;

  UPDATE public.invitation_rsvp SET
    name = p_name,
    is_attending = p_is_attending,
    side = p_side,
    meal_preference = p_meal_preference,
    companion_count = p_companion_count,
    child_count = p_child_count,
    message = p_message
  WHERE id = p_id AND edit_token = p_edit_token;
END;
$$;

REVOKE ALL ON FUNCTION public.update_invitation_rsvp(uuid, uuid, text, boolean, text, text, integer, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_invitation_rsvp(uuid, uuid, text, boolean, text, text, integer, integer, text) TO anon, authenticated;
