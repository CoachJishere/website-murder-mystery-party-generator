-- ADR-0103 Addendum 79: package_meta_text_leak() also flags (a) a leaked formatting self-correction line and (b) any backtick.
-- Trigger: "Boogie Nights, Bloody Nights" (2026-10-03, English, slip style, 14 characters). A character's final_innocent ended with
-- the line "Let me correct that formatting issue." (a model self-correction leaked into a read-aloud statement) and another character's
-- reveal_confession_accomplice ended with a stray backtick. Every standing detector was silent on both (the phrase list had "let me
-- reconsider/reread/recalculate" but not this variant; stray_rx only matched a triple-backtick fence), so they were found only by the
-- full-cast manual read. Applying the Addendum 38 test (cheap + deterministic; severe on a read-aloud confession) -> build now.
-- Corpus-validated 2026-10-03 over all 250 packages (every character field and every package text field): zero hits for either
-- pattern after the two known rows were hand-repaired, so zero false positives. A hit escalates for a by-hand exact-match edit: the
-- auto-remediate worker's PROSE_LEAK_RX / strip patterns deliberately do NOT include these (a new pattern there would route a hit to
-- the paid regenerate path, which is a separate spend decision; see Addendum 78 for the same stance on stray tokens).
CREATE OR REPLACE FUNCTION public.package_meta_text_leak(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH marker AS (
    SELECT
      '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|let me (correct|fix|clean up|reformat|redo) (that|this|the|my)? ?(formatting|format)|formatting (issue|error|problem|mistake)|master_context|as an ai language model|wait\s*[,—–-]+\s*i need to|\[closing paragraph|\[insert |\[choose (?!a name or leave blank)|\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M|self-reference|no self-entry needed|this would be removed in actual implementation|\[no [^\]]{0,80}hostile|\mtotal \w+:\s*(no more than|~?\d+\s*words?|concrete facts)|\m(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)/(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)\M)'::text AS rx,
      '(relationship matrix|established cast dynamics|\Mcast dynamics\M)'::text AS narrative_only_rx,
      -- Stray template placeholder token, e.g. "<FILL>" left at the end of a confession. Case-sensitive on purpose
      -- (matched with ~, not ~*) so lowercase markup like <b> or <br> never trips it. Corpus-validated 2026-10-02:
      -- zero angle-bracket tokens of any kind across 248 packages / 2,780 text units after the one known hit was repaired.
      '<[A-Z][A-Z0-9_ ]{2,30}>'::text AS token_rx,
      -- Stray generation-glitch artefacts (ADR-0103 Addendum 78). Case-sensitive (~). A closing markup tag such as </final> or
      -- </document>, any backtick (a lone one trailing a confession, or a Markdown code fence), or any Cyrillic letter: none of these belong in guest-facing text in any of the 13
      -- supported languages (none use Cyrillic). Corpus-validated 2026-10-03 across every package: hits were exactly the known glitches.
      '</[a-z]{2,20}>|`|[\u0400-\u04FF]'::text AS stray_rx,
      -- The English word "until" looping or leaking into non-English prose ("hasta que until until until until"). Legitimate in
      -- English text, so it only counts when the same text unit has no common English function word and does have a common
      -- Spanish/German/Dutch/French/Italian/Portuguese one. Corpus-validated 2026-10-03: 0 false positives (the one English-heavy
      -- package that legitimately says "until" 20 times is correctly not flagged).
      '\muntil\M'::text AS until_rx,
      '\m(the|and|with|that)\M'::text AS en_rx,
      '\m(que|el|la|de|los|con|der|die|das|und|het|een|les|des|che|il|não|uma)\M'::text AS foreign_rx
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
    WHERE t.txt ~* m.rx OR t.txt ~ m.token_rx OR t.txt ~ m.stray_rx
       OR (t.txt ~* m.until_rx AND t.txt !~* m.en_rx AND t.txt ~* m.foreign_rx)
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
      AND (t.txt ~* m.rx OR t.txt ~ m.token_rx OR t.txt ~ m.stray_rx
           OR (t.txt ~* m.until_rx AND t.txt !~* m.en_rx AND t.txt ~* m.foreign_rx)
           OR t.narrow_txt ~* m.narrative_only_rx)
  ),
  all_hits AS (
    SELECT source FROM package_hit
    UNION
    SELECT source FROM character_hit
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE array_agg(source ORDER BY source) END
  FROM all_hits;
$function$;
