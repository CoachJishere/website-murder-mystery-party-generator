-- ADR-0016 Addendum 2: extend the Addendum 1 grace-period fix to the 5 other
-- health-check detectors that share the same auto-remediation cron and the
-- same gap.
--
-- Addendum 1 fixed list_packages_missing_evidence_images() alone. But
-- auto-remediate-packages' DETECTOR_RPC map (supabase/functions/
-- auto-remediate-packages/index.ts) shows 5 more detectors are self-healed
-- by the exact same 30-minute cron: identity_contamination, template_artifact
-- (meta_text_leak), game_overview_victim_mismatch, slip_culprit_leak, and
-- self_directed_questions -- all wired into health-check.yml checks 5-9. All
-- 5 filter on generation_status IN ('completed', 'needs_review') with only a
-- 30-day _since window (ages out OLD incidents) and zero protection against
-- a package that completed 2 minutes ago and hasn't reached the next
-- remediation pass yet. Same race as Addendum 1, just waiting to false-alarm
-- on a different defect class.
--
-- Fix, scoped to the 'completed' branch only (mirrors Addendum 1 exactly):
-- add the same 45-minute generation_completed_at grace period. Deliberately
-- NOT touching the 'needs_review' branch -- that state already has its own
-- established handling (check 3's 10-minute needs_review_at hold, ADR-0072),
-- generation_completed_at isn't a meaningful "how long has this specific
-- defect existed" signal for a package that was demoted rather than
-- cleanly completed, and a package sitting in needs_review is already the
-- more urgent case checks 5-9 exist to catch, not the transient one this
-- addendum is narrowing.
--
-- Live definitions pulled via `pg_get_functiondef` immediately before
-- writing this migration (Supabase MCP was unavailable this session) to
-- make sure this is patching the actual current function body, not a
-- possibly-stale copy from an earlier migration file.

CREATE OR REPLACE FUNCTION public.list_packages_with_identity_conflicts(_since timestamp with time zone DEFAULT '2026-06-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, kin_term text, claimants text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH chars AS (
    SELECT
      mp.id AS package_id,
      mp.conversation_id,
      c.title,
      c.is_paid,
      mp.created_at,
      mc.character_name,
      coalesce(mc.introduction, '') || ' ' ||
      coalesce(mc.round2_script, '') || ' ' ||
      coalesce(mc.round3_script, '') || ' ' ||
      coalesce(mc.round4_script, '') || ' ' ||
      coalesce(mc.final_statement, '') AS claims,
      coalesce(mc.background, '') || ' ' ||
      coalesce(mc.relationships::text, '') || ' ' ||
      coalesce(mc.description::text, '') AS truth
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
      AND NOT c.is_test
  ),
  kin AS (
    SELECT unnest(ARRAY[
      'brother','sister','father','mother','husband','wife','son','daughter',
      'uncle','aunt','nephew','niece','cousin','twin'
    ]) AS term
  ),
  conflicts AS (
    SELECT ch.package_id, ch.conversation_id, ch.title, ch.is_paid,
           ch.created_at, k.term, ch.character_name
    FROM chars ch
    CROSS JOIN kin k
    WHERE ch.claims ~* ('\mmy (own )?' || k.term || '\M')
      AND ch.truth !~* ('\m' || k.term)
  )
  SELECT
    co.package_id,
    co.conversation_id,
    co.title,
    co.is_paid,
    co.created_at,
    co.term AS kin_term,
    array_agg(co.character_name ORDER BY co.character_name) AS claimants
  FROM conflicts co
  GROUP BY co.package_id, co.conversation_id, co.title, co.is_paid, co.created_at, co.term
  HAVING count(*) >= 2
  ORDER BY co.is_paid DESC, co.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_meta_text_leak(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH marker AS (
    SELECT
      '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose (?!a name or leave blank)|\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M|self-reference|no self-entry needed|this would be removed in actual implementation|\[no [^\]]{0,80}hostile|\m(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)/(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)\M)'::text AS rx,
      '(relationship matrix|established cast dynamics|\Mcast dynamics\M)'::text AS narrative_only_rx
  ),
  hits AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           'character:' || mc.character_name AS source
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    CROSS JOIN marker m
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
      AND (
        (
          coalesce(mc.introduction,'') || ' ' || coalesce(mc.rumors,'') || ' ' ||
          coalesce(mc.background,'') || ' ' || coalesce(mc.secret,'') || ' ' ||
          coalesce(mc.relationships::text,'') || ' ' || coalesce(mc.description::text,'') || ' ' ||
          coalesce(mc.accusations,'') || ' ' ||
          coalesce(mc.round2_script,'') || ' ' || coalesce(mc.round3_script,'') || ' ' ||
          coalesce(mc.round4_script,'') || ' ' || coalesce(mc.final_statement,'') || ' ' ||
          coalesce(mc.round2_innocent,'') || ' ' || coalesce(mc.round2_guilty,'') || ' ' || coalesce(mc.round2_accomplice,'') || ' ' ||
          coalesce(mc.round3_innocent,'') || ' ' || coalesce(mc.round3_guilty,'') || ' ' || coalesce(mc.round3_accomplice,'') || ' ' ||
          coalesce(mc.round4_innocent,'') || ' ' || coalesce(mc.round4_guilty,'') || ' ' || coalesce(mc.round4_accomplice,'') || ' ' ||
          coalesce(mc.final_innocent,'') || ' ' || coalesce(mc.final_guilty,'') || ' ' || coalesce(mc.final_accomplice,'')
        ) ~* m.rx
        OR
        (
          coalesce(mc.introduction,'') || ' ' || coalesce(mc.background,'') || ' ' ||
          coalesce(mc.secret,'') || ' ' || coalesce(mc.relationships::text,'') || ' ' ||
          coalesce(mc.description::text,'')
        ) ~* m.narrative_only_rx
      )
    UNION
    SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, 'package'::text AS source
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    CROSS JOIN marker m
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
      AND (
        coalesce(mp.game_overview,'') || ' ' || coalesce(mp.detective_script,'') || ' ' ||
        coalesce(mp.host_guide,'') || ' ' || coalesce(mp.timeline,'') || ' ' ||
        coalesce(mp.hosting_tips,'') || ' ' || coalesce(mp.preparation_instructions,'') || ' ' ||
        coalesce(mp.evidence_cards #>> '{}','')
      ) ~* m.rx
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT source ORDER BY source) AS sources
  FROM hits
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_victim_mismatch(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, overview_victim text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH ov AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           mp.master_context,
           coalesce(
             (regexp_match(coalesce(mp.game_overview,''),
                'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1],
             (regexp_match(coalesce(mp.game_overview,''),
                'Dr\.\s+([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)'))[1],
             (regexp_match(coalesce(mp.game_overview,''),
                '([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)\s+(?:was\s+found|had\s+been|is\s+dead|was\s+killed|was\s+murdered|was\s+poisoned)'))[1]
           ) AS overview_name
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
  ),
  named AS (
    SELECT *, (regexp_match(overview_name, '([A-Za-z]+)$'))[1] AS surname
    FROM ov WHERE overview_name IS NOT NULL
  )
  SELECT n.package_id, n.conversation_id, n.title, n.is_paid, n.created_at, n.overview_name AS overview_victim
  FROM named n
  WHERE length(n.surname) >= 4
    AND coalesce(n.master_context,'') !~* ('\m' || n.surname || '\M')
    AND NOT EXISTS (
      SELECT 1 FROM mystery_characters mc
      WHERE mc.package_id = n.package_id
        AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || n.surname || '\M')
    )
  ORDER BY n.is_paid DESC, n.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_slip_culprit_leak(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, characters text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH slip AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at, mc.character_name,
           coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'') AS static_secret
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
      AND NOT c.is_test
      AND mp.mystery_style = 'character'
      AND NOT EXISTS (SELECT 1 FROM mystery_characters m2 WHERE m2.package_id = mp.id AND m2.character_role = 'murderer')
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS characters
  FROM slip
  WHERE static_secret ~* '\myou (poisoned|killed|murdered|stabbed|strangled|shot|smothered)\M'
    AND static_secret ~* '(hide|hiding|conceal|cover up).{0,60}(guilt|your crime|your own crime|what you did)'
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.list_packages_with_self_directed_questions(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, offenders text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH q AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           mc.character_name,
           coalesce(mc.round2_questions,'') || ' ' || coalesce(mc.round3_questions,'') || ' ' || coalesce(mc.round4_questions,'') AS questions
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
      AND NOT c.is_test
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS offenders
  FROM q
  WHERE questions ~* ('\*\*to ' || regexp_replace(character_name, '([\[\](){}.*+?^$\\|])', '\\\1', 'g') || '\M')
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;
