-- 사용 이벤트 측정 테이블. 페르소나 v2 회고 권고 3번 — "데이터 없이 다음
-- 결정 못 한다" 를 해소. SDK(GA·posthog 등) 도입 없이 Supabase + RLS 로
-- 최소 구성하여 1인 운영 모델과 정렬.
--
-- 기록 대상 (MVP 4종):
--   - persona_dashboard_view
--   - schedule_compression_toggle
--   - value_tag_click
--   - guest_added / guest_rsvp_changed
-- 추후 이벤트 추가는 클라이언트만 변경하면 됨 (event_name 자유 문자열).

CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  event_name TEXT NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 60),

  -- 자유 형식 속성 — 칩 식별자·토글 방향 등 이벤트별 메타데이터.
  -- 크기 제한은 jsonb 자체 한계로 충분 (실제 props는 ~수십 바이트).
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 코호트 분석은 (event_name, user_id, day) 단위가 가장 흔하므로 그 순서.
CREATE INDEX IF NOT EXISTS user_events_name_user_created_idx
  ON public.user_events (event_name, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_events_user_created_idx
  ON public.user_events (user_id, created_at DESC);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- INSERT: 본인 행만 기록 가능. anon 사용자는 측정에서 제외 (RLS 정책상
-- auth.uid() 가 null 이면 매칭 안 됨).
DROP POLICY IF EXISTS "user_events_owner_insert" ON public.user_events;
CREATE POLICY "user_events_owner_insert"
  ON public.user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SELECT: 본인 행만. 집계는 admin 가 service_role 키로 별도 쿼리.
DROP POLICY IF EXISTS "user_events_owner_select" ON public.user_events;
CREATE POLICY "user_events_owner_select"
  ON public.user_events FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE / DELETE 정책 없음 — 이벤트는 immutable. 사용자 행은 auth 삭제
-- 시 CASCADE 로 정리됨.

COMMENT ON TABLE public.user_events IS
  '사용 이벤트 로그 (페르소나 v2 회고 권고 3번). 클라이언트의 트래킹 헬퍼가 fire-and-forget 으로 insert.';
