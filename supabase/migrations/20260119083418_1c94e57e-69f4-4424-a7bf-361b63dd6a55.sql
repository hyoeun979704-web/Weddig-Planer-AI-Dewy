-- Add new filter columns to venues table
-- hall_types: 홀타입 (어두운홀, 밝은홀, 야외, 단독홀, 호텔)
ALTER TABLE public.venues ADD COLUMN hall_types text[] DEFAULT '{}';

-- meal_options: 식사 옵션 (뷔페, 양식코스, 한식코스, 중식코스, 일식코스)
ALTER TABLE public.venues ADD COLUMN meal_options text[] DEFAULT '{}';

-- event_options: 이벤트옵션 (포토부스, 벌룬이펙트, 뮤지컬, 돔오픈, 라이브 연주)
ALTER TABLE public.venues ADD COLUMN event_options text[] DEFAULT '{}';

-- Create GIN indexes for array containment queries
CREATE INDEX idx_venues_hall_types ON public.venues USING GIN(hall_types);
CREATE INDEX idx_venues_meal_options ON public.venues USING GIN(meal_options);
CREATE INDEX idx_venues_event_options ON public.venues USING GIN(event_options);