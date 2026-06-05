-- 이벤트 페이지(Events.tsx) 일러스트 에셋 적용에 맞춰 promotional_events 정렬.
-- 1) live DB 에만 있던 mini_game 카드를 migration 으로도 시드(repo ↔ DB 수렴).
-- 2) 마지막 카드를 "가족 초대(부모님·플래너)" → "파트너 연동" 으로 교체.
--    slug 도 family_invite → partner_link 로 변경하고, 존재하던 구 row 는 제거.

-- 구 family_invite row 정리(있으면 삭제). partner_link 로 재시드.
DELETE FROM public.promotional_events WHERE slug = 'family_invite';

INSERT INTO public.promotional_events
  (slug, title, subtitle, position, thumb_bg, cta_label, cta_path, status)
VALUES
  ('mini_game', '꽃 머지 미니게임으로 적립', '게임하고 포인트 받기 · 광고 시 2배', 25,
   'from-[#FFF1F4] to-[#FAD0DA]', '게임 시작', '/merge-game', 'live'),
  ('partner_link', '파트너와 함께 준비해요', '일정·예산·일기를 둘이서 함께 관리', 40,
   'from-[#FFF0F4] to-[#FAD0DA]', '파트너 연동', '/mypage#partner-link', 'live')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  position = EXCLUDED.position,
  thumb_bg = EXCLUDED.thumb_bg,
  cta_label = EXCLUDED.cta_label,
  cta_path = EXCLUDED.cta_path,
  status = EXCLUDED.status,
  updated_at = now();
