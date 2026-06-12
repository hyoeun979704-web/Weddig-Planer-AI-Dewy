-- AI 플래너 채팅 영속화 + 응답 만족도 + 무료/유료 차등 (멱등 작성).
--  - 세션(채팅창): 무료 1개 / 프리미엄 5개 — INSERT 트리거로 서버 강제
--  - 보관 용량: 세션당 메시지 무료 100 / 프리미엄 500 — 초과분 오래된 순 자동 정리
--  - 만족도: assistant 메시지에 up/down 피드백 컬럼 (본인만 기록)
-- 한도 수치는 클라 src/lib/aiChat.ts 의 상수와 미러 — 변경 시 양쪽 동시 수정.

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '새 채팅',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user
  ON public.ai_chat_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  intent TEXT,
  feedback TEXT CHECK (feedback IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
  ON public.ai_chat_messages(session_id, created_at);

-- ── RLS: 본인 행만 ───────────────────────────────────────────
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own chat sessions" ON public.ai_chat_sessions;
CREATE POLICY "Users own chat sessions" ON public.ai_chat_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own chat messages" ON public.ai_chat_messages;
CREATE POLICY "Users own chat messages" ON public.ai_chat_messages
  FOR ALL USING (auth.uid() = user_id)
  -- 본인 세션에만 기록 가능(타인 세션 id 로의 끼워넣기 차단 — 인가 검사)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- ── 프리미엄 판정 (edge function checkAndIncrementUsage 와 동일 기준 미러) ──
CREATE OR REPLACE FUNCTION public.is_premium_member(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.plan <> 'free'
      AND s.status = 'active'
      AND (COALESCE(s.trial_ends_at, '-infinity'::timestamptz) > now()
        OR COALESCE(s.expires_at, '-infinity'::timestamptz) > now())
  );
$$;
REVOKE ALL ON FUNCTION public.is_premium_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_premium_member(UUID) TO authenticated, service_role;

-- ── 세션 개수 강제: 무료 1 / 프리미엄 5 ─────────────────────
-- 클라 UX 와 별개로 서버에서 강제(직접 INSERT 우회 차단). advisory lock 으로
-- 동시 INSERT 레이스(둘 다 count 통과) 방지.
CREATE OR REPLACE FUNCTION public.enforce_ai_chat_session_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ai_chat_sessions:' || NEW.user_id::text));
  v_limit := CASE WHEN public.is_premium_member(NEW.user_id) THEN 5 ELSE 1 END;
  SELECT count(*) INTO v_count FROM public.ai_chat_sessions WHERE user_id = NEW.user_id;
  IF v_count >= v_limit THEN
    -- 클라가 메시지로 분기할 수 있게 고정 식별자. HINT 에 한도 수치.
    RAISE EXCEPTION 'chat_session_limit' USING HINT = v_limit::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_chat_session_limit ON public.ai_chat_sessions;
CREATE TRIGGER trg_ai_chat_session_limit
  BEFORE INSERT ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_chat_session_limit();

-- ── 보관 용량: 세션당 무료 100 / 프리미엄 500 메시지 ────────
-- 초과분은 오래된 순 삭제(슬라이딩 윈도우). 세션 updated_at 도 여기서 갱신해
-- 목록 정렬(최근 대화 순)을 유지한다.
CREATE OR REPLACE FUNCTION public.trim_ai_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cap INTEGER;
BEGIN
  v_cap := CASE WHEN public.is_premium_member(NEW.user_id) THEN 500 ELSE 100 END;
  DELETE FROM public.ai_chat_messages
  WHERE session_id = NEW.session_id
    AND id IN (
      SELECT id FROM public.ai_chat_messages
      WHERE session_id = NEW.session_id
      ORDER BY created_at DESC, id DESC
      OFFSET v_cap
    );
  UPDATE public.ai_chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_chat_messages_trim ON public.ai_chat_messages;
CREATE TRIGGER trg_ai_chat_messages_trim
  AFTER INSERT ON public.ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trim_ai_chat_messages();
