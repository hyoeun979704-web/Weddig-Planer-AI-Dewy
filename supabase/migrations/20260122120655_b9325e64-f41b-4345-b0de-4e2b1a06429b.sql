-- Create studios table (스드메)
CREATE TABLE public.studios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  price_per_person INTEGER NOT NULL,
  min_guarantee INTEGER NOT NULL DEFAULT 100,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  package_types TEXT[] DEFAULT '{}'::text[],
  style_options TEXT[] DEFAULT '{}'::text[],
  service_options TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create honeymoon table (허니문)
CREATE TABLE public.honeymoon (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  price_range TEXT NOT NULL,
  duration TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  trip_types TEXT[] DEFAULT '{}'::text[],
  included_services TEXT[] DEFAULT '{}'::text[],
  accommodation_types TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create honeymoon_gifts table (혼수·골든타임)
CREATE TABLE public.honeymoon_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price_range TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  category_types TEXT[] DEFAULT '{}'::text[],
  brand_options TEXT[] DEFAULT '{}'::text[],
  delivery_options TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appliances table (가전·예물)
CREATE TABLE public.appliances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price_range TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  category_types TEXT[] DEFAULT '{}'::text[],
  brand_options TEXT[] DEFAULT '{}'::text[],
  feature_options TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suits table (예복)
CREATE TABLE public.suits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  price_range TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  suit_types TEXT[] DEFAULT '{}'::text[],
  brand_options TEXT[] DEFAULT '{}'::text[],
  service_options TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hanbok table (한복)
CREATE TABLE public.hanbok (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  price_range TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  hanbok_types TEXT[] DEFAULT '{}'::text[],
  style_options TEXT[] DEFAULT '{}'::text[],
  service_options TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honeymoon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.honeymoon_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hanbok ENABLE ROW LEVEL SECURITY;

-- Create public read policies for all tables
CREATE POLICY "Studios are publicly viewable" ON public.studios FOR SELECT USING (true);
CREATE POLICY "Honeymoon packages are publicly viewable" ON public.honeymoon FOR SELECT USING (true);
CREATE POLICY "Honeymoon gifts are publicly viewable" ON public.honeymoon_gifts FOR SELECT USING (true);
CREATE POLICY "Appliances are publicly viewable" ON public.appliances FOR SELECT USING (true);
CREATE POLICY "Suits are publicly viewable" ON public.suits FOR SELECT USING (true);
CREATE POLICY "Hanbok are publicly viewable" ON public.hanbok FOR SELECT USING (true);

-- Create GIN indexes for array columns (for efficient filtering)
CREATE INDEX idx_studios_package_types ON public.studios USING GIN(package_types);
CREATE INDEX idx_studios_style_options ON public.studios USING GIN(style_options);
CREATE INDEX idx_studios_service_options ON public.studios USING GIN(service_options);

CREATE INDEX idx_honeymoon_trip_types ON public.honeymoon USING GIN(trip_types);
CREATE INDEX idx_honeymoon_included_services ON public.honeymoon USING GIN(included_services);
CREATE INDEX idx_honeymoon_accommodation_types ON public.honeymoon USING GIN(accommodation_types);

CREATE INDEX idx_honeymoon_gifts_category_types ON public.honeymoon_gifts USING GIN(category_types);
CREATE INDEX idx_honeymoon_gifts_brand_options ON public.honeymoon_gifts USING GIN(brand_options);
CREATE INDEX idx_honeymoon_gifts_delivery_options ON public.honeymoon_gifts USING GIN(delivery_options);

CREATE INDEX idx_appliances_category_types ON public.appliances USING GIN(category_types);
CREATE INDEX idx_appliances_brand_options ON public.appliances USING GIN(brand_options);
CREATE INDEX idx_appliances_feature_options ON public.appliances USING GIN(feature_options);

CREATE INDEX idx_suits_suit_types ON public.suits USING GIN(suit_types);
CREATE INDEX idx_suits_brand_options ON public.suits USING GIN(brand_options);
CREATE INDEX idx_suits_service_options ON public.suits USING GIN(service_options);

CREATE INDEX idx_hanbok_hanbok_types ON public.hanbok USING GIN(hanbok_types);
CREATE INDEX idx_hanbok_style_options ON public.hanbok USING GIN(style_options);
CREATE INDEX idx_hanbok_service_options ON public.hanbok USING GIN(service_options);