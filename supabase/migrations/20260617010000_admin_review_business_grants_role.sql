-- 운영자 기업회원 승인/직접 전환 시 user_roles('business') 역할도 부여 — "회원정보 미반영" 버그 수정.
--
-- 문제: 기존 admin_review_business 는 business_profiles.approval_status 만 바꾸고 역할은 안 줬다.
-- 가입 온보딩(verify-business)은 역할을 부여하지만, 운영자가 온보딩을 거치지 않고 직접 만든/
-- 승인한 기업회원은 user_roles 에 'business' 가 없어, useUserRole(역할 기반)이 개인회원으로
-- 표시했다(승인해도 회원정보·대시보드 미반영).
--
-- 수정: 승인(p_approved=true) 시 'business' 역할을 idempotent 하게 부여한다.
-- 반려 시에는 역할을 건드리지 않는다(다른 경로로 부여됐을 수 있고, approval_status 가 별도
-- 게이트라 미승인이면 어차피 대시보드가 막힌다).
--
-- CREATE OR REPLACE 라 DB 가 repo 와 드리프트됐어도 이 정의로 수렴한다.
-- ⚠️ 라이브 적용 후, 기존에 직접 승인됐으나 역할이 없는 사업자는 1회 재승인하거나
--    user_roles 백필이 필요할 수 있다(아래 백필 포함).

create or replace function public.admin_review_business(
  p_profile_id uuid,
  p_approved boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_user_id uuid;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_status := case when p_approved then 'approved' else 'rejected' end;

  update public.business_profiles
     set approval_status = v_status,
         review_note = p_note,
         reviewed_at = now()
   where id = p_profile_id
   returning user_id into v_user_id;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- 승인 시 business 역할 부여(이미 있으면 무시).
  if p_approved then
    insert into public.user_roles (user_id, role)
    values (v_user_id, 'business')
    on conflict (user_id, role) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

revoke all on function public.admin_review_business(uuid, boolean, text) from public;
grant execute on function public.admin_review_business(uuid, boolean, text) to authenticated;

-- 백필: 이미 approved 인데 business 역할이 누락된 기존 사업자에게 역할 부여(과거 직접 전환분 복구).
insert into public.user_roles (user_id, role)
select bp.user_id, 'business'::public.app_role
from public.business_profiles bp
where bp.approval_status = 'approved'
  -- 삭제된 사용자의 잔존(orphaned) 프로필 제외 — user_roles FK(auth.users) 위반 방지.
  and exists (select 1 from auth.users au where au.id = bp.user_id)
on conflict (user_id, role) do nothing;
