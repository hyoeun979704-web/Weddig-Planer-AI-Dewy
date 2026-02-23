
-- Create partner_deals table
CREATE TABLE public.partner_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  partner_name TEXT NOT NULL,
  partner_logo_url TEXT,
  banner_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  deal_type TEXT NOT NULL DEFAULT 'coupon',
  discount_info TEXT,
  original_price INTEGER,
  deal_price INTEGER,
  coupon_code TEXT,
  external_url TEXT,
  terms TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  claim_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner deals are publicly viewable"
  ON public.partner_deals FOR SELECT USING (true);

-- Create deal_claims table
CREATE TABLE public.deal_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.partner_deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id)
);

ALTER TABLE public.deal_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON public.deal_claims FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims"
  ON public.deal_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create increment_claim_count RPC
CREATE OR REPLACE FUNCTION public.increment_claim_count(deal_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE partner_deals
  SET claim_count = claim_count + 1
  WHERE id = deal_id;
END;
$$;

-- Add updated_at trigger for partner_deals
CREATE TRIGGER update_partner_deals_updated_at
  BEFORE UPDATE ON public.partner_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
