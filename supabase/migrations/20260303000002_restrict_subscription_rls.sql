-- C-2: Restrict subscriptions UPDATE policy so clients can only cancel their own subscription.
-- Plan upgrades (plan, expires_at, trial_ends_at) must go through the edge function
-- which uses the service role key and verifies payment first.

-- Drop the permissive update policy
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Allow clients to cancel only (status → 'cancelled', cancelled_at)
-- All other fields (plan, expires_at, trial_ends_at, price) cannot be changed from the client.
CREATE POLICY "Users can cancel own subscription" ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'cancelled'
  );
