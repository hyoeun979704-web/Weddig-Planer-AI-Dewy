-- 업체 문의(B2) — 예비부부가 입점 업체에 보내는 인앱 문의 + 업체 답변.
-- inquiries(고객센터용)와 별개. RLS: 작성자/업체 소유자만 접근. 멱등 작성.

CREATE TABLE IF NOT EXISTS public.place_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 100),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  contact TEXT CHECK (contact IS NULL OR char_length(contact) <= 50),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  answer TEXT CHECK (answer IS NULL OR char_length(answer) <= 2000),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_place_inquiries_place
  ON public.place_inquiries(place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_inquiries_user
  ON public.place_inquiries(user_id);

ALTER TABLE public.place_inquiries ENABLE ROW LEVEL SECURITY;

-- 작성: 본인 명의로, 소유자가 있는(입점) 업체에만 — 주인 없는 편지함 방지
DROP POLICY IF EXISTS "Users can create inquiries to claimed places" ON public.place_inquiries;
CREATE POLICY "Users can create inquiries to claimed places"
ON public.place_inquiries FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.place_id = place_inquiries.place_id
      AND p.owner_user_id IS NOT NULL
  )
);

-- 조회: 작성자 본인 또는 그 업체(place) 소유자
DROP POLICY IF EXISTS "Author or place owner can view" ON public.place_inquiries;
CREATE POLICY "Author or place owner can view"
ON public.place_inquiries FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.place_id = place_inquiries.place_id
      AND p.owner_user_id = auth.uid()
  )
);

-- 답변: 업체 소유자만 UPDATE (본문 위·변조는 아래 트리거가 차단)
DROP POLICY IF EXISTS "Place owner can answer" ON public.place_inquiries;
CREATE POLICY "Place owner can answer"
ON public.place_inquiries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.place_id = place_inquiries.place_id
      AND p.owner_user_id = auth.uid()
  )
);

-- 문의 본문 불변 — 업체가 답변 권한(UPDATE)으로 고객 문의 내용을 바꾸지 못하게
CREATE OR REPLACE FUNCTION public.lock_place_inquiry_body()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.place_id IS DISTINCT FROM OLD.place_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.contact IS DISTINCT FROM OLD.contact
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'inquiry_body_immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_place_inquiry_body ON public.place_inquiries;
CREATE TRIGGER trg_lock_place_inquiry_body
BEFORE UPDATE ON public.place_inquiries
FOR EACH ROW EXECUTE FUNCTION public.lock_place_inquiry_body();
