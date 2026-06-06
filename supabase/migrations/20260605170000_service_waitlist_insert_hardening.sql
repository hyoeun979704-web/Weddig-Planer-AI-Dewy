-- service_waitlist INSERT 정책 하드닝.
--
-- 기존: "Anyone can register to waitlist" WITH CHECK (true)
--   → 누구나(익명 포함) 임의의 user_id 를 박아 타인 명의로 사전알림 행을
--     끼워 넣을 수 있었다(스푸핑/스팸 표면).
--
-- 변경: 익명 신청(user_id IS NULL)은 그대로 허용하되, user_id 를 채울 때는
--   반드시 본인(auth.uid()) 이어야 한다. Coming Soon 사전알림은 로그아웃
--   사용자도 신청 가능해야 하므로 익명 INSERT 자체는 유지한다.
--   (순수 스팸 차단은 RLS 영역 밖 — 필요 시 rate limit 으로 보강.)

DROP POLICY IF EXISTS "Anyone can register to waitlist" ON public.service_waitlist;

CREATE POLICY "Anyone can register to waitlist"
ON public.service_waitlist FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
