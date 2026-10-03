-- ADR-0136: measure how the reviewer performs, per class, from real sweeps.
-- precision = real / (real + false) over findings a human has judged (debatable reported separately, never counted as real);
-- recall    = reviewer-found real defects / (reviewer-found real + defects a human found that the reviewer did NOT report).
-- Humans record misses in package_review_misses during a sweep (defects found by reading that no finding covered).

CREATE TABLE IF NOT EXISTS public.package_review_misses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  item_name text NOT NULL,                       -- character name or 'PACKAGE DOCUMENTS'
  field text,
  category text NOT NULL,                        -- same vocabulary as package_review_findings.category
  exact_quote text,
  note text,
  found_by text NOT NULL DEFAULT 'hand_sweep',   -- 'hand_sweep' | 'customer' | 'other'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_review_misses_package_idx ON public.package_review_misses (package_id);
ALTER TABLE public.package_review_misses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.package_review_misses FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.package_review_misses TO service_role;

-- Per (style, category): findings, judged, real, debatable, false, precision, misses and recall. Only reviews with at least one judged
-- finding or one recorded miss on that package count toward recall (an un-swept package has no ground truth).
CREATE OR REPLACE VIEW public.review_performance AS
WITH swept AS (
  SELECT package_id FROM public.package_review_findings WHERE human_verdict IS NOT NULL
  UNION
  SELECT package_id FROM public.package_review_misses
),
f AS (
  SELECT r.mystery_style AS style, f.category, f.human_verdict, f.package_id
  FROM public.package_review_findings f JOIN public.package_reviews r ON r.id = f.review_id
),
m AS (
  SELECT p.mystery_style AS style, ms.category, ms.package_id
  FROM public.package_review_misses ms JOIN public.mystery_packages p ON p.id = ms.package_id
),
agg_f AS (
  SELECT style, category,
         count(*) AS findings,
         count(*) FILTER (WHERE human_verdict IS NOT NULL) AS judged,
         count(*) FILTER (WHERE human_verdict = 'real') AS real,
         count(*) FILTER (WHERE human_verdict = 'debatable') AS debatable,
         count(*) FILTER (WHERE human_verdict = 'false') AS false_alarms
  FROM f GROUP BY style, category
),
agg_m AS (SELECT style, category, count(*) AS misses FROM m GROUP BY style, category)
SELECT coalesce(agg_f.style, agg_m.style) AS style,
       coalesce(agg_f.category, agg_m.category) AS category,
       coalesce(findings, 0) AS findings, coalesce(judged, 0) AS judged, coalesce(real, 0) AS real,
       coalesce(debatable, 0) AS debatable, coalesce(false_alarms, 0) AS false_alarms,
       CASE WHEN coalesce(real, 0) + coalesce(false_alarms, 0) > 0
            THEN round(100.0 * real / (real + false_alarms), 0) END AS precision_pct,
       coalesce(misses, 0) AS misses,
       CASE WHEN coalesce(real, 0) + coalesce(misses, 0) > 0
            THEN round(100.0 * coalesce(real, 0) / (coalesce(real, 0) + coalesce(misses, 0)), 0) END AS recall_pct
FROM agg_f FULL OUTER JOIN agg_m ON agg_f.style = agg_m.style AND agg_f.category = agg_m.category;

REVOKE ALL ON public.review_performance FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.review_performance TO service_role;
