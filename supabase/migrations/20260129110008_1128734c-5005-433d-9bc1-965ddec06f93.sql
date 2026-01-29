-- Drop the old check constraint
ALTER TABLE public.favorites DROP CONSTRAINT favorites_item_type_check;

-- Add updated check constraint with community_post and invitation_venues
ALTER TABLE public.favorites ADD CONSTRAINT favorites_item_type_check 
CHECK (item_type = ANY (ARRAY['venue'::text, 'studio'::text, 'honeymoon'::text, 'honeymoon_gift'::text, 'appliance'::text, 'suit'::text, 'hanbok'::text, 'invitation_venues'::text, 'community_post'::text]));