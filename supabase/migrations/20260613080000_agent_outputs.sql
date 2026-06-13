-- 에이전트 오피스 산출물 승인 큐(앱 어드민에서 폰으로 관리).
-- 로컬 에이전트가 service_role 로 INSERT(초안/이미지 + deslop 점수) → 운영자가 어드민에서
-- 승인/반려. 읽기/수정은 운영자만(service_role 은 RLS 우회하므로 별도 INSERT 정책 불필요).

CREATE TABLE IF NOT EXISTS public.agent_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('draft', 'asset')),
  source text CHECK (source IS NULL OR char_length(source) <= 40),
  title text NOT NULL CHECK (char_length(title) <= 300),
  body text CHECK (body IS NULL OR char_length(body) <= 20000),
  media_url text CHECK (media_url IS NULL OR char_length(media_url) <= 500),
  deslop_score int CHECK (deslop_score IS NULL OR (deslop_score BETWEEN 0 AND 10)),
  issues text CHECK (issues IS NULL OR char_length(issues) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_outputs_status_idx ON public.agent_outputs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_outputs_recent_idx ON public.agent_outputs (created_at DESC);

ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;

-- 운영자 전용(읽기·수정·삭제·직접삽입). 로컬 에이전트는 service_role 키로 RLS 우회 INSERT.
DROP POLICY IF EXISTS "admin read agent outputs" ON public.agent_outputs;
CREATE POLICY "admin read agent outputs" ON public.agent_outputs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin write agent outputs" ON public.agent_outputs;
CREATE POLICY "admin write agent outputs" ON public.agent_outputs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin insert agent outputs" ON public.agent_outputs;
CREATE POLICY "admin insert agent outputs" ON public.agent_outputs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin delete agent outputs" ON public.agent_outputs;
CREATE POLICY "admin delete agent outputs" ON public.agent_outputs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
