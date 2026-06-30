-- 1-B 실거래 인증 배지 — 경쟁 갭(웨딩북 방문·계약 인증후기) 대응.
-- 기존 source_type(광고/협찬/에디터 분류)·is_verified(운영자 수동검증)와 별개 축:
-- **작성자가 Dewy 에서 이 업체와 실제로 상담/계약 관계였는지**를 행동로그로 자동 판정.
--   contract : 이 업체를 예식장(wedding_venue_place_id)으로 등록한 사용자
--   consult  : 이 업체에 문의(place_inquiries) 또는 견적 메시지(quote_messages)를 보낸 사용자
--   NULL     : 행동로그 없음(일반 후기) 또는 외부 수집 후기(user_id NULL)
-- 보안: 클라이언트 INSERT 경로가 raw 라 tier 를 위조할 수 있으므로 **트리거가 서버에서
--       강제 세팅**(클라 입력 무시). 작성자 본인(NEW.user_id=auth.uid(), RLS 보장) 로그만 조회.
-- 개인화: author_region(작성자 지역)도 기록 → 뷰어와 같은 지역 후기 우선 정렬.

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS verification_tier TEXT;
ALTER TABLE public.place_reviews
  DROP CONSTRAINT IF EXISTS place_reviews_verification_tier_check;
ALTER TABLE public.place_reviews
  ADD CONSTRAINT place_reviews_verification_tier_check
  CHECK (verification_tier IS NULL OR verification_tier IN ('consult', 'contract'));

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS author_region TEXT;

COMMENT ON COLUMN public.place_reviews.verification_tier IS
  'Dewy 행동로그 기반 자동 인증 — consult(문의/견적)·contract(예식장 등록). 트리거가 서버에서 세팅(클라 위조 불가).';
COMMENT ON COLUMN public.place_reviews.author_region IS
  '작성 시점 작성자 지역(user_wedding_settings.wedding_region) — 같은 지역 후기 우선 정렬용.';

-- 인증 판정 + 작성자 지역 스탬프 트리거 함수.
CREATE OR REPLACE FUNCTION public.set_review_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT := NULL;
BEGIN
  -- 외부 수집 후기(user_id NULL)는 자동 인증 대상 아님.
  IF NEW.user_id IS NULL THEN
    NEW.verification_tier := NULL;
    RETURN NEW;
  END IF;

  -- 작성자 지역(같은 지역 후기 우선 정렬용).
  SELECT wedding_region INTO NEW.author_region
  FROM public.user_wedding_settings
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- 행동로그 기반 자동 인증 — 작성자 본인 로그만(NEW.user_id). 클라 입력은 덮어씀.
  IF EXISTS (
    SELECT 1 FROM public.user_wedding_settings
    WHERE user_id = NEW.user_id AND wedding_venue_place_id = NEW.place_id
  ) THEN
    v_tier := 'contract';
  ELSIF EXISTS (
    SELECT 1 FROM public.place_inquiries
    WHERE user_id = NEW.user_id AND place_id = NEW.place_id
  ) OR EXISTS (
    SELECT 1 FROM public.quote_messages
    WHERE sender_user_id = NEW.user_id AND place_id = NEW.place_id
  ) THEN
    v_tier := 'consult';
  END IF;

  NEW.verification_tier := v_tier;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_review_verification_trg ON public.place_reviews;
CREATE TRIGGER set_review_verification_trg
  BEFORE INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_verification();

-- 트리거 함수는 트리거로만 호출돼야 한다(RPC 직접호출 surface 제거 — security advisor
-- anon/authenticated_security_definer_function_executable 대응). 트리거는 EXECUTE 권한과
-- 무관하게 동작하므로 REVOKE 해도 인증 판정은 그대로 동작한다(실측 확인).
REVOKE EXECUTE ON FUNCTION public.set_review_verification() FROM PUBLIC, anon, authenticated;

-- 기존 행 백필(현재 사용자 후기 거의 0이지만 정합성 위해).
UPDATE public.place_reviews r SET
  author_region = (
    SELECT wedding_region FROM public.user_wedding_settings u
    WHERE u.user_id = r.user_id LIMIT 1
  ),
  verification_tier = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_wedding_settings u
      WHERE u.user_id = r.user_id AND u.wedding_venue_place_id = r.place_id
    ) THEN 'contract'
    WHEN EXISTS (
      SELECT 1 FROM public.place_inquiries pi
      WHERE pi.user_id = r.user_id AND pi.place_id = r.place_id
    ) OR EXISTS (
      SELECT 1 FROM public.quote_messages qm
      WHERE qm.sender_user_id = r.user_id AND qm.place_id = r.place_id
    ) THEN 'consult'
    ELSE NULL
  END
WHERE r.user_id IS NOT NULL;
