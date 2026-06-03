-- 업체 미디어 — 사진(갤러리). 모임장소(invitation_venue) 업체는 사진 대신 메뉴
-- 등록으로 사용한다(kind='menu', title=메뉴명, price=가격). 갤러리·메뉴는 운영자
-- 검토 면제(요구사항)이므로 별도 moderation 없이 즉시 노출.
--
-- 새 테이블이라 RLS 를 직접 정의: 공개 읽기 + 소유자만 쓰기.

CREATE TABLE IF NOT EXISTS public.place_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'photo', -- 'photo' | 'menu'
  image_url TEXT,
  title TEXT,       -- 메뉴명 (kind='menu')
  price INT,        -- 메뉴 가격 (kind='menu')
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_place_media_place ON public.place_media(place_id, display_order);
CREATE INDEX IF NOT EXISTS idx_place_media_owner ON public.place_media(owner_user_id);

ALTER TABLE public.place_media ENABLE ROW LEVEL SECURITY;

-- 공개 읽기(상세페이지 노출). 미디어는 본질적으로 공개 콘텐츠.
CREATE POLICY "Anyone can view place media"
  ON public.place_media FOR SELECT USING (true);

-- 소유자만 추가/수정/삭제.
CREATE POLICY "Owner can insert own media"
  ON public.place_media FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own media"
  ON public.place_media FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can delete own media"
  ON public.place_media FOR DELETE USING (owner_user_id = auth.uid());

COMMENT ON TABLE public.place_media IS '업체 사진/메뉴. invitation_venue 는 kind=menu(메뉴명·가격). 검토 면제.';
