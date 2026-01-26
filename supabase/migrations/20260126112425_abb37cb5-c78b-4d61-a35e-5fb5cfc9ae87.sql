-- Create storage bucket for community post images
INSERT INTO storage.buckets (id, name, public) VALUES ('community-images', 'community-images', true);

-- Create policies for community images storage
CREATE POLICY "Community images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-images');

CREATE POLICY "Authenticated users can upload community images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'community-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own community images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own community images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);