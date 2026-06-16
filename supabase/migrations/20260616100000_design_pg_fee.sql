-- 정산 투명화 — PG 수수료를 업체(작가) 부담으로 공제. design_purchases 에 정산 내역 기록.
-- net_to_seller = 결제액 − 중개수수료 − PG수수료. (소비자 추가청구 아님 — 정산금 공제 방식.)
-- PG 실비율은 PG 계약별 → edge function 의 PG_FEE_BPS(env)로 설정. 기본 0(미설정 시 0으로 기록).
-- 설계: docs/260616_invitation_design_marketplace.md. PG 토스페이먼츠 미사용.
alter table public.design_purchases
  add column if not exists pg_fee int not null default 0,
  add column if not exists net_to_seller int not null default 0;

comment on column public.design_purchases.pg_fee is 'PG 결제수수료(업체 부담, 정산금에서 공제). PG_FEE_BPS 로 계산.';
comment on column public.design_purchases.net_to_seller is '작가 정산액 = amount - commission_amount - pg_fee.';
