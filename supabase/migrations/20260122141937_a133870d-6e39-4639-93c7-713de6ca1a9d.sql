-- Create a table for invitation gathering venues
CREATE TABLE public.invitation_venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  price_range TEXT NOT NULL,
  capacity_range TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT 4.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  venue_types TEXT[] DEFAULT '{}'::text[],
  amenity_options TEXT[] DEFAULT '{}'::text[],
  cuisine_options TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invitation_venues ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Invitation venues are publicly viewable" 
  ON public.invitation_venues 
  FOR SELECT 
  USING (true);

-- Create GIN indexes for array columns
CREATE INDEX idx_invitation_venues_venue_types ON public.invitation_venues USING GIN(venue_types);
CREATE INDEX idx_invitation_venues_amenity_options ON public.invitation_venues USING GIN(amenity_options);
CREATE INDEX idx_invitation_venues_cuisine_options ON public.invitation_venues USING GIN(cuisine_options);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_invitation_venues_updated_at
  BEFORE UPDATE ON public.invitation_venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.invitation_venues (name, address, price_range, capacity_range, venue_types, amenity_options, cuisine_options, rating, review_count, is_partner) VALUES
('레스토랑 라메르', '서울 강남구 압구정로 123', '50,000원~80,000원', '30~50명', ARRAY['레스토랑', '프라이빗룸'], ARRAY['주차', '발렛', 'WIFI'], ARRAY['양식', '코스요리'], 4.8, 156, true),
('카페 블룸', '서울 서초구 서초대로 456', '30,000원~50,000원', '20~40명', ARRAY['카페', '루프탑'], ARRAY['주차', 'WIFI', '포토존'], ARRAY['브런치', '디저트'], 4.6, 89, true),
('한정식 소담', '서울 종로구 북촌로 789', '60,000원~100,000원', '20~30명', ARRAY['한정식', '프라이빗룸'], ARRAY['주차', '발렛'], ARRAY['한식', '한정식'], 4.9, 234, true),
('이탈리안 비스트로', '서울 마포구 와우산로 321', '40,000원~70,000원', '40~60명', ARRAY['레스토랑', '홀대관'], ARRAY['주차', 'WIFI', '음향시설'], ARRAY['양식', '이탈리안'], 4.5, 112, false),
('가든웨딩홀 미니', '경기 성남시 분당구 정자동 654', '70,000원~120,000원', '50~100명', ARRAY['웨딩홀', '가든'], ARRAY['주차', '발렛', '웨딩플래너'], ARRAY['뷔페', '한식'], 4.7, 178, true);