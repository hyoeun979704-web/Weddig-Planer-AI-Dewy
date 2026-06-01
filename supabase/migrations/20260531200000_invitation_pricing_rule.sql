-- 청첩장 가격 규칙 (2026-06 개정) — 단일 소스.
--
--   · 사용자가 직접 사진 등록/배치 = 무료(0).
--   · 누끼(auto_cutout) 또는 일러스트 변환(auto_illustration) 디자인만 유료:
--       종이 5하트 / 모바일 10하트.
--   · 첫 사용(첫 청첩장) 반값(종이3/모바일5)은 차감 시점(클라이언트 computeInvitationPrice)에서 처리.
--   · AI 추천 문구·약도 일러스트 변환 등은 호출 시점 별도 차감.
--
-- 규칙을 layout 특징에서 직접 도출해 모든 템플릿에 일괄 적용(멱등).

UPDATE public.invitation_templates SET price_hearts = CASE
  WHEN (layout->'slots') @> '[{"auto_cutout":true}]'::jsonb
    OR (layout->'slots') @> '[{"auto_illustration":true}]'::jsonb
  THEN (CASE WHEN format = 'mobile' THEN 10 ELSE 5 END)
  ELSE 0
END;
