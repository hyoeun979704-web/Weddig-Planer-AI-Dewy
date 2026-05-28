-- Subscription billing extensions for auto-renewal model (약관 제6조·제8조·제9조 대응)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS billing_key text,
  ADD COLUMN IF NOT EXISTS billing_provider text,
  ADD COLUMN IF NOT EXISTS last_renewal_notified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS billing_failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_billing_failure_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_billing_error text;

COMMENT ON COLUMN public.subscriptions.auto_renew IS '자동 갱신 활성화 여부. 약관 제8조 ②.';
COMMENT ON COLUMN public.subscriptions.next_billing_date IS '다음 자동 결제 예정일. 약관 제8조 ③ 7일 전 고지 대상.';
COMMENT ON COLUMN public.subscriptions.billing_key IS '결제대행사가 발급한 빌링키. 원본 결제수단은 보관하지 않음 (제6조 ③).';
COMMENT ON COLUMN public.subscriptions.last_renewal_notified_at IS '갱신 사전 고지 발송 시점. 중복 알림 방지.';
COMMENT ON COLUMN public.subscriptions.billing_failure_count IS '자동 갱신 결제 실패 누적 횟수. 약관 제8조 ⑤ 재시도 정책.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON public.subscriptions (next_billing_date)
  WHERE auto_renew = true AND status = 'active';

-- Audit log for billing attempts (약관 제8조·제9조 이행 증적)
CREATE TABLE IF NOT EXISTS public.billing_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  attempt_type text NOT NULL CHECK (attempt_type IN ('auto_renew','manual_retry','refund')),
  provider text NOT NULL,
  billing_key text,
  amount integer,
  status text NOT NULL CHECK (status IN ('pending','success','failed','refunded')),
  external_payment_id text,
  error_code text,
  error_message text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_attempts IS '자동 갱신·재시도·환불 시도 감사 로그.';

CREATE INDEX IF NOT EXISTS idx_billing_attempts_user
  ON public.billing_attempts (user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_attempts_subscription
  ON public.billing_attempts (subscription_id, attempted_at DESC);

ALTER TABLE public.billing_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_attempts_select_own" ON public.billing_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- RPC: 7일 이내 자동 갱신 예정 구독 SELECT (Edge Function 에서 service_role 로 호출)
CREATE OR REPLACE FUNCTION public.subscriptions_due_for_renewal_notification(
  days_ahead integer DEFAULT 7
)
RETURNS TABLE (
  subscription_id uuid,
  user_id uuid,
  plan text,
  next_billing_date timestamp with time zone,
  price integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.user_id,
    s.plan,
    s.next_billing_date,
    s.price
  FROM public.subscriptions s
  WHERE s.auto_renew = true
    AND s.status = 'active'
    AND s.next_billing_date IS NOT NULL
    AND s.next_billing_date BETWEEN now() AND now() + (days_ahead || ' days')::interval
    AND (s.last_renewal_notified_at IS NULL
         OR s.last_renewal_notified_at < s.next_billing_date - interval '8 days');
$$;

REVOKE ALL ON FUNCTION public.subscriptions_due_for_renewal_notification(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.subscriptions_due_for_renewal_notification(integer) TO service_role;
