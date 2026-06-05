-- Admin 대시보드가 SELECT count 를 호출하는 테이블에 admin 우회 정책 추가.
-- has_role() 은 SECURITY DEFINER → user_roles 자체의 RLS 와 무관하게 동작.
-- 기존의 "본인 row 만" 정책은 그대로 두고, admin 용 추가 정책으로 OR 결합 효과.
--
-- 배경 — 어드민 대시보드의 회원수 / 피팅 / 하트 거래 카운트가 본인 1건만
-- 표시되던 P0. 기존 RLS 가 `auth.uid() = user_id` 한 줄만 있어 admin 도 본인
-- 데이터만 보였음.

-- profiles
DROP POLICY IF EXISTS "admin can read all profiles" ON public.profiles;
CREATE POLICY "admin can read all profiles" ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- dress_fittings
DROP POLICY IF EXISTS "admin can read all dress_fittings" ON public.dress_fittings;
CREATE POLICY "admin can read all dress_fittings" ON public.dress_fittings
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- heart_transactions
DROP POLICY IF EXISTS "admin can read all heart_transactions" ON public.heart_transactions;
CREATE POLICY "admin can read all heart_transactions" ON public.heart_transactions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- service_waitlist
DROP POLICY IF EXISTS "admin can read all service_waitlist" ON public.service_waitlist;
CREATE POLICY "admin can read all service_waitlist" ON public.service_waitlist
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- business_events
DROP POLICY IF EXISTS "admin can read all business_events" ON public.business_events;
CREATE POLICY "admin can read all business_events" ON public.business_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- business_coupons
DROP POLICY IF EXISTS "admin can read all business_coupons" ON public.business_coupons;
CREATE POLICY "admin can read all business_coupons" ON public.business_coupons
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- user_roles (admin 이 다른 사용자 역할도 봐야 AdminUsers 페이지 동작)
DROP POLICY IF EXISTS "admin can read all user_roles" ON public.user_roles;
CREATE POLICY "admin can read all user_roles" ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
