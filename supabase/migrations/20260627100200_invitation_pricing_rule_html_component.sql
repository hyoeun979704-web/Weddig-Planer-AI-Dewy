-- ============================================================================
-- 가격 규칙 갱신 — html_component(인터랙티브) 템플릿 예외 추가.
--
-- 기존 20260531200000_invitation_pricing_rule.sql 은 layout 슬롯 특징
-- (auto_cutout/auto_illustration)으로 price_hearts 를 멱등 재계산하고, 그 외엔 0
-- 으로 덮는다. 슬롯이 없는 html_component 템플릿은 이 규칙에 걸리면 프리미엄
-- 가격이 0 으로 리셋된다.
--
-- 그래서 규칙을 재정의해 html_component 는 프리미엄(모바일 10)을 유지한다.
-- 멱등 — 여러 번 실행해도 동일 결과.
-- ============================================================================

UPDATE public.invitation_templates SET price_hearts = CASE
  WHEN layout->>'kind' = 'html_component'
    THEN (CASE WHEN format = 'mobile' THEN 10 ELSE 5 END)
  WHEN (layout->'slots') @> '[{"auto_cutout":true}]'::jsonb
    OR (layout->'slots') @> '[{"auto_illustration":true}]'::jsonb
    THEN (CASE WHEN format = 'mobile' THEN 10 ELSE 5 END)
  ELSE 0
END;
