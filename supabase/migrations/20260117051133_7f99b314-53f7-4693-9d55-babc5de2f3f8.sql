-- Create venues table for wedding venue data
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  price_per_person INTEGER NOT NULL,
  min_guarantee INTEGER NOT NULL DEFAULT 100,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (venues are public)
CREATE POLICY "Venues are publicly viewable" 
ON public.venues 
FOR SELECT 
USING (true);

-- Create an index for faster queries
CREATE INDEX idx_venues_is_partner ON public.venues(is_partner);
CREATE INDEX idx_venues_rating ON public.venues(rating DESC);