-- 하객 리스트 v0. 페르소나 시뮬레이션 v2의 G-2 (송태웅/이가영, 부산 320명)
-- 케이스에서 보고된 핵심 외부 이탈 페인포인트: 친지 수백명 규모 안내 리스트
-- 관리 도구가 없어 엑셀로 빠져나간다.
--
-- MVP 스코프: 사용자별 CRUD + RSVP 상태. CSV import·공유 링크·좌석 배치는
-- 후속 PR. 커플 공유는 couple_link 모델 도입 시점에 다시.

CREATE TABLE IF NOT EXISTS public.guest_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),

  -- 양가 분류 — 인원/식대 통계, 좌석 배치(추후)에 사용.
  side TEXT NOT NULL DEFAULT 'shared'
    CHECK (side IN ('groom', 'bride', 'shared')),

  -- 자유 입력 관계 (직장/친구/가족/친척/기타). 카테고리 자동 분류는 아직 안 함.
  relationship TEXT CHECK (relationship IS NULL OR char_length(relationship) <= 30),

  rsvp_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (rsvp_status IN ('pending', 'attending', 'declined', 'maybe')),

  -- 동반 포함 참석 인원. 0 = 아직 미정, 본인 1명 + 가족 N명 형태.
  attending_count INTEGER NOT NULL DEFAULT 1 CHECK (attending_count >= 0 AND attending_count <= 20),

  -- 연락처·메모는 자유 입력. 청첩장 발송·리마인드에 추후 활용.
  contact TEXT CHECK (contact IS NULL OR char_length(contact) <= 60),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 200),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_list_items_user_created_idx
  ON public.guest_list_items (user_id, created_at DESC);

ALTER TABLE public.guest_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_list_items_owner_select" ON public.guest_list_items;
CREATE POLICY "guest_list_items_owner_select"
  ON public.guest_list_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "guest_list_items_owner_insert" ON public.guest_list_items;
CREATE POLICY "guest_list_items_owner_insert"
  ON public.guest_list_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "guest_list_items_owner_update" ON public.guest_list_items;
CREATE POLICY "guest_list_items_owner_update"
  ON public.guest_list_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "guest_list_items_owner_delete" ON public.guest_list_items;
CREATE POLICY "guest_list_items_owner_delete"
  ON public.guest_list_items FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거 (다른 사용자 테이블과 일관).
CREATE OR REPLACE FUNCTION public.guest_list_items_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guest_list_items_updated_at ON public.guest_list_items;
CREATE TRIGGER guest_list_items_updated_at
  BEFORE UPDATE ON public.guest_list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.guest_list_items_set_updated_at();

COMMENT ON TABLE public.guest_list_items IS
  '하객 리스트. 페르소나 시뮬레이션 v2 권고 #6 — G-2 (대규모 친지) 케이스의 외부 이탈을 막기 위한 MVP CRUD.';
