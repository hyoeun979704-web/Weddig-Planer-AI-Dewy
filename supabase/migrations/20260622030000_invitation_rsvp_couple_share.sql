-- I8-A: 청첩장 RSVP 커플 공유. 예산·일정은 커플이 공유하는데(20260606190000) 청첩장
-- /RSVP 응답만 소유자 1인만 봤다. 연결된 배우자도 같은 하객 응답을 보도록 RLS 확장.
-- is_couple_partner(_other_user)(20260606190000 정의) 재사용. 기존 정책은 건드리지 않고
-- 정책을 '추가'만 한다(RLS 정책은 OR 결합 — 소유자/공개발행/배우자 각각 독립적으로 허용).

-- ── invitations: 배우자도 SELECT(대시보드 진입·갤러리 노출에 필요). 편집(UPDATE)·
--    발행은 소유자 전용 유지(개인 편집물 보호) — SELECT 만 공유. ───────────────
DROP POLICY IF EXISTS "Couple partner can view invitations" ON public.invitations;
CREATE POLICY "Couple partner can view invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (public.is_couple_partner(user_id));

-- ── invitation_rsvp: 배우자도 응답 SELECT/DELETE(소유자와 동일하게 관리). ─────
DROP POLICY IF EXISTS "Couple partner can view RSVPs" ON public.invitation_rsvp;
CREATE POLICY "Couple partner can view RSVPs"
ON public.invitation_rsvp FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = public.invitation_rsvp.invitation_id
      AND public.is_couple_partner(i.user_id)
  )
);

DROP POLICY IF EXISTS "Couple partner can delete RSVPs" ON public.invitation_rsvp;
CREATE POLICY "Couple partner can delete RSVPs"
ON public.invitation_rsvp FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = public.invitation_rsvp.invitation_id
      AND public.is_couple_partner(i.user_id)
  )
);
