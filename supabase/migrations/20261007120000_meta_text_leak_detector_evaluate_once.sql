-- ADR-0103 Addendum 87 Update 3: list_packages_with_meta_text_leak() timed out ("canceling statement due to
-- statement timeout") in the half-hourly auto-remediate-packages run at 01:45, 07:05 and 07:13 UTC on 2026-10-07.
--
-- Root cause: the function called the expensive public.package_meta_text_leak(mp.*) TWICE per package (once in the
-- SELECT list, once in WHERE ... IS NOT NULL). That function regex-scans every character's full text, including the
-- backreference word-loop pattern (~5.7 s over the 30-day window by itself, only paid for packages < 7 days old, so a
-- busy week makes it slower). Measured on live data: 7.9 s per call for the worker's 30-day window, against the 8 s
-- PostgREST statement_timeout that service_role inherits from `authenticator`.
--
-- Fix: evaluate it once per package through a LATERAL subquery. OFFSET 0 stops the planner from pulling the subquery
-- up and re-inlining the function into both places. Output columns, filter, window and ordering are unchanged;
-- measured 3.9 s on the same window, and the row set matched the old definition exactly (0 rows only in either).
CREATE OR REPLACE FUNCTION public.list_packages_with_meta_text_leak(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, l.sources
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  CROSS JOIN LATERAL (SELECT public.package_meta_text_leak(mp.*) AS sources OFFSET 0) l
  WHERE (
      (mp.generation_status->>'status' = 'completed'
       AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
      OR mp.generation_status->>'status' = 'needs_review'
    )
    AND mp.created_at >= _since
    AND l.sources IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;
