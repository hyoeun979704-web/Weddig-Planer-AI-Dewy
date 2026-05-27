-- Subscriptions are payment entitlements. Clients may read their own row, but
-- activation/cancellation must go through Edge Functions using service_role.
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
