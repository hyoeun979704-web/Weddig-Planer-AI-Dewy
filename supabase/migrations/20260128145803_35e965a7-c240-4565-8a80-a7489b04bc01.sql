-- Add parent_comment_id column to community_comments for nested replies
ALTER TABLE public.community_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE;

-- Create index for faster queries on parent_comment_id
CREATE INDEX idx_community_comments_parent_id ON public.community_comments(parent_comment_id);