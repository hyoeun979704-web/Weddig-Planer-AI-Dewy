-- /events 4개 CTA path 교정 + 미니게임/가족초대 카드 추가.
-- 기존 cta_path 는 라우트가 없거나 (`/community/new`) 라우트는 있지만
-- `?tab=` 파라미터를 무시 (`/mypage?tab=invite`, `/mypage?tab=missions`) 라서
-- 광고 카드 클릭 → 빈 페이지로 떨어지던 회귀를 닫는다.

UPDATE public.promotional_events SET cta_path='/referral',         updated_at=now() WHERE slug='referral';
UPDATE public.promotional_events SET cta_path='/points',           updated_at=now() WHERE slug='attendance';
UPDATE public.promotional_events SET cta_path='/community/write',  updated_at=now() WHERE slug='review';

INSERT INTO public.promotional_events
  (slug, title, subtitle, position, thumb_bg, icon, cta_label, cta_path, status,
   target_personas, target_styles)
VALUES
  ('mini_game', '꽃 머지 미니게임으로 적립', '게임하고 포인트 받기 · 광고 시 2배', 25,
   'from-[#FFF1F4] to-[#FAD0DA]', NULL, '게임 시작', '/merge-game', 'live',
   ARRAY[]::text[], ARRAY[]::text[]),
  ('family_invite', '가족 초대 — 일정·예산 함께', '부모님·플래너에게 권한 위임', 40,
   'from-[#FFF6E5] to-[#FFE1A8]', NULL, '가족 초대', '/family-invite', 'live',
   ARRAY[]::text[], ARRAY[]::text[])
ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      position = EXCLUDED.position,
      thumb_bg = EXCLUDED.thumb_bg,
      cta_label = EXCLUDED.cta_label,
      cta_path = EXCLUDED.cta_path,
      status = 'live',
      updated_at = now();
