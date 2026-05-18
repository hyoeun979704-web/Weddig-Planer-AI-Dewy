-- Adds pregnancy_due_date to user_wedding_settings so the planner can compute
-- the pregnancy trimester at the wedding date and adjust schedule/missions
-- accordingly. Only meaningful when pregnant=true; NULL otherwise.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS pregnancy_due_date DATE;

COMMENT ON COLUMN public.user_wedding_settings.pregnancy_due_date IS
  '출산예정일 (pregnant=true 일 때만 의미 있음). 본식일과의 차이로 임신 차수 계산.';
