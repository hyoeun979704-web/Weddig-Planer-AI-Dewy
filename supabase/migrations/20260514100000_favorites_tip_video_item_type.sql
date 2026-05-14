-- Add 'tip_video' to favorites.item_type CHECK constraint so users can
-- favorite (찜) YouTube tip videos surfaced in the 꿀팁 tab and the home tab's
-- "오늘의 꿀팁" section.

ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_item_type_check;

ALTER TABLE public.favorites ADD CONSTRAINT favorites_item_type_check
CHECK (item_type = ANY (ARRAY[
  'venue'::text,
  'studio'::text,
  'honeymoon'::text,
  'honeymoon_gift'::text,
  'jewelry'::text,
  'appliance'::text,
  'suit'::text,
  'hanbok'::text,
  'invitation_venues'::text,
  'community_post'::text,
  'deal'::text,
  'product'::text,
  'influencer'::text,
  'tip_video'::text
]));
