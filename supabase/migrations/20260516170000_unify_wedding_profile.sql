-- Unify wedding profile data across Budget, Schedule, and AI Planner.
--
-- Before this migration the three features each owned their own slice:
--   · user_wedding_settings (Schedule):  wedding_date, region, style, partner_name
--   · budget_settings (Budget):          region, guest_count, total_budget
--   · AI Planner:                        read-only — but its modal surveys
--                                        collected redundant inputs
--
-- guest_count was the worst offender — it lived only in budget_settings, so
-- when AI Planner / Schedule needed it (timeline planning, regional avg
-- comparisons) the user had to re-enter it. Promote it to the shared
-- user_wedding_settings table so all three features can read/write a single
-- source of truth, then backfill from budget_settings for existing users.

ALTER TABLE public.user_wedding_settings
  ADD COLUMN IF NOT EXISTS guest_count INTEGER;

-- Backfill from budget_settings where the user already entered it.
-- Skip rows that already have a non-null value (idempotent re-run safety).
UPDATE public.user_wedding_settings AS w
SET guest_count = b.guest_count
FROM public.budget_settings AS b
WHERE w.user_id = b.user_id
  AND w.guest_count IS NULL
  AND b.guest_count IS NOT NULL
  AND b.guest_count > 0;

COMMENT ON COLUMN public.user_wedding_settings.guest_count IS
  '예상 하객 수 — Budget·Schedule·AI Planner 공용 단일 소스. NULL이면 미설정 (스타일별 기본값: general 200, small 50, self 25).';
