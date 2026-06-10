-- 20260608210000_invitation_rsvp.sql
-- 하객 참석 의사 수집을 위한 RSVP 테이블 및 RLS 정책.
--
-- 주의: 이 테이블은 마이그레이션 기록 없이 수동(SQL 에디터)으로 먼저 생성된 적이 있고,
-- 그 버전은 CHECK 제약이 없고 INSERT WITH CHECK(true)·타 사용자 SELECT 허용 등
-- 정책이 취약했다. 따라서 전체를 멱등(idempotent) 교정형으로 작성한다.

CREATE TABLE IF NOT EXISTS public.invitation_rsvp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_attending BOOLEAN NOT NULL DEFAULT TRUE,
  meal_preference TEXT NOT NULL DEFAULT 'undecided',
  companion_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CHECK 제약 (수동 생성분에 누락 — 무결성 보장)
ALTER TABLE public.invitation_rsvp
  DROP CONSTRAINT IF EXISTS invitation_rsvp_name_check,
  DROP CONSTRAINT IF EXISTS invitation_rsvp_meal_preference_check,
  DROP CONSTRAINT IF EXISTS invitation_rsvp_companion_count_check,
  DROP CONSTRAINT IF EXISTS invitation_rsvp_message_check;
ALTER TABLE public.invitation_rsvp
  ADD CONSTRAINT invitation_rsvp_name_check
    CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  ADD CONSTRAINT invitation_rsvp_meal_preference_check
    CHECK (meal_preference IN ('undecided', 'yes', 'no')),
  ADD CONSTRAINT invitation_rsvp_companion_count_check
    CHECK (companion_count BETWEEN 0 AND 20),
  ADD CONSTRAINT invitation_rsvp_message_check
    CHECK (message IS NULL OR char_length(message) <= 500);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_invitation_rsvp_invitation_id
  ON public.invitation_rsvp(invitation_id);

-- RLS 활성화
ALTER TABLE public.invitation_rsvp ENABLE ROW LEVEL SECURITY;

-- 정책 1: 익명 하객 포함 누구나 제출 가능 — 단, '발행된' 청첩장에만.
-- (수동 생성분은 WITH CHECK(true) 로 draft 포함 아무 청첩장에나 삽입 가능했음)
DROP POLICY IF EXISTS "Anyone can submit RSVP" ON public.invitation_rsvp;
CREATE POLICY "Anyone can submit RSVP"
ON public.invitation_rsvp FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = public.invitation_rsvp.invitation_id
      AND i.status = 'published'
  )
);

-- 정책 2: 조회는 청첩장 생성자 본인만.
-- (수동 생성분은 OR i.status='published' 로 타인의 하객 명단·메시지 PII 가 노출됐음)
DROP POLICY IF EXISTS "Creators can view RSVPs of their invitations" ON public.invitation_rsvp;
CREATE POLICY "Creators can view RSVPs of their invitations"
ON public.invitation_rsvp FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = public.invitation_rsvp.invitation_id
      AND i.user_id = auth.uid()
  )
);

-- 정책 3: 삭제도 생성자 본인만.
DROP POLICY IF EXISTS "Creators can delete RSVPs of their invitations" ON public.invitation_rsvp;
CREATE POLICY "Creators can delete RSVPs of their invitations"
ON public.invitation_rsvp FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.id = public.invitation_rsvp.invitation_id
      AND i.user_id = auth.uid()
  )
);

-- 스팸 방어: 익명 INSERT 가 열려 있으므로 청첩장당 RSVP 행 수를 상한으로 제한.
-- (IP 단위 레이트리밋은 DB 레벨에서 불가 — 무한 적재만 차단)
CREATE OR REPLACE FUNCTION public.check_invitation_rsvp_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.invitation_rsvp
    WHERE invitation_id = NEW.invitation_id
  ) >= 500 THEN
    RAISE EXCEPTION 'rsvp_limit_reached';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invitation_rsvp_cap ON public.invitation_rsvp;
CREATE TRIGGER trg_invitation_rsvp_cap
BEFORE INSERT ON public.invitation_rsvp
FOR EACH ROW EXECUTE FUNCTION public.check_invitation_rsvp_cap();
