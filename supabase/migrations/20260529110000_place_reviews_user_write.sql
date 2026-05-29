-- place_reviews 에 사용자 작성 흐름 추가
-- 1) user_id 컬럼 (기존 scrape/seed row 와 공존; user_id IS NULL = 외부 출처)
-- 2) 같은 사용자가 같은 장소에 2회 작성 차단 (partial unique)
-- 3) 본인 row INSERT/UPDATE/DELETE 정책
-- 4) avg_rating / review_count 자동 갱신 트리거
-- 5) 사용자 첫 작성 시 3,000P 보너스 RPC (one-shot reason 인덱스에 추가)

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS place_reviews_user_place_unique
  ON public.place_reviews (user_id, place_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_place_reviews_user
  ON public.place_reviews (user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "place_reviews_insert_own" ON public.place_reviews;
CREATE POLICY "place_reviews_insert_own" ON public.place_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_reviews_update_own" ON public.place_reviews;
CREATE POLICY "place_reviews_update_own" ON public.place_reviews
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "place_reviews_delete_own" ON public.place_reviews;
CREATE POLICY "place_reviews_delete_own" ON public.place_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- avg_rating / review_count 자동 갱신 (places.place_id 기준)
CREATE OR REPLACE FUNCTION public.recompute_place_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_place_id uuid := COALESCE(NEW.place_id, OLD.place_id);
BEGIN
  UPDATE public.places p
     SET avg_rating   = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.place_reviews WHERE place_id = v_place_id), 0),
         review_count = (SELECT COUNT(*) FROM public.place_reviews WHERE place_id = v_place_id)
   WHERE p.place_id = v_place_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 트리거 함수는 직접 RPC 호출 불필요 — anon/authenticated 권한 회수
REVOKE EXECUTE ON FUNCTION public.recompute_place_review_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_place_review_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_place_review_stats() FROM authenticated;

DROP TRIGGER IF EXISTS place_reviews_stats_aiud ON public.place_reviews;
CREATE TRIGGER place_reviews_stats_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.place_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_place_review_stats();

-- 사용자 후기 작성 RPC — 사용자별 최초 1회 3,000P 적립.
-- 같은 (user_id, place_id) 두 번째 INSERT 는 partial unique index 로 차단되어
-- 'already reviewed' 예외로 전파된다.
CREATE OR REPLACE FUNCTION public.submit_place_review(
  p_place_id uuid,
  p_rating   numeric,
  p_title    text,
  p_content  text
)
RETURNS TABLE(
  review_id     uuid,
  awarded       boolean,
  amount        integer,
  balance_after integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_review uuid;
  v_award  boolean := false;
  v_amount integer := 0;
  v_bal    integer;
  v_author text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF p_content IS NULL OR length(trim(p_content)) < 10 THEN
    RAISE EXCEPTION 'content must be at least 10 chars';
  END IF;

  SELECT COALESCE(NULLIF(raw_user_meta_data->>'nickname',''),
                  NULLIF(raw_user_meta_data->>'full_name',''),
                  split_part(email, '@', 1),
                  '익명')
    INTO v_author
  FROM auth.users WHERE id = v_user;

  BEGIN
    INSERT INTO public.place_reviews
      (place_id, user_id, title, content, author, rating, review_date,
       source_type, is_verified)
    VALUES
      (p_place_id, v_user, NULLIF(trim(p_title), ''), trim(p_content),
       v_author, p_rating, (now() AT TIME ZONE 'Asia/Seoul')::date,
       'user_unverified', false)
    RETURNING place_reviews.review_id INTO v_review;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'already reviewed' USING ERRCODE='unique_violation';
  END;

  -- 첫 작성 보상: one-shot reason 인덱스가 두번째 호출 차단 (unique_violation)
  BEGIN
    SELECT ep.balance_after INTO v_bal
      FROM public.earn_points(v_user, 3000, 'place_review_first', v_review) AS ep;
    v_award := true;
    v_amount := 3000;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT up.balance INTO v_bal FROM public.user_points up WHERE up.user_id = v_user;
  END;

  RETURN QUERY SELECT v_review, v_award, v_amount, COALESCE(v_bal, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_place_review(uuid, numeric, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_place_review(uuid, numeric, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.submit_place_review(uuid, numeric, text, text) TO authenticated;

-- place_review_first 는 사용자별 1회만 적립되도록 one-shot reason 인덱스에 추가
DROP INDEX IF EXISTS public.point_transactions_one_shot_reasons;
CREATE UNIQUE INDEX point_transactions_one_shot_reasons
  ON public.point_transactions (user_id, reason)
  WHERE reason = ANY (ARRAY[
    'signup_bonus', 'signup_bonus_backfill',
    'first_post', 'first_like', 'first_comment',
    'tutorial_master', 'referral_redeemed',
    'place_review_first'
  ]);
