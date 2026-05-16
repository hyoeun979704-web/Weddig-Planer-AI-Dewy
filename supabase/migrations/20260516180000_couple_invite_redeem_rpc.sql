-- Fix: 초대코드 입력이 RLS에 막혀 동작하지 않던 문제 해결.
--
-- 기존 SELECT 정책은 `user_id = auth.uid() OR partner_user_id = auth.uid()`
-- 라서 코드를 입력하려는 파트너 후보(아직 둘 다 아님)는 행 자체를 조회할
-- 수 없었음. 따라서 invite_code 기반 lookup이 항상 null을 반환해
-- "초대 코드를 찾을 수 없어요" 토스트만 뜨고 연결이 안 됨.
--
-- 정책을 풀어 누구나 invite_code로 조회 가능하게 만들면 코드 유출 시
-- 임의 가입자가 정보를 엿볼 수 있으므로, 대신 SECURITY DEFINER RPC를
-- 만들어 lookup + redeem을 한 번에, 원자적으로 처리. WHERE status=pending
-- 가드로 동시 클릭 race도 방지.

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

  -- Mirror client-side normalization: strip all whitespace, upper-case.
  -- Without this a code with stray spaces from a Kakao share paste would
  -- silently miss even though the user thinks they entered the right
  -- thing.
  v_normalized := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  IF length(v_normalized) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_code');
  END IF;

  -- SECURITY DEFINER bypasses RLS so the partner-candidate can find the
  -- pending invite. We only ever return a non-leaky boolean + the link id
  -- on success — never expose other users' codes or status to a guesser.
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

  -- Atomic redeem. The WHERE status='pending' guard handles the race where
  -- two partner candidates type the same code at the same time — only the
  -- first UPDATE matches, the second sees NOT FOUND and gets a clean
  -- "already_redeemed" error instead of overwriting a real linkage.
  UPDATE public.couple_links
  SET partner_user_id = v_uid,
      status = 'linked',
      linked_at = now()
  WHERE id = v_link.id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'link_id', v_link.id,
    'inviter_user_id', v_link.user_id
  );
END;
$$;

-- Lock down execution. SECURITY DEFINER functions run as the function
-- owner (typically the postgres role) so we must explicitly REVOKE the
-- default PUBLIC grant and GRANT only to authenticated users — otherwise
-- anon visitors could brute-force codes.
REVOKE ALL ON FUNCTION public.redeem_couple_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_couple_invite(TEXT) TO authenticated;

COMMENT ON FUNCTION public.redeem_couple_invite(TEXT) IS
  '파트너 후보가 초대 코드를 입력해 커플 연결을 redeem. RLS를 우회하므로 ' ||
  'invite_code 조회 자체는 가능하지만 결과는 ok/error 플래그만 노출.';
