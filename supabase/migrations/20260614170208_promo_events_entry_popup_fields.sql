-- 진입(홈 첫 실행) 팝업을 promotional_events 로 운영자 관리하게 확장.
--   show_as_popup = 이 이벤트를 홈 진입 팝업으로 노출할지
--   image_url     = 팝업 히어로 이미지(크게 보여줄 비주얼; 없으면 그라데이션 폴백)
--   audience      = 노출 대상(all|guest|user) — 비로그인/로그인 분기 운영자 제어
alter table public.promotional_events
  add column if not exists show_as_popup boolean not null default false,
  add column if not exists image_url text,
  add column if not exists audience text not null default 'all';

alter table public.promotional_events drop constraint if exists promo_events_audience_chk;
alter table public.promotional_events
  add constraint promo_events_audience_chk check (audience in ('all','guest','user'));

-- 어드민 upsert RPC 에 신규 필드 반영(payload 주도, 기존 호출 호환).
create or replace function public.admin_upsert_promotional_event(p_slug text, p_payload jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE v_admin BOOLEAN; v_audience TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') INTO v_admin;
  IF NOT v_admin THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  v_audience := lower(coalesce(p_payload->>'audience','all'));
  IF v_audience NOT IN ('all','guest','user') THEN v_audience := 'all'; END IF;
  INSERT INTO public.promotional_events AS pe (
    slug, title, subtitle, position, thumb_bg, icon, cta_label, cta_path,
    status, starts_at, ends_at, target_personas, target_styles,
    badge_label, badge_color, ends_label,
    show_as_popup, image_url, audience, updated_at
  ) VALUES (
    p_slug, p_payload->>'title', p_payload->>'subtitle',
    COALESCE((p_payload->>'position')::int, 100),
    p_payload->>'thumb_bg', p_payload->>'icon',
    p_payload->>'cta_label', p_payload->>'cta_path',
    COALESCE(p_payload->>'status', 'live'),
    NULLIF(p_payload->>'starts_at','')::timestamptz,
    NULLIF(p_payload->>'ends_at','')::timestamptz,
    COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(p_payload->'target_personas')), ARRAY[]::TEXT[]),
    COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(p_payload->'target_styles')), ARRAY[]::TEXT[]),
    p_payload->>'badge_label', p_payload->>'badge_color', p_payload->>'ends_label',
    COALESCE((p_payload->>'show_as_popup')::boolean, false),
    NULLIF(p_payload->>'image_url',''), v_audience, now()
  )
  ON CONFLICT (slug) DO UPDATE SET
    title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, position=EXCLUDED.position,
    thumb_bg=EXCLUDED.thumb_bg, icon=EXCLUDED.icon, cta_label=EXCLUDED.cta_label,
    cta_path=EXCLUDED.cta_path, status=EXCLUDED.status, starts_at=EXCLUDED.starts_at,
    ends_at=EXCLUDED.ends_at, target_personas=EXCLUDED.target_personas,
    target_styles=EXCLUDED.target_styles, badge_label=EXCLUDED.badge_label,
    badge_color=EXCLUDED.badge_color, ends_label=EXCLUDED.ends_label,
    show_as_popup=EXCLUDED.show_as_popup, image_url=EXCLUDED.image_url,
    audience=EXCLUDED.audience, updated_at=now();
  RETURN jsonb_build_object('ok', true);
END;
$function$;
