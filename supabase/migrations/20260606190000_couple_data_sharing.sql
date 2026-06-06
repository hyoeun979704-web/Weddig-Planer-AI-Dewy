-- Couple data sharing: budget + schedule + wedding settings (venue/date/region)
--
-- Problem: linking a couple (couple_links.status='linked' + synced
-- user_wedding_settings.partner_user_id) only ever powered favorites, votes
-- and the chatbot. Budget and Schedule queried/secured strictly by
-- (auth.uid() = user_id), so a linked couple still saw only their own data —
-- "연결됐는데 공유 안됨". The PartnerLinkCard sits on the Budget & Schedule
-- pages, so users reasonably expect those pages to share.
--
-- This migration extends RLS so couple members can read AND edit each other's
-- budget items, budget settings, schedule items, and read each other's
-- wedding settings (so the chosen venue/date/region — "선택 업체" — is visible).
--
-- Model (decided with product):
--   • budget_items, user_schedule_items  → collections: SELECT/UPDATE/DELETE
--     shared (bidirectional edit). INSERT stays own (you add rows as yourself).
--   • budget_settings                    → singleton (UNIQUE user_id): the
--     couple shares ONE budget. SELECT/UPDATE shared so both read/write the
--     canonical row (the link creator's). INSERT/DELETE stay own.
--   • user_wedding_settings              → singleton holding personal persona
--     fields too, so only SELECT is shared (read venue/date/region). UPDATE
--     stays own to avoid clobbering each partner's persona/role/pregnancy.
--   • favorites                          → already couple-readable (migration
--     20260513172103); unchanged here.

-- ── Helper: is the given row owner my linked partner? ───────────────────────
-- SECURITY DEFINER so the couple_links lookup isn't itself subject to RLS
-- recursion; STABLE so the planner can cache it within a statement.
CREATE OR REPLACE FUNCTION public.is_couple_partner(_other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_links cl
    WHERE cl.status = 'linked'
      AND (
        (cl.user_id = auth.uid() AND cl.partner_user_id = _other_user)
        OR (cl.partner_user_id = auth.uid() AND cl.user_id = _other_user)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_couple_partner(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_couple_partner(uuid) TO authenticated;

-- Shared predicate, expressed inline per table: own row OR partner's row.

-- ── budget_items: collection, bidirectional ────────────────────────────────
DROP POLICY IF EXISTS "Users can view own budget_items" ON public.budget_items;
CREATE POLICY "Couple members can view budget_items"
ON public.budget_items FOR SELECT
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "Users can update own budget_items" ON public.budget_items;
CREATE POLICY "Couple members can update budget_items"
ON public.budget_items FOR UPDATE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "Users can delete own budget_items" ON public.budget_items;
CREATE POLICY "Couple members can delete budget_items"
ON public.budget_items FOR DELETE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

-- ── budget_settings: singleton, one shared couple budget ───────────────────
DROP POLICY IF EXISTS "Users can view own budget_settings" ON public.budget_settings;
CREATE POLICY "Couple members can view budget_settings"
ON public.budget_settings FOR SELECT
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "Users can update own budget_settings" ON public.budget_settings;
CREATE POLICY "Couple members can update budget_settings"
ON public.budget_settings FOR UPDATE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_couple_partner(user_id));
-- INSERT/DELETE intentionally remain own-only.

-- ── user_schedule_items: collection, bidirectional ─────────────────────────
DROP POLICY IF EXISTS "Users can view their own schedule items" ON public.user_schedule_items;
CREATE POLICY "Couple members can view schedule items"
ON public.user_schedule_items FOR SELECT
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "Users can update their own schedule items" ON public.user_schedule_items;
CREATE POLICY "Couple members can update schedule items"
ON public.user_schedule_items FOR UPDATE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "Users can delete their own schedule items" ON public.user_schedule_items;
CREATE POLICY "Couple members can delete schedule items"
ON public.user_schedule_items FOR DELETE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

-- ── user_wedding_settings: read-share only (persona stays personal) ────────
DROP POLICY IF EXISTS "Users can view their own wedding settings" ON public.user_wedding_settings;
CREATE POLICY "Couple members can view wedding settings"
ON public.user_wedding_settings FOR SELECT
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));
-- UPDATE/INSERT remain own-only: this row also stores persona_mode, role,
-- pregnant, has_children etc. that must not be overwritten by a partner.
