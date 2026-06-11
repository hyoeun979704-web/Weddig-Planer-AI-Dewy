-- Phase 3-C — 모바일 청첩장 공유 발행 RPC.
--
-- 사용자가 모바일 청첩장을 "발행" 하면 status='published' 로 바뀌고
-- share_slug 가 자동 발급된다 (이미 있으면 재사용). 발급된 slug 로
-- /i/:slug 공개 뷰어에서 익명 접근 가능.
--
-- slug 정책: 8자 base36 short id. 충돌 시 최대 10회 재시도.
-- SECURITY DEFINER 라 RLS 우회하지만 본인 row 검증을 함수 내부에서 수행.

CREATE OR REPLACE FUNCTION public.publish_invitation(p_invitation_id UUID)
RETURNS TABLE(
  invitation_id UUID,
  share_slug TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_existing_slug TEXT;
  v_new_slug TEXT;
  v_attempt INT := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- 본인 invitation row 인지 확인
  SELECT i.share_slug INTO v_existing_slug
  FROM public.invitations i
  WHERE i.id = p_invitation_id AND i.user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- 이미 slug 있으면 status 만 published 로
  IF v_existing_slug IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'published', updated_at = now()
    WHERE id = p_invitation_id;

    RETURN QUERY
      SELECT i.id, i.share_slug, i.status
      FROM public.invitations i
      WHERE i.id = p_invitation_id;
    RETURN;
  END IF;

  -- 새 slug 생성 (8자 base36, 충돌 시 재시도)
  WHILE v_new_slug IS NULL AND v_attempt < 10 LOOP
    v_attempt := v_attempt + 1;
    v_new_slug := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    -- RETURNS TABLE 의 share_slug OUT 변수와 충돌(42702) — 반드시 별칭으로 한정
    IF EXISTS (SELECT 1 FROM public.invitations inv WHERE inv.share_slug = v_new_slug) THEN
      v_new_slug := NULL;
    END IF;
  END LOOP;

  IF v_new_slug IS NULL THEN
    RAISE EXCEPTION 'slug_generation_failed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.invitations
  SET status = 'published',
      share_slug = v_new_slug,
      updated_at = now()
  WHERE id = p_invitation_id;

  RETURN QUERY
    SELECT i.id, i.share_slug, i.status
    FROM public.invitations i
    WHERE i.id = p_invitation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_invitation(UUID) TO authenticated;

COMMENT ON FUNCTION public.publish_invitation IS
  '모바일 청첩장 공유 발행. share_slug 자동 발급 + status=published. 본인 row 만 가능.';
