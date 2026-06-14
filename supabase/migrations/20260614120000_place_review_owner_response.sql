-- 후기 답변(owner_response) — 업체 소유자가 자기 업체에 달린 후기에 답글을 다는 기능.
-- place_inquiries(문의 답변) 패턴을 미러링: 소유자 UPDATE 정책 + 본문 불변 트리거.
-- 핵심 안전장치: 사장이 답변 권한(UPDATE)을 악용해 후기 본문·평점을 위·변조하지 못하게
-- 트리거가 답글 컬럼(owner_response*) 외의 변경을 차단한다.

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS owner_response TEXT
    CHECK (owner_response IS NULL OR char_length(owner_response) <= 1000),
  ADD COLUMN IF NOT EXISTS owner_response_at TIMESTAMPTZ;

-- 답변: 업체 소유자만 UPDATE (기존 작성자 본인 UPDATE 정책과 OR 로 공존).
-- 답글 외 컬럼 위·변조는 아래 트리거가 차단한다.
DROP POLICY IF EXISTS "Place owner can respond to reviews" ON public.place_reviews;
CREATE POLICY "Place owner can respond to reviews"
ON public.place_reviews FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.place_id = place_reviews.place_id
      AND p.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.place_id = place_reviews.place_id
      AND p.owner_user_id = auth.uid()
  )
);

-- 후기 본문 불변(소유자 한정) — 사장이 답글 외 필드를 바꾸지 못하게.
-- 작성자 본인의 자기 후기 수정(기존 동작)은 막지 않는다.
CREATE OR REPLACE FUNCTION public.lock_place_review_body()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.place_id = OLD.place_id
      AND p.owner_user_id = auth.uid()
  ) INTO is_owner;

  -- 답글(owner_response*)을 바꾸는 주체는 반드시 그 업체 소유자여야 한다.
  IF (NEW.owner_response IS DISTINCT FROM OLD.owner_response
      OR NEW.owner_response_at IS DISTINCT FROM OLD.owner_response_at)
     AND NOT is_owner THEN
    RAISE EXCEPTION 'review_owner_response_owner_only';
  END IF;

  -- 소유자가(자기 후기가 아닌) 후기를 수정할 때는 답글 컬럼만 바꿀 수 있다.
  IF is_owner AND OLD.user_id IS DISTINCT FROM auth.uid() THEN
    IF NEW.place_id   IS DISTINCT FROM OLD.place_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.title   IS DISTINCT FROM OLD.title
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.rating  IS DISTINCT FROM OLD.rating
       OR NEW.author  IS DISTINCT FROM OLD.author
       OR NEW.review_date IS DISTINCT FROM OLD.review_date
       OR NEW.created_at  IS DISTINCT FROM OLD.created_at
       OR NEW.sentiment   IS DISTINCT FROM OLD.sentiment
       OR NEW.ai_summary  IS DISTINCT FROM OLD.ai_summary THEN
      RAISE EXCEPTION 'review_body_immutable_for_owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_place_review_body ON public.place_reviews;
CREATE TRIGGER trg_lock_place_review_body
BEFORE UPDATE ON public.place_reviews
FOR EACH ROW EXECUTE FUNCTION public.lock_place_review_body();
