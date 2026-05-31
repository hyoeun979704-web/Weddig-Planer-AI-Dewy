-- invitation_fonts.family 중복 방지 — UNIQUE 제약 추가
--
-- 배경:
--   * 폰트 일괄 등록 스크립트(scripts/importInvitationFonts.ts)가
--     upsert(onConflict: "family") 로 동작하려면 family 에 UNIQUE 제약이 필요하다.
--   * seedInvitationTemplates.ts 의 default_font_family 조회는 이미
--     .eq("family", family).maybeSingle() — "family 는 1건" 전제로 작성돼 있다.
--   * 어드민에서 같은 family 를 두 번 저장해도 막히지 않던 문제를 구조적으로 차단한다.

-- 안전장치: 혹시 기존 중복 family 가 있으면 우선순위 높은 1건만 남기고 제거.
-- (display_order 큰 것 → 최근 created_at → id 순으로 "더 큰" 행을 보존)
DELETE FROM public.invitation_fonts a
USING public.invitation_fonts b
WHERE a.family = b.family
  AND a.id <> b.id
  AND (a.display_order, a.created_at, a.id) < (b.display_order, b.created_at, b.id);

ALTER TABLE public.invitation_fonts
  ADD CONSTRAINT invitation_fonts_family_key UNIQUE (family);
