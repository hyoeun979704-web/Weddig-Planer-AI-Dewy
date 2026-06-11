-- RSVP 고도화: 신랑/신부측 구분 + 동행 중 아동 수 (식수 산정용)
-- + 하객명단(guest_list_items)과의 연결 키 (RSVP 가져오기 중복 방지)
-- 멱등 작성 (20260608210000_invitation_rsvp.sql 패턴)

ALTER TABLE public.invitation_rsvp
  ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT 'undecided',
  ADD COLUMN IF NOT EXISTS child_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.invitation_rsvp
  DROP CONSTRAINT IF EXISTS invitation_rsvp_side_check,
  DROP CONSTRAINT IF EXISTS invitation_rsvp_child_count_check;
ALTER TABLE public.invitation_rsvp
  ADD CONSTRAINT invitation_rsvp_side_check
    CHECK (side IN ('undecided', 'groom', 'bride')),
  -- 아동은 동행(companion_count) 안에 포함되는 수
  ADD CONSTRAINT invitation_rsvp_child_count_check
    CHECK (child_count BETWEEN 0 AND 20 AND child_count <= companion_count);

-- 하객명단에 RSVP 출처 링크 (수기 입력 행은 NULL)
ALTER TABLE public.guest_list_items
  ADD COLUMN IF NOT EXISTS invitation_rsvp_id UUID
    REFERENCES public.invitation_rsvp(id) ON DELETE SET NULL;

-- 같은 RSVP 를 두 번 가져오기 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_list_items_rsvp_unique
  ON public.guest_list_items(invitation_rsvp_id)
  WHERE invitation_rsvp_id IS NOT NULL;
