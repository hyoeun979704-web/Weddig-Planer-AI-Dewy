-- 구독 자동갱신(a) 전환 토대: subscriptions 정기결제 컬럼 추가 (추가형 — 무위험)
--
-- 설계: docs/260620_subscription_autorenew_plan.md
-- 실제 정기결제 로직(ready/approve SID 수신, charge 잡, cancel PG해지)은 KakaoPay 정기결제
-- sandbox e2e 검증 후 활성화한다. 이 마이그는 그 토대가 되는 nullable 컬럼만 추가하므로 기존
-- 단건 결제 흐름에 영향이 없다.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS sid text,                       -- KakaoPay 정기결제키(SID)
  ADD COLUMN IF NOT EXISTS next_billing_at timestamptz,    -- 다음 자동청구 예정 시각
  ADD COLUMN IF NOT EXISTS last_billing_at timestamptz;    -- 마지막 자동청구 시각

COMMENT ON COLUMN public.subscriptions.sid IS 'KakaoPay 정기결제키(SID). kakaopay_recurring 결제수단에서 재청구에 사용.';
COMMENT ON COLUMN public.subscriptions.next_billing_at IS '다음 자동청구 예정 시각. charge-subscriptions 잡이 이 시각 이후 대상을 청구.';
COMMENT ON COLUMN public.subscriptions.last_billing_at IS '마지막 자동청구 성공 시각.';

-- 재결제 잡 조회 인덱스(active + 도래분).
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON public.subscriptions (next_billing_at)
  WHERE status = 'active' AND sid IS NOT NULL;
