-- Fix 1: Restrict couple-diary-photos SELECT to own folder only
DROP POLICY IF EXISTS "Users can view own folder diary photos" ON storage.objects;

CREATE POLICY "Users can view own folder diary photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'couple-diary-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Fix 2: Add validation to increment_claim_count to prevent unauthorized counter manipulation
CREATE OR REPLACE FUNCTION public.increment_claim_count(deal_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment if caller has a valid claim for this deal
  IF NOT EXISTS (
    SELECT 1 FROM public.deal_claims 
    WHERE deal_claims.deal_id = increment_claim_count.deal_id 
    AND deal_claims.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No valid claim found for this deal';
  END IF;
  
  UPDATE partner_deals
  SET claim_count = claim_count + 1
  WHERE id = deal_id;
END;
$$;