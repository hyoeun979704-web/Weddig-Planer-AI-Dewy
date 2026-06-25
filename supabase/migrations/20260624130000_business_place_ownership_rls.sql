-- 감사 260624 P0 교정 — 기업 콘텐츠 cross-tenant write 차단.
-- 기존 INSERT/UPDATE RLS 는 owner_user_id = auth.uid() 만 검사 → 직접 API 호출로 owner_user_id=본인 +
-- place_id=타 업체 위조 시 경쟁사 상세페이지에 상품/쿠폰/이벤트/사진 부착 가능(쿠폰은 공개 SELECT 라 즉시 노출).
-- 해결: 대상 place_id 가 호출자 소유(places.owner_user_id = auth.uid())인지 EXISTS 로 함께 검증.
-- (places.owner_user_id 존재 확인 — 마이그 20260521050000.) DELETE/SELECT 는 기존 유지.

-- ── business_products ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can insert own products" ON public.business_products;
CREATE POLICY "Owner can insert own products" ON public.business_products
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = business_products.place_id AND p.owner_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owner can update own products" ON public.business_products;
CREATE POLICY "Owner can update own products" ON public.business_products
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = business_products.place_id AND p.owner_user_id = auth.uid())
  );

-- ── business_coupons ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can insert own coupons" ON public.business_coupons;
CREATE POLICY "Owner can insert own coupons" ON public.business_coupons
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = business_coupons.place_id AND p.owner_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owner can update own coupons" ON public.business_coupons;
CREATE POLICY "Owner can update own coupons" ON public.business_coupons
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = business_coupons.place_id AND p.owner_user_id = auth.uid())
  );

-- ── business_events ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can insert own events" ON public.business_events;
CREATE POLICY "Owner can insert own events" ON public.business_events
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = business_events.place_id AND p.owner_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owner can update own events" ON public.business_events;
CREATE POLICY "Owner can update own events" ON public.business_events
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = business_events.place_id AND p.owner_user_id = auth.uid())
  );

-- ── place_media ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can insert own media" ON public.place_media;
CREATE POLICY "Owner can insert own media" ON public.place_media
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = place_media.place_id AND p.owner_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owner can update own media" ON public.place_media;
CREATE POLICY "Owner can update own media" ON public.place_media
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = place_media.place_id AND p.owner_user_id = auth.uid())
  );

-- ── place_media_albums ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Owner can insert own albums" ON public.place_media_albums;
CREATE POLICY "Owner can insert own albums" ON public.place_media_albums
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = place_media_albums.place_id AND p.owner_user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Owner can update own albums" ON public.place_media_albums;
CREATE POLICY "Owner can update own albums" ON public.place_media_albums
  FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = place_media_albums.place_id AND p.owner_user_id = auth.uid())
  );

-- ── vendor_deliveries ──────────────────────────────────────────────
-- place_id 는 nullable(on delete set null) — 값이 있을 때만 소유 검증(null 이면 owner 만).
-- 수령자(recipient_user_id) 위장 발송 방지의 1차 방어. (수령자 컬럼잠금 트리거는 별도 P1.)
DROP POLICY IF EXISTS vendor_deliveries_insert ON public.vendor_deliveries;
CREATE POLICY vendor_deliveries_insert ON public.vendor_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_user_id
    AND (
      place_id IS NULL
      OR EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = vendor_deliveries.place_id AND p.owner_user_id = auth.uid())
    )
  );
