-- Durable store for weekly SEO/GEO snapshots and one-off historical backfills.
-- Until now, scripts/fetchSeoWeeklySnapshot.mjs computed a rich GSC/GA4/AI-referral
-- snapshot every week but only wrote it to a gitignored local JSON file that gets
-- overwritten on every run — no historical time series was ever retained. This
-- table gives both the ongoing weekly capture and retroactive backfills (against
-- known past interventions, e.g. the March 2026 GEO-enrichment pass) a durable,
-- queryable home. See ADR-0084.
--
-- JSONB (not normalized columns) because the fetcher's output shape is still
-- evolving — a rigid schema would need a migration every time a new section
-- (e.g. site health) is added to the snapshot.
CREATE TABLE IF NOT EXISTS public.seo_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  window_start date NOT NULL,
  window_end date NOT NULL,
  source text NOT NULL CHECK (source IN ('weekly_live', 'backfill')),
  intervention_name text, -- backfill rows only, e.g. 'march_2026_geo_enrichment'
  intervention_phase text CHECK (intervention_phase IN ('pre', 'post')), -- backfill rows only
  metrics jsonb NOT NULL, -- same shape fetchSeoWeeklySnapshot.mjs already produces
  notes text
);

COMMENT ON TABLE public.seo_performance_snapshots IS
  'Durable history of SEO/GEO snapshots (GSC + GA4 + AI-referral-traffic proxy), both ongoing weekly captures and retroactive backfills tagged to known content interventions. See ADR-0084.';

CREATE INDEX IF NOT EXISTS idx_seo_performance_snapshots_source_window
  ON public.seo_performance_snapshots (source, window_start);

CREATE INDEX IF NOT EXISTS idx_seo_performance_snapshots_intervention
  ON public.seo_performance_snapshots (intervention_name)
  WHERE intervention_name IS NOT NULL;

ALTER TABLE public.seo_performance_snapshots ENABLE ROW LEVEL SECURITY;
-- Service-role only (same posture as acknowledged_health_alerts / other internal
-- analytics tables) — no public policy added, PostgREST access requires the
-- service key. Written only by scripts/fetchSeoWeeklySnapshot.mjs and
-- scripts/backfillSeoHistory.mjs, both CI/local scripts using the service key.
