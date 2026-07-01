-- 3-B 첫 조각 — 홀 예약 "가능일" 수집·표시(실시간 예약 거래는 이월).
-- 파트너가 자기 홀의 날짜별 상태(가능/마감/잔여적음)를 입력하고, 소비자는 상세페이지에서
-- 확인한다. 개인화: 소비자의 예식 예정일(wedding_date)에 이 홀이 가능한지 바로 알려준다.
-- RLS: 가능일은 공개 정보(영업시간 성격)라 SELECT 공개, 쓰기는 그 place 소유자만.

CREATE TABLE IF NOT EXISTS public.place_availability (
  place_id uuid NOT NULL REFERENCES public.places(place_id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'limited')),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, date)
);

CREATE INDEX IF NOT EXISTS idx_place_availability_place_date
  ON public.place_availability (place_id, date);

ALTER TABLE public.place_availability ENABLE ROW LEVEL SECURITY;

-- 소비자·비로그인 포함 누구나 가능일 조회(공개 정보).
DROP POLICY IF EXISTS "place_availability_public_read" ON public.place_availability;
CREATE POLICY "place_availability_public_read"
  ON public.place_availability FOR SELECT USING (true);

-- 쓰기는 그 place 를 소유한 사장님만. WITH CHECK 에서 places 소유까지 확인(owner_user_id
-- 만 맞추고 남의 place_id 를 넣는 위조 차단).
DROP POLICY IF EXISTS "place_availability_owner_insert" ON public.place_availability;
CREATE POLICY "place_availability_owner_insert"
  ON public.place_availability FOR INSERT
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = place_availability.place_id AND p.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "place_availability_owner_update" ON public.place_availability;
CREATE POLICY "place_availability_owner_update"
  ON public.place_availability FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.place_id = place_availability.place_id AND p.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "place_availability_owner_delete" ON public.place_availability;
CREATE POLICY "place_availability_owner_delete"
  ON public.place_availability FOR DELETE
  USING (owner_user_id = auth.uid());

COMMENT ON TABLE public.place_availability IS
  '홀 날짜별 예약 가능/마감 상태(파트너 입력·공개 조회). 실시간 예약 거래는 별도(이월).';
