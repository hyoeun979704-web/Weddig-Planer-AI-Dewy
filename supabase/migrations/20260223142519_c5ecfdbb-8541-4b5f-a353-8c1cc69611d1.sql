
-- Create couple_links table
CREATE TABLE public.couple_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_user_id UUID,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own couple links"
  ON public.couple_links FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Users can insert own couple links"
  ON public.couple_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update involved couple links"
  ON public.couple_links FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Users can delete own couple links"
  ON public.couple_links FOR DELETE
  USING (auth.uid() = user_id);

-- Create couple_diary table
CREATE TABLE public.couple_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_link_id UUID NOT NULL REFERENCES public.couple_links(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_diary ENABLE ROW LEVEL SECURITY;

-- Security definer function to check couple membership
CREATE OR REPLACE FUNCTION public.is_couple_member(_user_id UUID, _couple_link_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_links
    WHERE id = _couple_link_id
      AND (user_id = _user_id OR partner_user_id = _user_id)
      AND status = 'linked'
  );
$$;

CREATE POLICY "Couple members can view diary entries"
  ON public.couple_diary FOR SELECT
  USING (public.is_couple_member(auth.uid(), couple_link_id));

CREATE POLICY "Couple members can insert diary entries"
  ON public.couple_diary FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.is_couple_member(auth.uid(), couple_link_id));

CREATE POLICY "Authors can update own diary entries"
  ON public.couple_diary FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own diary entries"
  ON public.couple_diary FOR DELETE
  USING (auth.uid() = author_id);

-- Create couple_diary_photos table
CREATE TABLE public.couple_diary_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES public.couple_diary(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_diary_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can view diary photos"
  ON public.couple_diary_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couple_diary d
      WHERE d.id = diary_id
        AND public.is_couple_member(auth.uid(), d.couple_link_id)
    )
  );

CREATE POLICY "Couple members can insert diary photos"
  ON public.couple_diary_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_diary d
      WHERE d.id = diary_id
        AND d.author_id = auth.uid()
    )
  );

CREATE POLICY "Photo owners can delete diary photos"
  ON public.couple_diary_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.couple_diary d
      WHERE d.id = diary_id
        AND d.author_id = auth.uid()
    )
  );

-- Create couple-diary-photos storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-diary-photos', 'couple-diary-photos', false);

-- Storage policies
CREATE POLICY "Users can upload own diary photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'couple-diary-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own folder diary photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'couple-diary-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own diary photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'couple-diary-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add updated_at trigger
CREATE TRIGGER update_couple_links_updated_at
  BEFORE UPDATE ON public.couple_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_couple_diary_updated_at
  BEFORE UPDATE ON public.couple_diary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
