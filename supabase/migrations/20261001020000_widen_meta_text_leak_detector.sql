-- ADR-0103 Addendum 71: widen package_meta_text_leak().
--  1. "wait, i need to" -> "wait\s*[,—–-]+\s*i need to": Percival's "Wait — I need to review that
--     formatting before finalizing." (A Feast For The Dying) used an em dash and slipped past the comma-only form.
--  2. Also scan reveal_confession_guilty / reveal_confession_accomplice, which the detector never looked at
--     (a paid package, "Operation: Thirty & Murdery", shipped a "Wait, I need to correct that last piece"
--     leak in reveal_confession_accomplice for 5 weeks).
-- Only the marker regex and the character field concat changed; everything else is identical to the prior definition.
CREATE OR REPLACE FUNCTION public.package_meta_text_leak(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH marker AS (
    SELECT
      '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait\s*[,—–-]+\s*i need to|\[closing paragraph|\[insert |\[choose (?!a name or leave blank)|\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M|self-reference|no self-entry needed|this would be removed in actual implementation|\[no [^\]]{0,80}hostile|\mtotal \w+:\s*(no more than|~?\d+\s*words?|concrete facts)|\m(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)/(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)\M)'::text AS rx,
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
          coalesce(mc.final_innocent,'') || ' ' || coalesce(mc.final_guilty,'') || ' ' || coalesce(mc.final_accomplice,'') || ' ' ||
          coalesce(mc.reveal_confession_guilty,'') || ' ' || coalesce(mc.reveal_confession_accomplice,'')
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
