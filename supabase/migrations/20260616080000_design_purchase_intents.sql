-- 디자인 구매 결제 intent — ready 단계에서 만든 주문(order_number)에 디자인/포인트 정보를
-- 실어 approve 단계로 전달. 전적으로 edge function(service-role)이 관리(클라 접근 불가).
-- 설계: docs/260616_invitation_design_marketplace.md §6.
create table if not exists public.design_purchase_intents (
  order_number text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid not null references public.designer_designs(id) on delete cascade,
  points_used int not null default 0,
  gross int not null,              -- 할인 전 가격(KRW)
  created_at timestamptz not null default now()
);
alter table public.design_purchase_intents enable row level security;
-- 정책 없음 = 클라 접근 차단(service-role 만).
comment on table public.design_purchase_intents is '디자인 결제 ready→approve 전달용. edge function(service-role) 전용.';
