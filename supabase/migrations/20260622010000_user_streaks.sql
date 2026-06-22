-- I9-b: 준비 스트릭 DB 영속화(+프리즈). 기존 useDailyStreak 는 localStorage-only 라
-- 기기 간 동기화가 안 됐다. 사용자당 1행으로 연속 접속일·최장·총일수·프리즈를 보관한다.
-- 체크인 계산(프리즈 적용 포함)은 클라이언트 순수 함수(applyCheckIn)에서 수행하고
-- 여기엔 단순 보관 + 본인 행 RLS 만 둔다(검증 불가한 SQL 함수 미사용).
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_days integer NOT NULL DEFAULT 0,
  last_checkin_date date,
  -- 프리즈: 하루 빠져도 연속을 지켜주는 보호권(상한 2). 7일 연속마다 +1 충전.
  freezes_available integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- 본인 행만 읽고 쓴다(스트릭은 개인 데이터). 커플 공유 대상 아님.
CREATE POLICY "user_streaks_select_own" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_streaks_insert_own" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_streaks_update_own" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
