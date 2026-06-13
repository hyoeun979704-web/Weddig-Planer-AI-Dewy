-- 클라이언트 에러/크래시 로깅 — 운영자 어드민에서 프로덕션 오류를 관측(자체 호스팅, 외부 의존 0).
-- 로깅은 비인증 허용(anon 방문자 오류도 수집), 읽기는 운영자 전용(product_clicks 패턴).
-- ⚠️ message/stack 에 PII·내부 단서가 섞일 수 있어 읽기는 admin 만. 길이 CHECK 로 남용 페이로드 제한.

CREATE TABLE IF NOT EXISTS public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (char_length(message) <= 2000),
  stack text CHECK (stack IS NULL OR char_length(stack) <= 8000),
  -- 발생 출처: errorboundary | window.onerror | unhandledrejection | manual
  source text NOT NULL DEFAULT 'unknown' CHECK (char_length(source) <= 40),
  url text CHECK (url IS NULL OR char_length(url) <= 300),
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 300),
  -- 그룹핑용 다이제스트(message + 첫 스택프레임). 동일 오류 집계에 사용.
  digest text CHECK (digest IS NULL OR char_length(digest) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_error_logs_recent_idx
  ON public.client_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS client_error_logs_digest_idx
  ON public.client_error_logs (digest, created_at DESC);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

-- 누구나(anon 포함) 자신이 만난 오류를 기록할 수 있다(클라 측에서 세션당 캡·중복 차단).
DROP POLICY IF EXISTS "Anyone logs client errors" ON public.client_error_logs;
CREATE POLICY "Anyone logs client errors" ON public.client_error_logs
  FOR INSERT TO public
  WITH CHECK (true);

-- 읽기는 운영자만.
DROP POLICY IF EXISTS "Admins read client errors" ON public.client_error_logs;
CREATE POLICY "Admins read client errors" ON public.client_error_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 운영자 정리(오래된 로그 삭제)용 — 운영자만.
DROP POLICY IF EXISTS "Admins delete client errors" ON public.client_error_logs;
CREATE POLICY "Admins delete client errors" ON public.client_error_logs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
