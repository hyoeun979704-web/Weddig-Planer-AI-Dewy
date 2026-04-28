-- Allow linked couple partners to read each other's favorites.
--
-- Pillar B (paired UX) reads the partner's favorites to surface
-- "파트너가 찜했어요" / "둘 다 찜" indicators on every heart icon, plus
-- the "함께 봐줄 항목" widget on the Schedule home. The original RLS
-- policy on public.favorites only allowed SELECT for auth.uid() = user_id,
-- so partner reads silently returned [] and those indicators never
-- showed up in production despite the client wiring being in place.
--
-- This policy is additive to the existing "Users can view their own
-- favorites" — it grants SELECT only when the requesting user is in a
-- linked couple_link with the favorite's owner. INSERT / DELETE policies
-- stay strictly self-only, so partners can read each other's favorites
-- but cannot mutate them.

CREATE POLICY "Linked partners can view each other's favorites"
ON public.favorites FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.couple_links
    WHERE status = 'linked'
      AND (
        (couple_links.user_id = auth.uid() AND couple_links.partner_user_id = favorites.user_id)
        OR
        (couple_links.partner_user_id = auth.uid() AND couple_links.user_id = favorites.user_id)
      )
  )
);
