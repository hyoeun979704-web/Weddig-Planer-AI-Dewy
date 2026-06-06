-- Couple linking correctness: partner profile visibility + one-couple-per-user.
--
-- 1) profiles SELECT was own-only (+admin). So a non-admin partner could not
--    read the other's profile → useCoupleLink got partnerProfile = null →
--    "isLinked && partnerProfile" was false → the linked card never rendered
--    for the non-admin side. (It happened to work for an admin account via the
--    existing admin SELECT policy, which is why it looked asymmetric.)
--    Add a couple-scoped SELECT so linked partners can read each other's
--    display_name/email — and nothing more (other users still can't).
--
-- 2) redeem_couple_invite never checked whether either party was already in an
--    active couple, so a user could link with several people. Enforce that a
--    couple is strictly two people: reject redemption if the redeemer OR the
--    inviter already has a 'linked' row.

-- ── 1. profiles: linked partner can read partner profile ───────────────────
DROP POLICY IF EXISTS "Couple members can view partner profile" ON public.profiles;
CREATE POLICY "Couple members can view partner profile"
ON public.profiles FOR SELECT
USING (public.is_couple_partner(user_id));

-- ── 2. redeem_couple_invite: enforce one active couple per user ─────────────
CREATE OR REPLACE FUNCTION public.redeem_couple_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID;
  v_normalized TEXT;
  v_link RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  v_normalized := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  IF length(v_normalized) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO v_link
  FROM public.couple_links
  WHERE invite_code = v_normalized
    AND status = 'pending';

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_link.user_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'own_code');
  END IF;

  -- 한 사람은 한 커플만 — 이미 활성 연동이 있으면 거절 (둘만 연결 보장).
  IF EXISTS (
    SELECT 1 FROM public.couple_links
    WHERE status = 'linked' AND (user_id = v_uid OR partner_user_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_linked');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.couple_links
    WHERE status = 'linked'
      AND (user_id = v_link.user_id OR partner_user_id = v_link.user_id)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inviter_already_linked');
  END IF;

  UPDATE public.couple_links
  SET partner_user_id = v_uid,
      status = 'linked',
      linked_at = now()
  WHERE id = v_link.id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  -- 본인이 사전 발급해 둔 pending 잔여 행 정리.
  UPDATE public.couple_links
  SET status = 'unlinked'
  WHERE user_id = v_uid
    AND status = 'pending'
    AND id != v_link.id;

  -- 양쪽 결혼 설정에 파트너 연결 반영 (RLS 우회).
  INSERT INTO public.user_wedding_settings (user_id, partner_user_id)
  VALUES (v_link.user_id, v_uid)
  ON CONFLICT (user_id) DO UPDATE SET partner_user_id = EXCLUDED.partner_user_id;

  INSERT INTO public.user_wedding_settings (user_id, partner_user_id)
  VALUES (v_uid, v_link.user_id)
  ON CONFLICT (user_id) DO UPDATE SET partner_user_id = EXCLUDED.partner_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'link_id', v_link.id,
    'inviter_user_id', v_link.user_id
  );
END;
$function$;
