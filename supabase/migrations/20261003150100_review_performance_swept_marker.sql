-- ADR-0136: recall is only meaningful for packages a human has actually swept (a sweep with zero misses is still ground truth).
-- Insert one row here at the end of every New-Purchase sweep, after recording verdicts and misses.
CREATE TABLE IF NOT EXISTS public.package_review_sweeps (
  package_id uuid PRIMARY KEY REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  swept_at timestamptz NOT NULL DEFAULT now(),
  swept_by text NOT NULL DEFAULT 'claude+jonathan',
  note text
);
ALTER TABLE public.package_review_sweeps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.package_review_sweeps FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.package_review_sweeps TO service_role;

DROP VIEW IF EXISTS public.review_performance;
CREATE VIEW public.review_performance AS
WITH f AS (
  SELECT r.mystery_style AS style, f.category, f.human_verdict, f.package_id,
         EXISTS (SELECT 1 FROM public.package_review_sweeps s WHERE s.package_id = f.package_id) AS swept
  FROM public.package_review_findings f JOIN public.package_reviews r ON r.id = f.review_id
),
m AS (
  SELECT p.mystery_style AS style, ms.category
  FROM public.package_review_misses ms
  JOIN public.mystery_packages p ON p.id = ms.package_id
  WHERE EXISTS (SELECT 1 FROM public.package_review_sweeps s WHERE s.package_id = ms.package_id)
),
agg_f AS (
  SELECT style, category,
         count(*) AS findings,
         count(*) FILTER (WHERE human_verdict IS NOT NULL) AS judged,
         count(*) FILTER (WHERE human_verdict = 'real') AS real,
         count(*) FILTER (WHERE human_verdict = 'debatable') AS debatable,
         count(*) FILTER (WHERE human_verdict = 'false') AS false_alarms,
         count(*) FILTER (WHERE human_verdict = 'real' AND swept) AS real_in_swept
  FROM f GROUP BY style, category
),
agg_m AS (SELECT style, category, count(*) AS misses FROM m GROUP BY style, category)
SELECT coalesce(agg_f.style, agg_m.style) AS style,
       coalesce(agg_f.category, agg_m.category) AS category,
       coalesce(findings, 0) AS findings, coalesce(judged, 0) AS judged, coalesce(real, 0) AS real,
       coalesce(debatable, 0) AS debatable, coalesce(false_alarms, 0) AS false_alarms,
       CASE WHEN coalesce(real, 0) + coalesce(false_alarms, 0) > 0
            THEN round(100.0 * real / (real + false_alarms), 0) END AS precision_pct,
       coalesce(real_in_swept, 0) AS real_in_swept_packages,
       coalesce(misses, 0) AS misses,
       CASE WHEN coalesce(real_in_swept, 0) + coalesce(misses, 0) > 0
            THEN round(100.0 * coalesce(real_in_swept, 0) / (coalesce(real_in_swept, 0) + coalesce(misses, 0)), 0) END AS recall_pct
FROM agg_f FULL OUTER JOIN agg_m ON agg_f.style = agg_m.style AND agg_f.category = agg_m.category;
REVOKE ALL ON public.review_performance FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.review_performance TO service_role;

-- Protocol for valid recall: the reviewer runs FIRST (the cron does it 20 minutes after completion), the human sweeps SECOND, every hand edit
-- the reviewer did not report is inserted into package_review_misses, then one row goes into package_review_sweeps. Boogie was deliberately NOT
-- marked swept: the reviewer ran after the hand-fix, so its results measure the residual, not recall (pre-fix recall is in the ADR pilot numbers).
