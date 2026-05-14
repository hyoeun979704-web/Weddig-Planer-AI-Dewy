-- Allow tip_video as a favorites item_type so users can ❤️ "오늘의 꿀팁" /
-- /magazine YouTube cards. The 찜 페이지의 "꿀팁" 탭 reads these rows.
--
-- influencer rows stay valid in the schema (FavoriteButton on InfluencerDetail
-- still works) but no longer surface in the Favorites UI — that flow is shelved
-- until the influencer 탭 returns.

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
