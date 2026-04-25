-- Differentiation analyzer enhancement
-- Adds columns that surface info competitors don't expose:
-- avg total estimate from independent reviews, hidden cost taxonomy,
-- refund/ownership-change risk signals, weekend premium %, peak season,
-- and studio per-extra costs (raw file, retouch, album, etc).

-- place_details: cross-category transparency fields
ALTER TABLE place_details
  ADD COLUMN IF NOT EXISTS avg_total_estimate     numeric,
  ADD COLUMN IF NOT EXISTS hidden_cost_tags       text[],
  ADD COLUMN IF NOT EXISTS refund_warning         boolean,
  ADD COLUMN IF NOT EXISTS ownership_change_recent boolean,
  ADD COLUMN IF NOT EXISTS weekend_premium_pct    numeric,
  ADD COLUMN IF NOT EXISTS peak_season_months     text[];
-- closed_days already exists in the schema; analyzer now fills it.

-- place_studios: hidden-cost transparency (where competitors hide most)
ALTER TABLE place_studios
  ADD COLUMN IF NOT EXISTS raw_file_extra_cost numeric,
  ADD COLUMN IF NOT EXISTS per_retouch_cost    numeric,
  ADD COLUMN IF NOT EXISTS album_extra_cost    numeric,
  ADD COLUMN IF NOT EXISTS base_shoot_hours    numeric,
  ADD COLUMN IF NOT EXISTS base_retouch_count  numeric,
  ADD COLUMN IF NOT EXISTS author_tiers        text[];

-- Sanity check (returns the new column list)
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('place_details', 'place_studios')
-- ORDER BY table_name, column_name;
