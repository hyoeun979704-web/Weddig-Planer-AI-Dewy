-- redeem 시 redeemer가 사전에 만들어 둔 pending 초대코드를 정리하는 보강.
--
-- 시나리오: A가 코드(A_code)를 만들어 둔 채로 B가 보낸 다른 코드(B_code)를
-- 입력해 연결되면 couple_links에 두 행이 남음.
--   1) user_id=A, invite_code=A_code, status=pending  ← 더 이상 의미 없음
--   2) user_id=B, partner_user_id=A, status=linked    ← 진짜 관계
--
-- 클라이언트의 fetchCoupleLink는 .or(user_id.eq.me, partner_user_id.eq.me)
-- + .maybeSingle() 로 단일 행을 기대하므로 위 상태에서 disambiguate 못해
-- "stale pending"이 그대로 보이거나 에러로 빠짐. 따라서 redeem 성공 시
-- redeemer 본인의 잔여 pending 행을 'unlinked'로 표시해 히스토리는 남기되
-- 조회 결과에서 자연스럽게 빠지게 함.

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

  -- 본인이 사전 발급해 둔 pending 잔여 행 정리. status='pending' 조건
  -- 덕분에 이미 linked 된 이전 관계는 건드리지 않음.
  UPDATE public.couple_links
  SET status = 'unlinked'
  WHERE user_id = v_uid
    AND status = 'pending'
    AND id != v_link.id;

  RETURN jsonb_build_object(
    'ok', true,
    'link_id', v_link.id,
    'inviter_user_id', v_link.user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_couple_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_couple_invite(TEXT) TO authenticated;
