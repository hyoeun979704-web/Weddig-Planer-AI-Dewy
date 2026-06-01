-- 약도(map) 슬롯 추가 — 유료 후면 디자인에 식장 약도 자동 생성 영역.
--
-- 약도 자동 생성은 네이버 지도 API 를 호출하는 프리미엄 기능이므로(invitation-map
-- edge function), API↔유료 원칙에 맞춰 유료 후면 템플릿에만 추가한다.
--   · gallery-qr-back (extension_required, 15하트)
--   · photo-caption-back (photo, 5하트)
-- 멱등: venue_map 이 이미 있으면 추가하지 않음.

UPDATE public.invitation_templates
SET layout = jsonb_set(
      layout, '{slots}',
      (layout->'slots') || '[{"id":"venue_map","type":"map","role":"venue_address","placeholder":"약도 (식장 주소로 자동 생성)","fit":"cover","x":100,"y":1280,"w":800,"h":300,"z":1}]'::jsonb
    ),
    updated_at = now()
WHERE slug = 'gallery-qr-back'
  AND NOT (layout->'slots' @> '[{"id":"venue_map"}]'::jsonb);

UPDATE public.invitation_templates
SET layout = jsonb_set(
      layout, '{slots}',
      (layout->'slots') || '[{"id":"venue_map","type":"map","role":"venue_address","placeholder":"약도 (식장 주소로 자동 생성)","fit":"cover","x":100,"y":1320,"w":800,"h":260,"z":1}]'::jsonb
    ),
    updated_at = now()
WHERE slug = 'photo-caption-back'
  AND NOT (layout->'slots' @> '[{"id":"venue_map"}]'::jsonb);
