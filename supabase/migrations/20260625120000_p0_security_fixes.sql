-- P0 보안 수정 3건 — 실DB(pg_policies/pg_trigger) 검증된 결함 대응.
-- 출처: docs/audit-surface-partners.md(①) · docs/audit-surface-console.md(②③).
-- 적용 시 화면 동작 변화:
--   ① business_profiles: 일반 사업자 self-UPDATE 는 일반 컬럼(상호·소개·연락처 등)만 가능,
--      권한/검토 컬럼은 동결(운영자 RPC·service_role 은 그대로). 자가승인 권한상승 차단.
--   ② service_waitlist: 운영자 "처리 완료"(notified) 토글이 실제 동작(현재 UPDATE 정책 부재로 무동작).
--   ③ service_waitlist INSERT: 타인 user_id 스푸핑 차단(하드닝 드리프트 재적용).

-- ───────────────────────────────────────────────────────────────────────────
-- ① business_profiles 권한상승 차단 — 권한/검토 컬럼 동결 트리거
--
-- 회귀(실DB 확인): business_profiles 의 유일한 UPDATE 정책이 USING(auth.uid()=user_id) 이고
-- WITH CHECK·컬럼잠금이 없어, 사업자가 자기 행의
--   approval_status='approved' / partner_tier / is_verified / commission_rate_bps
-- 를 직접 UPDATE 해 운영자 승인·국세청 인증·최고 제휴등급을 자가부여(권한상승)할 수 있었다.
-- 운영자 승인 RPC(admin_review_business 등)는 admin 사용자가 호출 → has_role=true 로 통과,
-- 서버(service_role, auth.uid() IS NULL)도 통과. 일반 사업자만 권한/검토 컬럼이 이전 값으로 강제된다.
-- (관용구: 이 레포는 트리거에서 service_role 을 auth.uid() IS NULL 로 식별한다.)
create or replace function public.guard_business_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 운영자(또는 admin RPC 호출자)·서버(service_role)는 권한/검토 컬럼 변경 허용.
  if auth.uid() is null or public.has_role(auth.uid(), 'admin'::app_role) then
    return new;
  end if;
  -- 일반 사업자 self-update: 권한/검토 컬럼을 이전 값으로 강제(자가승인·자가인증 차단).
  new.approval_status     := old.approval_status;
  new.partner_tier        := old.partner_tier;
  new.is_verified         := old.is_verified;
  new.commission_rate_bps := old.commission_rate_bps;
  new.reviewed_at         := old.reviewed_at;
  return new;
end;
$$;

drop trigger if exists guard_business_profile_privileged_cols on public.business_profiles;
create trigger guard_business_profile_privileged_cols
  before update on public.business_profiles
  for each row execute function public.guard_business_profile_privileged_cols();

-- ───────────────────────────────────────────────────────────────────────────
-- ② service_waitlist 운영자 UPDATE 정책 — "처리 완료"(notified) 토글 동작화
--
-- 회귀(실DB 확인): service_waitlist 는 RLS ON + INSERT/SELECT 정책만 있고 UPDATE 정책이 없어,
-- 운영자 AdminServiceWaitlist 의 .update({notified:true}) 가 0행 매칭 → 에러 없이 성공 toast 만
-- 뜨고 실제 미반영(dead-end). 운영자(admin)만 UPDATE 허용.
drop policy if exists "admin update service_waitlist" on public.service_waitlist;
create policy "admin update service_waitlist"
  on public.service_waitlist
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- ───────────────────────────────────────────────────────────────────────────
-- ③ service_waitlist INSERT 하드닝 — 타인 user_id 스푸핑 차단(드리프트 재적용)
--
-- 회귀(실DB 확인): 라이브 INSERT 정책 "Anyone can register to waitlist" 가 WITH CHECK(true) 라
-- 인증 사용자가 타인 user_id 로 신청 가능. (하드닝 마이그 20260605170000 가 repo 엔 있으나 라이브 미적용.)
-- 익명 신청(user_id NULL)은 유지하되, 인증 사용자는 본인 user_id 만 허용.
drop policy if exists "Anyone can register to waitlist" on public.service_waitlist;
create policy "Anyone can register to waitlist"
  on public.service_waitlist
  for insert
  to public
  with check (user_id is null or user_id = auth.uid());
