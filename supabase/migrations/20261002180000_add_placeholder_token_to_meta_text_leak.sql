-- ADR-0103 Addendum 77 follow-up: package_meta_text_leak() also flags a stray template placeholder token.
-- Trigger: "Blood On The Mead-bench" (2026-10-02) shipped a literal "<FILL>" at the end of the murderer's read-aloud
-- confession (final_statement). First occurrence in the corpus; no detector covered it. Applying the Addendum 38 test
-- (cheap + deterministic; obvious, high-impact on a read-aloud confession) -> build now regardless of occurrence count.
--
-- Change: one new case-sensitive pattern '<[A-Z][A-Z0-9_ ]{2,30}>' (token_rx), tested with ~ (not ~*) against the same
-- concatenated field text as the existing marker regex. Everything else is unchanged; the two concatenations were moved
-- into a LATERAL so each is evaluated once for both regexes (verified equivalent to the prior definition over every
-- package before shipping). This is the single source of truth for both package_completion_blocking_defects() (blocking)
-- and list_packages_with_meta_text_leak() (advisory), so no other SQL needs to change.
-- Worker note: auto-remediate-packages' free strip only removes lines matching its own artifact patterns, so a placeholder
-- hit finds nothing to strip and escalates (free, no paid regeneration). The fix is a 30-second exact-match strip by hand.
CREATE OR REPLACE FUNCTION public.package_meta_text_leak(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH marker AS (
    SELECT
      '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait\s*[,—–-]+\s*i need to|\[closing paragraph|\[insert |\[choose (?!a name or leave blank)|\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M|self-reference|no self-entry needed|this would be removed in actual implementation|\[no [^\]]{0,80}hostile|\mtotal \w+:\s*(no more than|~?\d+\s*words?|concrete facts)|\m(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)/(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)\M)'::text AS rx,
      '(relationship matrix|established cast dynamics|\Mcast dynamics\M)'::text AS narrative_only_rx,
      -- Stray template placeholder token, e.g. "<FILL>" left at the end of a confession. Case-sensitive on purpose
      -- (matched with ~, not ~*) so lowercase markup like <b> or <br> never trips it. Corpus-validated 2026-10-02:
      -- zero angle-bracket tokens of any kind across 248 packages / 2,780 text units after the one known hit was repaired.
      '<[A-Z][A-Z0-9_ ]{2,30}>'::text AS token_rx
  ),
  package_hit AS (
    SELECT 'package'::text AS source
    FROM marker m
    CROSS JOIN LATERAL (
      SELECT (
      coalesce(_pkg.game_overview,'') || ' ' || coalesce(_pkg.detective_script,'') || ' ' ||
      coalesce(_pkg.host_guide,'') || ' ' || coalesce(_pkg.timeline,'') || ' ' ||
      coalesce(_pkg.hosting_tips,'') || ' ' || coalesce(_pkg.preparation_instructions,'') || ' ' ||
      coalesce(_pkg.evidence_cards #>> '{}','')
      ) AS txt
    ) t
    WHERE t.txt ~* m.rx OR t.txt ~ m.token_rx
  ),
  character_hit AS (
    SELECT DISTINCT 'character:' || mc.character_name AS source
    FROM mystery_characters mc
    CROSS JOIN marker m
    CROSS JOIN LATERAL (
      SELECT
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
          coalesce(mc.final_innocent,'') || ' ' || coalesce(mc.final_guilty,'') || ' ' || coalesce(mc.final_accomplice,'') || ' ' ||
          coalesce(mc.reveal_confession_guilty,'') || ' ' || coalesce(mc.reveal_confession_accomplice,'')
        ) AS txt,
        (
          coalesce(mc.introduction,'') || ' ' || coalesce(mc.background,'') || ' ' ||
          coalesce(mc.secret,'') || ' ' || coalesce(mc.relationships::text,'') || ' ' ||
          coalesce(mc.description::text,'')
        ) AS narrow_txt
    ) t
    WHERE mc.package_id = _pkg.id
      AND (t.txt ~* m.rx OR t.txt ~ m.token_rx OR t.narrow_txt ~* m.narrative_only_rx)
  ),
  all_hits AS (
    SELECT source FROM package_hit
    UNION
    SELECT source FROM character_hit
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE array_agg(source ORDER BY source) END
  FROM all_hits;
$function$;
