-- ============================================================================
-- 템플릿 등록: "모바일 — 트로피컬 그린 (스크롤)"
--
-- ⚠ 엔진 호환성: 기존 invitation_templates.layout 은 슬롯-캔버스 스펙
-- (pages[].slots[] 절대좌표)이지만, 이 템플릿은 슬롯 캔버스가 아니라
-- 인터랙티브 롱스크롤 React 컴포넌트다(카운트다운·갤러리 라이트박스·계좌
-- 아코디언·RSVP·방명록·스크롤 애니메이션). 슬롯 렌더러로는 그릴 수 없다.
--
-- 그래서 layout 에 kind='html_component' 표식을 담고, 앱 렌더러는
--   if (template.layout?.kind === 'html_component')
--     → getScrollComponent(layout.component) 로 전용 컴포넌트 렌더
--   else → 기존 슬롯 캔버스 렌더
-- 로 분기한다. (src/lib/invitation/types.ts isHtmlComponent)
--
-- price_hearts=10 (프리미엄, 모바일 최고가 동급 · 첫 청첩장 반값=5).
-- thumbnail_url='' (빈 문자열 — NOT NULL 회피, 추후 실제 썸네일 캡처로 갱신).
-- ============================================================================

insert into public.invitation_templates
  (name, slug, format, face, tone, price_hearts, is_active, display_order, thumbnail_url, layout)
values (
  '모바일 — 트로피컬 그린 (스크롤)',
  'tropical-green-scroll',
  'mobile',
  'front',
  'green-botanical',
  10,
  true,
  5,
  '',
  jsonb_build_object(
    'kind', 'html_component',
    'component', 'tropical-green-scroll',
    'version', 1,
    'editable_fields', jsonb_build_array(
      'theme','groom','bride','greeting','wedding_at','venue',
      'couple_intro','cover_image_url','gallery','story','accounts'
    ),
    'features', jsonb_build_array(
      'countdown','gallery_lightbox','accounts','rsvp','guestbook','share','add_to_calendar'
    )
  )
)
on conflict (slug) do update
  set layout = excluded.layout,
      name   = excluded.name,
      format = excluded.format,
      face   = excluded.face,
      tone   = excluded.tone,
      price_hearts = excluded.price_hearts,
      is_active = excluded.is_active,
      display_order = excluded.display_order,
      updated_at = now();
