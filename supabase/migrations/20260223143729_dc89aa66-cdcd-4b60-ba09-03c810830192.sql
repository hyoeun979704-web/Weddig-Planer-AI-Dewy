
-- Input length constraints for defense-in-depth
ALTER TABLE community_posts ADD CONSTRAINT check_title_length CHECK (length(title) <= 200);
ALTER TABLE community_posts ADD CONSTRAINT check_content_length CHECK (length(content) <= 10000);
ALTER TABLE couple_diary ADD CONSTRAINT check_diary_title_length CHECK (length(title) <= 100);
ALTER TABLE couple_diary ADD CONSTRAINT check_diary_content_length CHECK (length(content) <= 10000);
ALTER TABLE couple_votes ADD CONSTRAINT check_topic_length CHECK (length(topic) <= 200);
ALTER TABLE couple_votes ADD CONSTRAINT check_option_length CHECK (length(option_a) <= 200 AND length(option_b) <= 200);
ALTER TABLE couple_votes ADD CONSTRAINT check_reason_length CHECK (
  (my_reason IS NULL OR length(my_reason) <= 500) AND
  (partner_reason IS NULL OR length(partner_reason) <= 500)
);

-- Fix overly permissive storage SELECT policy
DROP POLICY IF EXISTS "Users can view own folder diary photos" ON storage.objects;
CREATE POLICY "Users can view own folder diary photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'couple-diary-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
