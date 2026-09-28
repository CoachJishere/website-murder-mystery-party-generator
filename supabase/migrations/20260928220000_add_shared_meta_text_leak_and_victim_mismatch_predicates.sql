-- ADR-0131 item 2, Stage 1: shared predicate functions, following the exact
-- shape already proven by package_victim_is_playable_character(_pkg) (called
-- from both the blocking gate and its advisory sibling since ADR-0060,
-- structurally unable to drift because it's one function, not two).
--
-- These are pure additions. Nothing calls them yet -- package_completion_
-- blocking_defects(), list_packages_with_meta_text_leak(), and
-- list_packages_with_victim_mismatch() are untouched by this migration.
-- Cutover happens in a later migration, after a corpus shadow-test.
--
-- Sourced from the MORE COMPLETE side of each confirmed-diverged pair (the
-- advisory list_packages_with_* functions, per ADR-0131 Part 2B), so the
-- gate gains coverage rather than the advisory side losing any.

CREATE OR REPLACE FUNCTION public.package_meta_text_leak(_pkg mystery_packages)
RETURNS text[]
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH marker AS (
    SELECT
      '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose (?!a name or leave blank)|\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M|self-reference|no self-entry needed|this would be removed in actual implementation|\[no [^\]]{0,80}hostile|\mtotal \w+:\s*(no more than|~?\d+\s*words?|concrete facts)|\m(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)/(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)\M)'::text AS rx,
      '(relationship matrix|established cast dynamics|\Mcast dynamics\M)'::text AS narrative_only_rx
  ),
  package_hit AS (
    SELECT 'package'::text AS source
    FROM marker m
    WHERE (
      coalesce(_pkg.game_overview,'') || ' ' || coalesce(_pkg.detective_script,'') || ' ' ||
      coalesce(_pkg.host_guide,'') || ' ' || coalesce(_pkg.timeline,'') || ' ' ||
      coalesce(_pkg.hosting_tips,'') || ' ' || coalesce(_pkg.preparation_instructions,'') || ' ' ||
      coalesce(_pkg.evidence_cards #>> '{}','')
    ) ~* m.rx
  ),
  character_hit AS (
    SELECT DISTINCT 'character:' || mc.character_name AS source
    FROM mystery_characters mc
    CROSS JOIN marker m
    WHERE mc.package_id = _pkg.id
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
  ),
  all_hits AS (
    SELECT source FROM package_hit
    UNION
    SELECT source FROM character_hit
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE array_agg(source ORDER BY source) END
  FROM all_hits;
$function$;

COMMENT ON FUNCTION public.package_meta_text_leak(mystery_packages) IS
$doc$ADR-0131 item 2, Stage 1: shared meta_text_leak predicate, single source of truth for both package_completion_blocking_defects() (blocking) and list_packages_with_meta_text_leak() (advisory) once cutover lands. Returns an array of 'package' and/or 'character:<name>' hit sources, or NULL if clean -- matches list_packages_with_meta_text_leak()'s existing sources column shape, which the gate translates into its own 'meta_text_leak.package'/'meta_text_leak.character.<name>' defect-string format. Pattern sourced from the previously more-complete advisory side (ADR-0131 Part 2B found the gate's own inline copy was a stale subset missing ~10 markers, including the entire T-V pronoun-pair and relationship-matrix patterns).$doc$;

CREATE OR REPLACE FUNCTION public.package_victim_mismatch_candidate(_pkg mystery_packages)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH ov AS (
    SELECT coalesce(
      (regexp_match(coalesce(_pkg.game_overview,''),
         'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1],
      (regexp_match(coalesce(_pkg.game_overview,''),
         'Dr\.\s+([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)'))[1],
      (regexp_match(coalesce(_pkg.game_overview,''),
         '([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)\s+(?:was\s+found|had\s+been|is\s+dead|was\s+killed|was\s+murdered|was\s+poisoned)'))[1]
    ) AS overview_name
  ),
  named AS (
    SELECT overview_name, (regexp_match(overview_name, '([A-Za-z]+)$'))[1] AS surname
    FROM ov WHERE overview_name IS NOT NULL
  )
  SELECT n.overview_name
  FROM named n
  WHERE length(n.surname) >= 4
    AND coalesce(_pkg.master_context,'') !~* ('\m' || n.surname || '\M')
    AND NOT EXISTS (
      SELECT 1 FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || n.surname || '\M')
    );
$function$;

COMMENT ON FUNCTION public.package_victim_mismatch_candidate(mystery_packages) IS
$doc$ADR-0131 item 2, Stage 1: shared victim_mismatch predicate, single source of truth for both package_completion_blocking_defects() (blocking) and list_packages_with_victim_mismatch() (advisory) once cutover lands. Returns the extracted overview victim name if it's absent from master_context and every character background/relationships field, or NULL if clean. Extraction sourced from the previously more-complete advisory side (3 fallback patterns; ADR-0131 Part 2B found the gate's own inline copy had only the first, header-only pattern ADR-0060 already measured as ~78% inert). Still does NOT catch a same-package victim/suspect identity swap (the Lyn DiFranco shape) -- a known, documented, unchanged limitation, not something this consolidation was meant to fix.$doc$;

REVOKE EXECUTE ON FUNCTION public.package_meta_text_leak(mystery_packages) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_victim_mismatch_candidate(mystery_packages) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.package_meta_text_leak(mystery_packages) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_victim_mismatch_candidate(mystery_packages) TO service_role;
