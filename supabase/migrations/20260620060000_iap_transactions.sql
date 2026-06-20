-- 인앱결제(IAP) 거래 원장 — Google Play(+추후 Apple) 영수증검증 결과를 멱등 기록.
-- store_txn_id(구매 purchaseToken/orderId) UNIQUE 로 중복 webhook·재시도에도 1회만 지급.
-- 전적으로 검증 엣지함수(service-role)만 기록 — 클라 접근 차단(RLS SELECT 만). subscription 토큰→user
-- 매핑(RTDN 수신 시 사용)도 이 테이블로. 설계: docs/260620_payment_compliance_plan.md §3.
create table if not exists public.iap_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,                 -- 'android' | 'ios'
  product_id text not null,               -- Google/Apple 상품ID
  store_txn_id text not null,             -- 멱등키: purchaseToken(구독) / orderId·token(소비성)
  kind text not null,                     -- 'hearts' | 'subscription'
  status text not null default 'verified',-- verified | refunded | revoked
  amount int,                             -- 표시·정산 참고(KRW, 없을 수 있음)
  raw jsonb,                              -- 검증 응답 원본(감사)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, store_txn_id)
);
create index if not exists idx_iap_tx_user on public.iap_transactions(user_id, created_at desc);
-- 구독 토큰 역조회(RTDN: token→user). product 가 구독인 행에서 token 으로 찾는다.
create index if not exists idx_iap_tx_token on public.iap_transactions(store_txn_id);

alter table public.iap_transactions enable row level security;
-- 본인 거래만 조회. INSERT/UPDATE 정책 없음 = 클라 차단(검증 함수 service-role 전용).
drop policy if exists iap_tx_owner_select on public.iap_transactions;
create policy iap_tx_owner_select on public.iap_transactions for select to authenticated
  using (user_id = auth.uid());

comment on table public.iap_transactions is 'IAP 영수증검증 원장(멱등). 지급/구독활성은 이 기록과 함께만. service-role 전용.';
