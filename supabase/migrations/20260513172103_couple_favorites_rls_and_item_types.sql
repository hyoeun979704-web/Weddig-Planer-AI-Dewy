-- Couple-shared favorites + new item types (deal/product/influencer)
--
-- Two issues this resolves:
--   1) favorites SELECT was restricted to (auth.uid() = user_id), so the
--      partner's rows were silently filtered out when the Favorites page
--      tried to read both sides via .in("user_id", [me, partner]).
--   2) The item_type CHECK constraint didn't include deal/product/influencer,
--      so the FavoriteButton on those detail pages threw a check_violation
--      on INSERT.
--
-- INSERT/DELETE policies stay strictly auth.uid() = user_id — partners can
-- *see* each other's favorites but cannot add or remove them on each other's
-- behalf. This matches the couple_votes pattern already in use.

-- ── 1. SELECT policy: extend to include the linked partner ──────────────────
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;

CREATE POLICY "Couple members can view favorites"
ON public.favorites FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.couple_links cl
    WHERE cl.status = 'linked'
      AND (
        (cl.user_id = auth.uid() AND cl.partner_user_id = favorites.user_id)
        OR (cl.partner_user_id = auth.uid() AND cl.user_id = favorites.user_id)
      )
  )
);

-- ── 2. Expand item_type CHECK to cover new tabs ─────────────────────────────
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_item_type_check;

ALTER TABLE public.favorites ADD CONSTRAINT favorites_item_type_check
CHECK (item_type = ANY (ARRAY[
  'venue'::text,
  'studio'::text,
  'honeymoon'::text,
  'honeymoon_gift'::text,
  'jewelry'::text,
  'appliance'::text,
  'suit'::text,
  'hanbok'::text,
  'invitation_venues'::text,
  'community_post'::text,
  'deal'::text,
  'product'::text,
  'influencer'::text
]));
