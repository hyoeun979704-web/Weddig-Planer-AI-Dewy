-- 반쪽 연동 복구. couple_links.status='linked' 인데 user_wedding_settings.partner_user_id
-- 가 양쪽에 동기화되지 않은 옛 연동(2026-05-21 sync 추가 이전 redeem) 자가복구.
--
-- 1) resync_couple_settings() RPC — linked 커플 당사자가 호출하면 양쪽 settings 재동기화.
--    값은 couple_links 에서만 가져오므로 호출자가 임의로 남의 settings 를 조작할 수 없음.
-- 2) 기존 모든 linked 행에 대해 1회 백필(멱등).

CREATE OR REPLACE FUNCTION public.resync_couple_settings()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
  v_link RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  -- 호출자가 속한 활성 linked 행. (한 사용자는 한 커플만 가정)
  SELECT * INTO v_link
  FROM public.couple_links
  WHERE status = 'linked'
    AND (user_id = v_uid OR partner_user_id = v_uid)
    AND partner_user_id IS NOT NULL
  ORDER BY linked_at DESC NULLS LAST
  LIMIT 1;

  IF v_link.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_link');
  END IF;

  INSERT INTO public.user_wedding_settings (user_id, partner_user_id)
  VALUES (v_link.user_id, v_link.partner_user_id)
  ON CONFLICT (user_id) DO UPDATE SET partner_user_id = EXCLUDED.partner_user_id;

  INSERT INTO public.user_wedding_settings (user_id, partner_user_id)
  VALUES (v_link.partner_user_id, v_link.user_id)
  ON CONFLICT (user_id) DO UPDATE SET partner_user_id = EXCLUDED.partner_user_id;

  RETURN jsonb_build_object('ok', true, 'link_id', v_link.id);
END;
$$;

REVOKE ALL ON FUNCTION public.resync_couple_settings() FROM public;
GRANT EXECUTE ON FUNCTION public.resync_couple_settings() TO authenticated;

-- 1회 백필 — 기존 linked 행 양쪽 settings 동기화(멱등).
INSERT INTO public.user_wedding_settings (user_id, partner_user_id)
SELECT cl.user_id, cl.partner_user_id
FROM public.couple_links cl
WHERE cl.status = 'linked' AND cl.partner_user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET partner_user_id = EXCLUDED.partner_user_id;

INSERT INTO public.user_wedding_settings (user_id, partner_user_id)
SELECT cl.partner_user_id, cl.user_id
FROM public.couple_links cl
WHERE cl.status = 'linked' AND cl.partner_user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET partner_user_id = EXCLUDED.partner_user_id;
