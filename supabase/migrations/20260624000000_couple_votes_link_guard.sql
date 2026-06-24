-- couple_votes 인가 강화 + 언링크 후 잔존 차단.
--
-- 문제(260624 감사):
--   원본 RLS(20260223140410)는 행의 user_id/partner_user_id 컬럼만 보고
--   couple_links 연동 여부를 전혀 검증하지 않았다.
--   1) INSERT WITH CHECK 가 `auth.uid() = user_id` 뿐이라, 공격자가
--      partner_user_id 에 임의의 victim UID 를 넣어 투표를 만들 수 있고,
--      victim 은 SELECT(`auth.uid() = partner_user_id`)로 그 투표를 자기 보드에
--      보게 된다 → 연동과 무관한 콘텐츠 주입(스팸·하라스먼트 벡터).
--   2) 언링크해도 couple_votes 행의 partner_user_id 는 그대로라, 헤어진 상대가
--      과거 투표·이유를 계속 조회·수정할 수 있었다(couple_diary 는
--      is_couple_member 게이트로 즉시 차단되는데 votes 만 비대칭으로 뚫림).
--
-- 해결: 파트너 측 접근을 is_couple_partner(현재 linked 여부)로 게이트한다.
--   • INSERT: 본인(user_id)만 작성하되 partner_user_id 는 NULL 이거나
--     "실제 내 linked 파트너"여야 함 → 임의 victim 주입 차단.
--   • SELECT/UPDATE: 본인 행이거나, 내가 partner 이면서 아직 linked 인 경우만
--     → 언링크 시 파트너 접근 즉시 소멸(데이터 삭제 없이 접근권만 회수).
--   • DELETE: 작성자(user_id) 전용 유지.
-- 재실행 안전(DROP IF EXISTS 선행).

-- ── SELECT: 본인 또는 (현재 연동된) 파트너 ──────────────────────────────────
DROP POLICY IF EXISTS "Users can view own couple votes" ON public.couple_votes;
DROP POLICY IF EXISTS "Couple members can view couple votes" ON public.couple_votes;
CREATE POLICY "Couple members can view couple votes"
  ON public.couple_votes FOR SELECT
  USING (
    auth.uid() = user_id
    OR (auth.uid() = partner_user_id AND public.is_couple_partner(user_id))
  );

-- ── INSERT: 본인 작성 + partner 는 실제 linked 파트너만 ─────────────────────
DROP POLICY IF EXISTS "Users can create couple votes" ON public.couple_votes;
DROP POLICY IF EXISTS "Couple members can create couple votes" ON public.couple_votes;
CREATE POLICY "Couple members can create couple votes"
  ON public.couple_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      partner_user_id IS NULL
      OR public.is_couple_partner(partner_user_id)
    )
  );

-- ── UPDATE: 본인 또는 (현재 연동된) 파트너 ──────────────────────────────────
DROP POLICY IF EXISTS "Users can update own couple votes" ON public.couple_votes;
DROP POLICY IF EXISTS "Couple members can update couple votes" ON public.couple_votes;
CREATE POLICY "Couple members can update couple votes"
  ON public.couple_votes FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (auth.uid() = partner_user_id AND public.is_couple_partner(user_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (auth.uid() = partner_user_id AND public.is_couple_partner(user_id))
  );

-- ── DELETE: 작성자 전용(기존 유지, 명시 재생성) ─────────────────────────────
DROP POLICY IF EXISTS "Users can delete own couple votes" ON public.couple_votes;
CREATE POLICY "Users can delete own couple votes"
  ON public.couple_votes FOR DELETE
  USING (auth.uid() = user_id);
