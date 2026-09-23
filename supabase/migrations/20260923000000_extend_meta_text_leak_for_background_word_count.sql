-- Extend list_packages_with_meta_text_leak() to catch a leaked prompt-template
-- word-count/style directive found during the 2026-09-23 New-Purchase Coherence
-- Sweep (ADR-0103 Addendum 54): the Child (Unified) blueprint's `background`
-- field template ended with an inline instruction ("Total background: no more
-- than ~150 words. All concrete facts — no scene-setting, no atmosphere.")
-- phrased like another labeled field the model had just been filling in
-- (e.g. "**Name:**", "**Role:**"). The model pattern-matched it as a field to
-- complete and echoed it verbatim or paraphrased ("Total background: concrete
-- facts only.", "Total background: 148 words."). Found in 5 live characters
-- across 4 packages (2 from today's purchases, 2 pre-existing historical).
--
-- Root cause fixed at the prompt source in
-- temp-files/MM Live - Child (Unified)43-BackgroundLengthLeakFix.blueprint.json
-- (not yet imported into Make.com — needs manual import). This migration adds
-- the detector so any recurrence (this fix not yet live, or a similar leak in
-- another field) surfaces on the next sweep/health-check rather than shipping
-- silently to a paying customer.
CREATE OR REPLACE FUNCTION public.list_packages_with_meta_text_leak(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, sources text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH marker AS (
    SELECT
      '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose (?!a name or leave blank)|\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M|self-reference|no self-entry needed|this would be removed in actual implementation|\[no [^\]]{0,80}hostile|\mtotal \w+:\s*(no more than|~?\d+\s*words?|concrete facts)|\m(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)/(Ihre|Deine|Ihr|Dein|Sie|du|tu|vous|ton|votre|tú|usted|teu|seu|tua|sua|tuo|suo|je|u)\M)'::text AS rx,
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

COMMENT ON FUNCTION public.list_packages_with_meta_text_leak(timestamp with time zone) IS
  'Detects leaked authoring/meta text in package content, incl. leaked prompt-template word-count directives (ADR-0103 Addendum 54, 2026-09-23).';
