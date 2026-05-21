-- redeem_couple_invite 보강: 연결 성공 시 양쪽 user_wedding_settings 의
-- partner_user_id 도 동기화한다.
--
-- 커플 기능(찜·투표·일정 공유 등)은 couple_links 를 source of truth 로 쓰지만,
-- 일부(구독 early-bird 파트너 보너스 등)는 user_wedding_settings.partner_user_id
-- 를 읽는다. 클라이언트가 파트너(초대자)의 settings 행을 직접 쓰는 건 RLS 에
-- 막히므로, SECURITY DEFINER 인 이 RPC 안에서 양쪽을 함께 갱신한다.

CREATE OR REPLACE FUNCTION public.redeem_couple_invite(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.redeem_couple_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_couple_invite(TEXT) TO authenticated;
