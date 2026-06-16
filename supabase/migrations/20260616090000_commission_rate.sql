-- 중개수수료율 설정 — "초기 입점 0% → 이후 제휴 3%" 를 하드코딩 말고 데이터로 관리.
-- 업체(작가 포함)의 business_profiles 에 수수료율(bps: 300 = 3%, 기본 0%). 정산 시 적용.
-- 설계: docs/260616_invitation_design_marketplace.md §6. (PG: 토스페이먼츠 미사용.)
alter table public.business_profiles
  add column if not exists commission_rate_bps int not null default 0
    check (commission_rate_bps between 0 and 10000);

-- 디자인 구매 시점에 적용된 수수료를 기록(향후 작가 정산 계산 근거). 0% 면 작가 전액(PG수수료 제외).
alter table public.design_purchases
  add column if not exists commission_bps int not null default 0,
  add column if not exists commission_amount int not null default 0;

comment on column public.business_profiles.commission_rate_bps is '중개수수료율(bps). 초기 입점 0, 이후 제휴 300(3%). 정산 시 적용.';
comment on column public.design_purchases.commission_bps is '구매 시점 적용 수수료율(bps).';
comment on column public.design_purchases.commission_amount is '구매 시점 수수료액(KRW). 작가 정산 = amount - commission_amount - PG수수료.';
