-- Create community posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  has_image BOOLEAN DEFAULT false,
  image_urls TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community likes table
CREATE TABLE public.community_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Posts are publicly viewable" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are publicly viewable" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "Users can create their own comments" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.community_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Likes are publicly viewable" ON public.community_likes FOR SELECT USING (true);
CREATE POLICY "Users can add their own likes" ON public.community_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own likes" ON public.community_likes FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample posts for testing
INSERT INTO public.community_posts (id, user_id, category, title, content, has_image, views) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', '웨딩홀', '강남 웨딩홀 투어 후기 공유해요!', '지난 주말에 강남 쪽 웨딩홀 5군데 투어 다녀왔어요. 각 웨딩홀 장단점 정리해서 공유드립니다.

1. A웨딩홀 - 시설이 깔끔하고 접근성이 좋아요. 다만 주차가 조금 불편해요.
2. B웨딩홀 - 홀이 넓고 천장이 높아서 웅장한 느낌이 들어요.
3. C웨딩홀 - 가성비가 좋은 편이에요. 음식도 괜찮았어요.

궁금하신 점 있으시면 댓글로 물어봐주세요!', true, 230),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', '스드메', '스드메 패키지 vs 개별계약 고민중이에요', '예산이 한정되어있는데 스드메 패키지로 할지 개별로 할지 너무 고민되네요.

패키지의 장점:
- 한번에 해결되는 편리함
- 패키지 할인

개별계약의 장점:
- 원하는 업체 선택 가능
- 품질 조절 가능

경험자분들 조언 부탁드려요!', false, 456),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', '혼수', '가전 혼수 브랜드별 비교 정리', '삼성, LG, 다이슨 등 가전 브랜드별로 가격대, AS, 품질 비교해서 정리했어요.

냉장고: LG가 전체적으로 만족도가 높았어요
세탁기: 삼성 비스포크가 디자인이 예뻐요
청소기: 다이슨이 성능은 좋은데 AS가 아쉬워요

참고하세요!', true, 1203);