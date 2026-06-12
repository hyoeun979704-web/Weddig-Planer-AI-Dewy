-- 1:1 문의 CX 고도화 (멱등 작성):
--  - 운영자(admin)가 어드민에서 직접 조회·답변할 수 있는 RLS 정책
--    (기존엔 service_role 외부 도구로만 답변 가능 — 어드민 화면 추가에 필요)
--  - 답변 만족도(feedback up/down) 컬럼 — 답변 품질 CX 루프
--  - 일반 사용자의 UPDATE 는 feedback 컬럼만 허용(트리거 가드 — 본문/답변 변조 차단)

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('up', 'down'));

-- 운영자 전체 조회/갱신(답변 작성)
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.inquiries;
CREATE POLICY "Admins can view all inquiries"
ON public.inquiries FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update inquiries" ON public.inquiries;
CREATE POLICY "Admins can update inquiries"
ON public.inquiries FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 본인 문의 만족도 갱신 (어떤 컬럼이 바뀌는지는 아래 트리거가 강제)
DROP POLICY IF EXISTS "Users can update own inquiry feedback" ON public.inquiries;
CREATE POLICY "Users can update own inquiry feedback"
ON public.inquiries FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS 는 행 단위라 컬럼 제한이 안 됨 → 트리거로 일반 사용자 UPDATE 를
-- feedback 만으로 제한(접수 본문·운영자 답변·상태 변조 차단).
CREATE OR REPLACE FUNCTION public.guard_inquiry_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- service_role(auth.uid() IS NULL)·운영자는 제한 없음(답변 작성 경로).
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id     IS DISTINCT FROM OLD.user_id
     OR NEW.category    IS DISTINCT FROM OLD.category
     OR NEW.title       IS DISTINCT FROM OLD.title
     OR NEW.content     IS DISTINCT FROM OLD.content
     OR NEW.status      IS DISTINCT FROM OLD.status
     OR NEW.answer      IS DISTINCT FROM OLD.answer
     OR NEW.answered_at IS DISTINCT FROM OLD.answered_at
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'inquiry_feedback_only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inquiries_user_update_guard ON public.inquiries;
CREATE TRIGGER trg_inquiries_user_update_guard
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.guard_inquiry_user_update();
