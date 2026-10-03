-- ADR-0136: production LLM quality reviewer (report-only). Tables, a sweep selector, and a gate-defects wrapper for the auto-apply tier.
-- The cron schedule is added separately, after the edge function has been tested by hand.

CREATE TABLE IF NOT EXISTS public.package_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  prompt_version text NOT NULL,
  model text NOT NULL,
  mystery_style text,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'partial', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  items_reviewed int NOT NULL DEFAULT 0,
  findings_count int NOT NULL DEFAULT 0,
  discarded_count int NOT NULL DEFAULT 0,
  cost_usd numeric(8,4) NOT NULL DEFAULT 0,
  tokens jsonb,
  error text,
  UNIQUE (package_id, prompt_version)
);

CREATE TABLE IF NOT EXISTS public.package_review_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.package_reviews(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  item_name text NOT NULL,                 -- character name, or 'PACKAGE DOCUMENTS'
  field text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('high', 'medium')),
  exact_quote text NOT NULL,
  explanation text,
  suggested_replacement text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'applied', 'reverted', 'dismissed')),
  -- Human adjudication, filled during a sweep: this is how precision is measured over time (scoreboard).
  human_verdict text CHECK (human_verdict IN ('real', 'debatable', 'false')),
  human_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS package_review_findings_package_idx ON public.package_review_findings (package_id, status);
CREATE INDEX IF NOT EXISTS package_reviews_status_idx ON public.package_reviews (status, started_at);

-- Service role only (no policies): the data contains customer-package text.
ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_review_findings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.package_reviews, public.package_review_findings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.package_reviews, public.package_review_findings TO service_role;

-- Packages that should be reviewed next: paid, not a test, completed at least 20 minutes ago (so the deterministic heals have had
-- their chance), created in the last 3 days, and with no review row yet for this prompt version.
CREATE OR REPLACE FUNCTION public.list_packages_needing_review(_version text, _limit int DEFAULT 2)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, mystery_style text, created_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, mp.mystery_style, mp.created_at
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE mp.generation_status->>'status' = 'completed'
    AND mp.generation_completed_at < now() - interval '20 minutes'
    AND mp.created_at > now() - interval '3 days'
    AND c.is_paid IS TRUE
    AND c.is_test IS NOT TRUE
    AND NOT EXISTS (SELECT 1 FROM package_reviews r WHERE r.package_id = mp.id AND r.prompt_version = _version)
  ORDER BY mp.created_at DESC
  LIMIT _limit;
$function$;

-- The completion gate's defect list for one package, by id (used by the auto-apply tier to confirm a fix did not introduce a defect).
CREATE OR REPLACE FUNCTION public.package_blocking_defects_by_id(_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.package_completion_blocking_defects(p) FROM mystery_packages p WHERE p.id = _id;
$function$;

REVOKE ALL ON FUNCTION public.list_packages_needing_review(text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.package_blocking_defects_by_id(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_packages_needing_review(text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_blocking_defects_by_id(uuid) TO service_role;
