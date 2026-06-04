-- 결제 우회 차단: orders/payments 의 유저 직접 INSERT/UPDATE 정책 제거.
--
-- 배경(보안):
--   기존엔 RLS 가 유저에게 orders/payments 직접 쓰기를 허용했다.
--     · orders UPDATE: with_check 가 user_id 만 검사 → 유저가 PostgREST 로 자기 주문을
--       status='paid' 로 직접 변경 (결제 0원)
--     · payments INSERT: with_check user_id 만 → status='approved' 결제행 직접 삽입
--   둘 다 confirm-payment 의 서버검증(Toss 재확인·DB 금액 신뢰·멱등성)을 우회 가능.
--
-- 결제 기록/주문 확정은 service_role edge function(kakao-pay-approve / charge-approve /
-- 향후 service_role 로 전환할 confirm-payment)만 수행한다. 조회(SELECT own)는 유지.
--
-- 현재 활성 흐름(구독·하트충전)은 전부 service_role 로 쓰므로 영향 없음.
-- (Toss 상품주문 재활성화 시 confirm-payment 를 service_role 로 전환 + orders 를
--  서버에서 product 가격으로 생성하도록 배선해야 한다.)
drop policy if exists "Users can insert own payments" on public.payments;
drop policy if exists "Users can update own payments" on public.payments;
drop policy if exists "Users can insert own orders"   on public.orders;
drop policy if exists "Users can update own orders"   on public.orders;
