
-- Create vendors table (unified vendor/category table replacing separate category tables)
CREATE TABLE IF NOT EXISTS public.vendors (
  vendor_id integer PRIMARY KEY,
  name text NOT NULL,
  category_type text NOT NULL,
  region text,
  address text,
  thumbnail_url text,
  tel text,
  business_hours text,
  parking_location text,
  parking_hours text,
  sns_info jsonb,
  keywords text,
  amenities text,
  avg_rating numeric DEFAULT 4.0,
  review_count integer DEFAULT 0
);

-- Create ext_wedding_halls (wedding hall details linked to vendors)
CREATE TABLE IF NOT EXISTS public.ext_wedding_halls (
  vendor_id integer PRIMARY KEY REFERENCES public.vendors(vendor_id),
  meal_cost_range text,
  rental_cost_range text,
  meal_type text,
  parking_info text
);

-- Create ext_products (trousseau/appliance items)
CREATE TABLE IF NOT EXISTS public.ext_products (
  item_id integer PRIMARY KEY,
  vendor_id integer REFERENCES public.vendors(vendor_id),
  category_sub text,
  name text NOT NULL,
  model_no text,
  price integer,
  original_price integer,
  delivery_period text,
  as_warranty text,
  specs jsonb,
  purchase_url text
);

-- Create product_options
CREATE TABLE IF NOT EXISTS public.product_options (
  option_id integer PRIMARY KEY,
  item_id integer REFERENCES public.ext_products(item_id),
  option_name text,
  features text,
  extra_price integer DEFAULT 0,
  sort_order integer DEFAULT 0
);

-- Create shopping_products
CREATE TABLE IF NOT EXISTS public.shopping_products (
  shopping_product_id integer PRIMARY KEY,
  brand_id integer,
  product_name text NOT NULL,
  discount_rate integer DEFAULT 0,
  price integer,
  original_price integer,
  keywords text,
  rating numeric DEFAULT 4.0,
  review_count integer DEFAULT 0,
  sales_count integer DEFAULT 0,
  thumbnail_url text,
  detail_url text,
  cautions text
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  event_id integer PRIMARY KEY,
  vendor_id integer REFERENCES public.vendors(vendor_id),
  category text,
  title text NOT NULL,
  vendor_name text,
  benefit_detail text,
  description text,
  conditions text,
  cautions text,
  start_date text,
  end_date text,
  status text DEFAULT '진행중',
  view_count integer DEFAULT 0
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  review_id integer PRIMARY KEY,
  user_id integer,
  vendor_id integer REFERENCES public.vendors(vendor_id),
  item_id integer,
  rating numeric DEFAULT 5.0,
  content text,
  ai_summary text,
  created_at timestamptz DEFAULT now()
);

-- Create ext_hanbok (hanbok pricing compositions)
CREATE TABLE IF NOT EXISTS public.ext_hanbok (
  hanbok_id integer PRIMARY KEY,
  item_id integer REFERENCES public.ext_products(item_id),
  composition_name text,
  custom_price integer,
  rental_price integer,
  composition text,
  fabric_option1 text,
  fabric1_price integer DEFAULT 0,
  fabric_option2 text,
  fabric2_price integer DEFAULT 0,
  additional_options jsonb
);

-- Enable RLS on all new tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_wedding_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_hanbok ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Public read ext_wedding_halls" ON public.ext_wedding_halls FOR SELECT USING (true);
CREATE POLICY "Public read ext_products" ON public.ext_products FOR SELECT USING (true);
CREATE POLICY "Public read product_options" ON public.product_options FOR SELECT USING (true);
CREATE POLICY "Public read shopping_products" ON public.shopping_products FOR SELECT USING (true);
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public read ext_hanbok" ON public.ext_hanbok FOR SELECT USING (true);
