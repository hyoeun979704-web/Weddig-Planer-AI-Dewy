-- 업체 보드 커플 공유 — budget_items / user_schedule_items 와 동일 모델.
--
-- 문제: 예산·일정·결혼정보(식장/날짜/지역)는 20260606190000 에서 커플 공유로 확장됐는데
-- 업체 보드(vendor_board_items)만 본인 전용으로 남아, 한쪽이 '이 업체로 결정'해도
-- 파트너 보드엔 안 보였다("같은 데이터인데 연동 안됨"). 결정 데이터(보드·일정·예산)를
-- 같은 진입점에서 일괄 기록하도록 단일화한 만큼, 가시성도 커플 전체로 맞춘다.
--
-- 모델(예산·일정과 동일): collection 이므로 SELECT/UPDATE/DELETE 는 커플 양방향 공유,
-- INSERT 는 본인(각자 자기 행으로 추가)만. is_couple_partner() 는 20260606190000 에서 정의.

-- ── vendor_board_items: collection, 양방향 ─────────────────────────────────
DROP POLICY IF EXISTS "vendor_board own select" ON public.vendor_board_items;
DROP POLICY IF EXISTS "Couple members can view vendor_board_items" ON public.vendor_board_items;
CREATE POLICY "Couple members can view vendor_board_items"
ON public.vendor_board_items FOR SELECT
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "vendor_board own update" ON public.vendor_board_items;
DROP POLICY IF EXISTS "Couple members can update vendor_board_items" ON public.vendor_board_items;
CREATE POLICY "Couple members can update vendor_board_items"
ON public.vendor_board_items FOR UPDATE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id))
WITH CHECK (auth.uid() = user_id OR public.is_couple_partner(user_id));

DROP POLICY IF EXISTS "vendor_board own delete" ON public.vendor_board_items;
DROP POLICY IF EXISTS "Couple members can delete vendor_board_items" ON public.vendor_board_items;
CREATE POLICY "Couple members can delete vendor_board_items"
ON public.vendor_board_items FOR DELETE
USING (auth.uid() = user_id OR public.is_couple_partner(user_id));

-- INSERT 는 본인 전용 유지 — 각자 자기 user_id 행으로 추가(예산·일정과 동일).
DROP POLICY IF EXISTS "vendor_board own insert" ON public.vendor_board_items;
CREATE POLICY "vendor_board own insert" ON public.vendor_board_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
