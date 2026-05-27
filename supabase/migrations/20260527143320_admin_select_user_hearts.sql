-- PR #188 코드 리뷰 후속 — user_hearts 가 admin SELECT 우회 정책 누락.
-- AdminUsers 페이지가 .from('user_hearts').in('user_id', [...]) 로 사용자별
-- 하트 잔액 조회 시 기존 RLS '(auth.uid() = user_id)' 만 있어 admin 본인 1행만
-- 반환 → 같은 P0 회귀가 user_hearts 에서 그대로 남음. 이 마이그레이션이 해결.

DROP POLICY IF EXISTS "admin can read all user_hearts" ON public.user_hearts;
CREATE POLICY "admin can read all user_hearts" ON public.user_hearts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
