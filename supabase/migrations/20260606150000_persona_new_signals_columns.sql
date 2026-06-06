-- 신규 페르소나 신호 컬럼(additive, nullable).
--  has_children : 재혼 시 자녀 동반 여부 → remarriage_with_children (민감, set_sensitive_preference 경유)
--  planning_style : 성향 페르소나 신호 → budget_analytic/designer_late/first_timer (비민감)
ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS has_children boolean,
  ADD COLUMN IF NOT EXISTS planning_style text
    CHECK (planning_style IS NULL OR planning_style IN ('standard','budget_analytic','designer','beginner'));
