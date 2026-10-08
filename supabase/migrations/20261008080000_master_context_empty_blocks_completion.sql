-- ADR-0148: an empty master_context now holds the completion gate (added to package_missing_core_content, ADR-0103 Addendum 87).
--
-- "Death And Dumplings At Madwimmin House" (2026-10-07) saved master_context = '' on two runs. It was only caught indirectly, through
-- the game overview reading "master_context arrived empty". The check is now direct and says exactly what is wrong in the alert
-- (`missing_core_content.master_context_empty`).
--
-- Floor: packages created on or after 2026-10-08 only. The corpus since 2026-06-01 has 2 packages under 1,000 chars of master_context:
-- "Operation: Nightfall" (paid, completed 2026-08-11, 30 characters, working detective script, so harmless) and an unpaid
-- needs_more_info stub. A June floor would re-flag Nightfall in list_packages_with_missing_core_content. Smallest real master_context
-- in the corpus is 1,826 chars (1st percentile 36k), so the 1,000 threshold has a wide margin.
--
-- Detection only, same as the other missing_core_content checks: the repair is a whole-package re-fire (paid, needs a yes).

CREATE OR REPLACE FUNCTION public.package_missing_core_content(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT NULLIF(array_remove(ARRAY[
    CASE WHEN coalesce(length(_pkg.detective_script), 0) < 500 THEN 'detective_script_empty' END,
    CASE WHEN _pkg.game_overview ~* '(master context|please send|send me the|arrived empty|i have no (victim|details))' THEN 'game_overview_is_ai_request' END,
    CASE WHEN _pkg.created_at >= '2026-10-08 00:00:00+00'::timestamptz AND coalesce(length(_pkg.master_context), 0) < 1000 THEN 'master_context_empty' END
  ], NULL), ARRAY[]::text[])
  WHERE _pkg.created_at >= '2026-06-01 00:00:00+00'::timestamptz;
$function$;
