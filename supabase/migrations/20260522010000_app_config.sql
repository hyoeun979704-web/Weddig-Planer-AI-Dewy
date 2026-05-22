-- 배포 없이 바꿀 수 있는 운영 설정(공지·문의처·안내 문구) 저장소.
-- key→value(jsonb). 공개 읽기, 쓰기는 운영자 RPC 로만. UI 는 하드코딩 폴백을
-- 두고 이 값으로 덮어쓴다 → 미배포 시에도 안전.

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_config_public_read ON public.app_config;
CREATE POLICY app_config_public_read ON public.app_config FOR SELECT USING (true);

-- 기본값 seed (없을 때만)
INSERT INTO public.app_config (key, value) VALUES
  ('contact', jsonb_build_object('email', 'help@dewy-wedding.com', 'kakao_url', '')),
  ('announcement', jsonb_build_object('enabled', false, 'text', '', 'link', ''))
ON CONFLICT (key) DO NOTHING;

-- 운영자 전용 설정 변경 RPC (배포 없이 값 수정)
CREATE OR REPLACE FUNCTION public.admin_set_app_config(p_key TEXT, p_value JSONB)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  INSERT INTO public.app_config (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_app_config(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_app_config(TEXT, JSONB) TO authenticated;
