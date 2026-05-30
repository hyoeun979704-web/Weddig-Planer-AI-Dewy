-- payments.plan_type: 원본 결제의 의도된 플랜을 보존한다.
-- 멱등성 재호출 시 클라이언트가 보낸 type 을 검증하기 위함.
-- 기존 행은 amount 로 backfill (trial=100, monthly=4900, yearly=39000).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_type TEXT;

UPDATE public.payments
SET plan_type = CASE
  WHEN amount = 100 THEN 'trial'
  WHEN amount = 4900 THEN 'monthly'
  WHEN amount = 39000 THEN 'yearly'
  ELSE plan_type
END
WHERE plan_type IS NULL;
