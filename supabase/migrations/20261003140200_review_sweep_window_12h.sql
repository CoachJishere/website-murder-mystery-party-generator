-- ADR-0136: the review sweep is for NEW orders only. The first version's 3-day window would have reviewed 8 already-swept packages
-- (about 4 USD) when the cron was enabled; Jonathan approved the per-order spend, not a backfill. Backfills are run by hand.
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
    AND mp.created_at > now() - interval '12 hours'
    AND c.is_paid IS TRUE
    AND c.is_test IS NOT TRUE
    AND NOT EXISTS (SELECT 1 FROM package_reviews r WHERE r.package_id = mp.id AND r.prompt_version = _version)
  ORDER BY mp.created_at DESC
  LIMIT _limit;
$function$;
