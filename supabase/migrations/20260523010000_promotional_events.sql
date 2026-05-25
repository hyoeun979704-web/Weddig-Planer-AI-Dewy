-- 페르소나 검토 P0 #3 — Events.tsx/Deals.tsx 의 하드코딩 FEATURED·LIVE_EVENTS·게임 배너를
-- DB 테이블로 이동. 운영팀이 배포 없이 이벤트 카드를 추가·종료할 수 있게 한다.
--
-- 기존 partner_deals(개별 업체 제휴 혜택) 와는 분리. 이 테이블은 "결혼 외 전체 사용자"에게
-- 노출되는 게이미피케이션/마케팅 카드용. 페르소나별 타겟팅도 가능.

CREATE TABLE IF NOT EXISTS public.promotional_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,             -- "welcome", "referral", "attendance" 등
  title TEXT NOT NULL,
  subtitle TEXT,
  -- featured 카드 (최대 1개 활성, position=0)와 일반 리스트(position>=1)를 같은 테이블에서.
  position INTEGER NOT NULL DEFAULT 100,
  thumb_bg TEXT,                          -- "from-#FFEBC9 to-#F5BE7A" 같은 tailwind 그래디언트
  icon TEXT,                              -- 선택 — 미사용시 그래디언트만
  cta_label TEXT NOT NULL,
  cta_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live',    -- live | ended | scheduled
  starts_at TIMESTAMPTZ,                  -- NULL이면 즉시
  ends_at TIMESTAMPTZ,                    -- NULL이면 무기한
  -- 페르소나 타겟팅(선택) — 빈 배열이면 모든 페르소나에게 노출.
  -- 값은 persona_mode enum(P1~P20 매핑) 또는 wedding_style.
  target_personas TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  target_styles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  badge_label TEXT,
  badge_color TEXT,
  ends_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promotional_events_status_pos_idx
  ON public.promotional_events(status, position);

ALTER TABLE public.promotional_events
  DROP CONSTRAINT IF EXISTS promotional_events_status_check;
ALTER TABLE public.promotional_events
  ADD CONSTRAINT promotional_events_status_check
  CHECK (status IN ('live', 'ended', 'scheduled'));

ALTER TABLE public.promotional_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promotional_events_public_read ON public.promotional_events;
CREATE POLICY promotional_events_public_read ON public.promotional_events
  FOR SELECT USING (true);

-- 운영자 전용 RPC — admin 만 INSERT/UPDATE.
CREATE OR REPLACE FUNCTION public.admin_upsert_promotional_event(
  p_slug TEXT,
  p_payload JSONB
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    INTO v_admin;
  IF NOT v_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.promotional_events AS pe (
    slug, title, subtitle, position, thumb_bg, icon, cta_label, cta_path,
    status, starts_at, ends_at, target_personas, target_styles,
    badge_label, badge_color, ends_label, updated_at
  ) VALUES (
    p_slug,
    p_payload->>'title',
    p_payload->>'subtitle',
    COALESCE((p_payload->>'position')::int, 100),
    p_payload->>'thumb_bg',
    p_payload->>'icon',
    p_payload->>'cta_label',
    p_payload->>'cta_path',
    COALESCE(p_payload->>'status', 'live'),
    NULLIF(p_payload->>'starts_at', '')::timestamptz,
    NULLIF(p_payload->>'ends_at', '')::timestamptz,
    COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(p_payload->'target_personas')), ARRAY[]::TEXT[]),
    COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(p_payload->'target_styles')), ARRAY[]::TEXT[]),
    p_payload->>'badge_label',
    p_payload->>'badge_color',
    p_payload->>'ends_label',
    now()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    position = EXCLUDED.position,
    thumb_bg = EXCLUDED.thumb_bg,
    icon = EXCLUDED.icon,
    cta_label = EXCLUDED.cta_label,
    cta_path = EXCLUDED.cta_path,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    target_personas = EXCLUDED.target_personas,
    target_styles = EXCLUDED.target_styles,
    badge_label = EXCLUDED.badge_label,
    badge_color = EXCLUDED.badge_color,
    ends_label = EXCLUDED.ends_label,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_promotional_event(TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_upsert_promotional_event(TEXT, JSONB) TO authenticated;

-- 기본 시드 — 기존 하드코딩과 1:1 매핑. 이후 운영자가 자유롭게 수정.
INSERT INTO public.promotional_events (slug, title, subtitle, position, thumb_bg, cta_label, cta_path, status, badge_label, badge_color)
VALUES
  ('welcome', '신규 가입 1달 프리미엄 무료', 'AI 플래너 무제한 + 예산 분석 PDF + 보너스 하트', 0,
   'from-[#FFEBC9] to-[#F5BE7A]', '지금 시작', '/auth', 'live', NULL, NULL),
  ('referral', '친구 초대 1명당 1,000P', '초대받은 친구도 500P · 무제한 적립', 10,
   'from-[#F3F8ED] to-[#DDEEDC]', '초대하기', '/mypage?tab=invite', 'live', NULL, NULL),
  ('attendance', '미션 출석 7일 도전', '연속 출석 시 보너스 하트 +5', 20,
   'from-[#F5EFFB] to-[#E0CFFB]', '미션 보기', '/mypage?tab=missions', 'live', NULL, NULL),
  ('review', '본식 사진 후기 작성', '리뷰 작성 시 3,000P 즉시 적립', 30,
   'from-[#F1F4FB] to-[#CFDDF5]', '후기 쓰기', '/community/new', 'live', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.promotional_events IS
  '게이미피케이션·마케팅 이벤트 카드(Events.tsx) 운영. partner_deals 와는 별도. 페르소나/스타일 타겟팅 지원.';
