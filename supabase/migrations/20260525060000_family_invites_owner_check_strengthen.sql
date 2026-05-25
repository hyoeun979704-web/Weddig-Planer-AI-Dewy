-- family_invites_update_owner RLS gap 정정.
--
-- 배경:
--   20260523050000_review_findings_fixes.sql 가 family_invites_update_self 를 owner/member
--   두 정책으로 쪼개면서 member 정책은 column-level IS NOT DISTINCT FROM 로 안전 컬럼만 허용.
--   그러나 owner 정책 WITH CHECK 는 owner_user_id 불변만 강제. status='linked' 후에도
--   owner 가 member_user_id / delegated_scopes / role 을 단독 UPDATE 로 자유 변경 가능.
--
-- 공격 시나리오:
--   1) Member B 가 invite 수락 → status='linked', member_user_id=B, delegated_scopes=['budget_view'].
--   2) Owner A 가 `UPDATE family_invites SET member_user_id='attacker_uid',
--      delegated_scopes=ARRAY['budget_view','guest_manage','memo_view']
--      WHERE id=X` 실행. WITH CHECK 의 owner_user_id 가드 통과.
--   3) attacker_uid 가 B 의 동의 없이 확장된 scope 권한 획득. 명백한 unilateral re-delegation.
--
-- 해결:
--   owner 정책 WITH CHECK 를 status 에 따라 분기.
--     - status='pending'        → owner 자유 변경 (아직 member 수락 전, 초대 메타 조정 가능).
--     - status='expired'/'revoked' → 종결된 invite, owner 자유 변경 (사실상 readonly 흐름).
--     - status='linked'         → member_user_id / delegated_scopes / role 변경 금지.
--                                 owner 가 권한 회수하려면 status 를 'revoked' 로 바꾸는 경로만 허용.
--   status 자체는 owner 가 언제든 변경 가능 (예: 'linked' → 'revoked' 회수).
--   owner_user_id 는 모든 status 에서 불변 (기존 가드 유지).

DROP POLICY IF EXISTS family_invites_update_owner ON public.family_invites;

CREATE POLICY family_invites_update_owner ON public.family_invites
  FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (
    auth.uid() = owner_user_id
    -- owner_user_id 는 모든 status 에서 불변.
    AND owner_user_id IS NOT DISTINCT FROM (
      SELECT fi.owner_user_id FROM public.family_invites fi WHERE fi.id = family_invites.id
    )
    -- status='linked' 인 경우 member 의 동의 없이 owner 가 권한 범위·대상을 일방 변경 금지.
    -- 이전 행의 status 가 'linked' 였다면 다음 세 컬럼이 동일해야 한다.
    AND (
      (SELECT fi.status FROM public.family_invites fi WHERE fi.id = family_invites.id) <> 'linked'
      OR (
        member_user_id IS NOT DISTINCT FROM (
          SELECT fi.member_user_id FROM public.family_invites fi WHERE fi.id = family_invites.id
        )
        AND delegated_scopes IS NOT DISTINCT FROM (
          SELECT fi.delegated_scopes FROM public.family_invites fi WHERE fi.id = family_invites.id
        )
        AND role IS NOT DISTINCT FROM (
          SELECT fi.role FROM public.family_invites fi WHERE fi.id = family_invites.id
        )
      )
    )
  );

COMMENT ON POLICY family_invites_update_owner ON public.family_invites IS
  'Owner UPDATE 정책. owner_user_id 는 모든 status 에서 불변. status=linked 행은 member_user_id / delegated_scopes / role 변경 금지 — owner 는 status 를 revoked 로 바꿔서 권한 회수만 가능. status=pending / expired / revoked 행은 자유 변경 허용.';
