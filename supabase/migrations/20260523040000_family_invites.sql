-- 페르소나 검토 P2 #11 — 양가 부모/혼주 계정 연동.
-- couple_links 는 파트너(부부) 단위만 다루는데, P9(해외 거주) / P10(부모 부재) /
-- P19(재혼·자녀) 페르소나는 부모/혼주 위임이 핵심이다. family_invites 별도
-- 테이블로 가족 멤버 초대 + 위임 가능 항목 메타데이터를 다룬다.
--
-- 의도적으로 couple_links 와 분리한 이유:
--   - 부모는 일반 계정과 다른 권한 set (예: 예산 조회 가능, 다이어리 비공개 등)
--   - 자녀(재혼 케이스)도 동일 메커니즘 재사용 가능
--   - 다 대 N 관계 (한 사용자에 양가 부모 = 4명까지)

CREATE TABLE IF NOT EXISTS public.family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 초대를 만든 본인 사용자
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 초대 받은 가족 멤버의 user_id (가입 완료 후 채워짐)
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 가족 역할: parent_bride / parent_groom / sibling / child / other
  role TEXT NOT NULL,
  -- 표시용 이름 (예: "엄마", "시어머니", "장녀") - 초대자가 입력
  display_name TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 위임 가능 항목 (배열) - 예: ["budget_view", "schedule_view", "guest_manage", "meal_taste"]
  delegated_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  linked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_invites
  DROP CONSTRAINT IF EXISTS family_invites_role_check;
ALTER TABLE public.family_invites
  ADD CONSTRAINT family_invites_role_check
  CHECK (role IN ('parent_bride', 'parent_groom', 'sibling', 'child', 'planner', 'other'));

ALTER TABLE public.family_invites
  DROP CONSTRAINT IF EXISTS family_invites_status_check;
ALTER TABLE public.family_invites
  ADD CONSTRAINT family_invites_status_check
  CHECK (status IN ('pending', 'linked', 'expired', 'revoked'));

CREATE INDEX IF NOT EXISTS family_invites_owner_idx ON public.family_invites(owner_user_id);
CREATE INDEX IF NOT EXISTS family_invites_member_idx ON public.family_invites(member_user_id)
  WHERE member_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS family_invites_code_idx ON public.family_invites(invite_code)
  WHERE status = 'pending';

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_invites_select_self ON public.family_invites;
CREATE POLICY family_invites_select_self ON public.family_invites
  FOR SELECT USING (
    auth.uid() = owner_user_id OR auth.uid() = member_user_id
  );

DROP POLICY IF EXISTS family_invites_insert_owner ON public.family_invites;
CREATE POLICY family_invites_insert_owner ON public.family_invites
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS family_invites_update_self ON public.family_invites;
CREATE POLICY family_invites_update_self ON public.family_invites
  FOR UPDATE USING (
    auth.uid() = owner_user_id OR auth.uid() = member_user_id
  );

DROP POLICY IF EXISTS family_invites_delete_owner ON public.family_invites;
CREATE POLICY family_invites_delete_owner ON public.family_invites
  FOR DELETE USING (auth.uid() = owner_user_id);

-- 초대 코드 생성·redeem RPC. couple_invite 와 같은 패턴.
CREATE OR REPLACE FUNCTION public.create_family_invite(
  p_role TEXT,
  p_display_name TEXT,
  p_delegated_scopes TEXT[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;
  IF p_role NOT IN ('parent_bride','parent_groom','sibling','child','planner','other') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_role');
  END IF;

  -- 8자리 영숫자 코드. 중복 시 1회 재시도.
  v_code := UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text), 1, 8));
  INSERT INTO public.family_invites (owner_user_id, role, display_name, invite_code, delegated_scopes)
  VALUES (auth.uid(), p_role, p_display_name, v_code, COALESCE(p_delegated_scopes, ARRAY[]::TEXT[]))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'invite_code', v_code, 'invite_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_family_invite(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;
  SELECT * INTO v_invite FROM public.family_invites
    WHERE invite_code = UPPER(p_code) AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found_or_used');
  END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.family_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v_invite.owner_user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_redeem');
  END IF;
  UPDATE public.family_invites
    SET member_user_id = auth.uid(),
        status = 'linked',
        linked_at = now(),
        updated_at = now()
    WHERE id = v_invite.id;
  RETURN jsonb_build_object('ok', true, 'invite_id', v_invite.id, 'role', v_invite.role);
END;
$$;

REVOKE ALL ON FUNCTION public.create_family_invite(TEXT, TEXT, TEXT[]) FROM public;
GRANT EXECUTE ON FUNCTION public.create_family_invite(TEXT, TEXT, TEXT[]) TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_family_invite(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_family_invite(TEXT) TO authenticated;

COMMENT ON TABLE public.family_invites IS
  '양가 부모·혼주·자녀·플래너 등 가족 멤버 초대. couple_links 와 분리. 위임 가능 scope 메타데이터 포함. P9·P10·P19 페르소나 대응.';
