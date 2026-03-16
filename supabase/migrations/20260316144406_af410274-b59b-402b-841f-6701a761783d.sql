
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('individual', 'business', 'admin');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Business profiles table
CREATE TABLE public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_number text NOT NULL UNIQUE,
  representative_name text NOT NULL,
  business_type text,
  service_category text NOT NULL,
  phone text,
  address text,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  vendor_id integer REFERENCES vendors(vendor_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business profile" ON public.business_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own business profile" ON public.business_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 6. Add owner_user_id to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS owner_user_id uuid;

-- 7. Vendor gallery table
CREATE TABLE public.vendor_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id integer NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  display_order integer DEFAULT 0,
  caption text,
  image_type text DEFAULT 'gallery',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendor_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vendor gallery" ON public.vendor_gallery
  FOR SELECT USING (true);
CREATE POLICY "Vendor owners can insert gallery" ON public.vendor_gallery
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM vendors v WHERE v.vendor_id = vendor_gallery.vendor_id AND v.owner_user_id = auth.uid()));
CREATE POLICY "Vendor owners can update gallery" ON public.vendor_gallery
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors v WHERE v.vendor_id = vendor_gallery.vendor_id AND v.owner_user_id = auth.uid()));
CREATE POLICY "Vendor owners can delete gallery" ON public.vendor_gallery
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors v WHERE v.vendor_id = vendor_gallery.vendor_id AND v.owner_user_id = auth.uid()));

-- 8. Vendor highlights table (장점카드)
CREATE TABLE public.vendor_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id integer NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  icon text DEFAULT '✨',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendor_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vendor highlights" ON public.vendor_highlights
  FOR SELECT USING (true);
CREATE POLICY "Vendor owners can insert highlights" ON public.vendor_highlights
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM vendors v WHERE v.vendor_id = vendor_highlights.vendor_id AND v.owner_user_id = auth.uid()));
CREATE POLICY "Vendor owners can update highlights" ON public.vendor_highlights
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors v WHERE v.vendor_id = vendor_highlights.vendor_id AND v.owner_user_id = auth.uid()));
CREATE POLICY "Vendor owners can delete highlights" ON public.vendor_highlights
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM vendors v WHERE v.vendor_id = vendor_highlights.vendor_id AND v.owner_user_id = auth.uid()));

-- 9. Vendor owners can update and insert their own vendors
CREATE POLICY "Vendor owners can update own vendor" ON public.vendors
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Vendor owners can insert own vendor" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());

-- 10. Storage bucket for vendor images
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-images', 'vendor-images', true);

CREATE POLICY "Authenticated users can upload vendor images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public can view vendor images" ON storage.objects
  FOR SELECT USING (bucket_id = 'vendor-images');
CREATE POLICY "Users can delete own vendor images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vendor-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 11. Update handle_new_user to assign individual role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email);
  INSERT INTO public.subscriptions (user_id, plan, status, price) VALUES (NEW.id, 'free', 'active', 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'individual');
  RETURN NEW;
END;
$$;

-- 12. Sequence for self-registered vendor IDs (high range to avoid conflicts)
CREATE SEQUENCE IF NOT EXISTS vendor_id_seq START WITH 100000;
