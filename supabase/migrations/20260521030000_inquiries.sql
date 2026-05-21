-- 1:1 문의. 기존엔 Contact 폼이 저장 없이 "접수되었습니다" 토스트만 띄우고
-- MyInquiries 는 하드코딩 목업을 보여줬다(가짜 데이터). 실제 테이블로 대체.

CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'answered'
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_inquiries_user_created
  ON public.inquiries(user_id, created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 본인 문의만 조회/작성. 답변(answer/status)은 운영자(service_role/admin)가 갱신.
CREATE POLICY "Users can view their own inquiries"
ON public.inquiries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.inquiries IS '1:1 고객 문의. 답변은 운영자가 status=answered, answer 로 갱신.';
