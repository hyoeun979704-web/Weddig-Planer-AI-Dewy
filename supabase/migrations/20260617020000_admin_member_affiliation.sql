-- 운영자가 일반회원 ↔ 기업회원 ↔ 제휴업체를 "원자적으로" 전환 — "이름만 기업회원" 버그 수정.
--
-- 문제: 기존엔 admin 이 일반회원을 기업/제휴로 바꾸는 정식 경로가 없어 수동으로 일부 테이블만
-- 손대 → 역할/프로필/승인/제휴등급이 따로 놀아 "이름(배지)만" 기업회원이 됐다.
-- 해결: 한 RPC 가 ① user_roles('business') ② business_profiles(승인) ③ partner_tier 를 한 번에 세팅.
-- 회사정보 풀입력 불요 — 업종(service_category)만 운영자가 지정, 나머지는 자동 생성(업체가 추후 보완).

-- 1) 전환 액션 ─────────────────────────────────────────────────────────────
-- p_affiliation: 'individual' | 'business' | 'partner'
-- p_service_category: business/partner 전환 시 필수(SERVICE_CATEGORIES value).
create or replace function public.admin_set_member_affiliation(
  p_user_id uuid,
  p_affiliation text,
  p_service_category text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_exists boolean;
  v_tier text;
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_affiliation not in ('individual', 'business', 'partner') then
    return jsonb_build_object('ok', false, 'error', 'invalid_affiliation');
  end if;

  -- 일반회원으로 강등: business 역할 회수 + 프로필 비승인 + 제휴 해제(트리거가 is_partner=false 동기화).
  if p_affiliation = 'individual' then
    delete from public.user_roles where user_id = p_user_id and role = 'business';
    update public.business_profiles
       set approval_status = 'rejected', partner_tier = 'basic', updated_at = now()
     where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'affiliation', 'individual');
  end if;

  -- business / partner 전환 — 업종 필수.
  if p_service_category is null or btrim(p_service_category) = '' then
    return jsonb_build_object('ok', false, 'error', 'service_category_required');
  end if;

  v_tier := case when p_affiliation = 'partner' then 'friends' else 'basic' end;

  select coalesce(nullif(btrim(display_name), ''), '업체') into v_name
    from public.profiles where user_id = p_user_id;
  if v_name is null then v_name := '업체'; end if;

  select exists(select 1 from public.business_profiles where user_id = p_user_id) into v_exists;

  if v_exists then
    update public.business_profiles
       set approval_status = 'approved',
           service_category = p_service_category,
           partner_tier = v_tier,
           updated_at = now()
     where user_id = p_user_id;
  else
    -- 회사정보 미입력 — business_number/representative_name 은 자동 placeholder(업체가 추후 보완).
    insert into public.business_profiles (
      user_id, business_name, business_number, representative_name,
      service_category, is_verified, approval_status, partner_tier
    ) values (
      p_user_id, v_name, 'ADMIN-' || replace(gen_random_uuid()::text, '-', ''), v_name,
      p_service_category, false, 'approved', v_tier
    );
  end if;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'business')
  on conflict (user_id, role) do nothing;

  return jsonb_build_object('ok', true, 'affiliation', p_affiliation);
end;
$$;

-- 2) 현재 소속 조회(어드민 목록 표시용) ───────────────────────────────────────
-- business_profiles 는 owner-only RLS 라 admin 이 직접 SELECT 못 함 → SECURITY DEFINER 로 제공.
create or replace function public.admin_get_member_affiliations(p_user_ids uuid[])
returns table(user_id uuid, affiliation text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden';
  end if;
  return query
  select u.uid as user_id,
    case
      when not exists (
        select 1 from public.user_roles r where r.user_id = u.uid and r.role = 'business'
      ) then 'individual'
      when bp.partner_tier in ('friends', 'bff') then 'partner'
      else 'business'
    end as affiliation
  from unnest(p_user_ids) as u(uid)
  left join public.business_profiles bp on bp.user_id = u.uid;
end;
$$;

revoke all on function public.admin_set_member_affiliation(uuid, text, text) from public;
revoke all on function public.admin_get_member_affiliations(uuid[]) from public;
grant execute on function public.admin_set_member_affiliation(uuid, text, text) to authenticated;
grant execute on function public.admin_get_member_affiliations(uuid[]) to authenticated;
