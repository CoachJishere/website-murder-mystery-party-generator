-- ADR-0128: detect a "party cluster" (several guests hitting their character
-- token pages within a tight window) and pull the existing 21-day
-- how_did_it_go follow-up email earlier, so it lands ~16h after the party
-- instead of on an arbitrary calendar delay. Additive only -- the flat
-- 21-day row inserted by schedule_followup_emails() is untouched; this only
-- ever moves scheduled_for EARLIER, and only once per conversation. A host
-- who never produces a detectable cluster still gets the 21-day fallback.
--
-- Retro validation (PostHog $pageview data joined against
-- character_assignments -> mystery_characters -> mystery_packages ->
-- conversations, 2026-08-22 to 2026-09-25): for conversations with 3+
-- distinct characters accessed together, the cluster span was almost always
-- under an hour, a few ran 3-9h. See ADR-0128 for full findings.

ALTER TABLE public.character_assignments
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS party_detected_at timestamptz;

-- Token-scoped, SECURITY DEFINER like the other CharacterAccess RPCs
-- (get_character_by_token, get_packet_metadata_by_token, ...). Called from
-- CharacterAccess.tsx on every successful load -- fire-and-forget, never
-- blocks the guest's page.
CREATE OR REPLACE FUNCTION public.touch_character_access(access_token_param uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE character_assignments
  SET last_accessed_at = now()
  WHERE access_token = access_token_param
    AND is_sent = true;
$function$;

CREATE OR REPLACE FUNCTION public.detect_party_clusters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _conv record;
BEGIN
  FOR _conv IN
    SELECT c.id AS conversation_id
    FROM conversations c
    JOIN followup_emails fe
      ON fe.conversation_id = c.id
     AND fe.email_type = 'how_did_it_go'
     AND fe.status = 'pending'
     AND fe.scheduled_for > NOW() + INTERVAL '16 hours'
    WHERE c.party_detected_at IS NULL
      AND c.is_paid = true
      AND c.is_test IS NOT TRUE
      AND EXISTS (
        SELECT 1
        FROM character_assignments ca
        JOIN mystery_characters mc ON mc.id = ca.character_id
        JOIN mystery_packages mp ON mp.id = mc.package_id
        WHERE mp.conversation_id = c.id
          AND ca.last_accessed_at > NOW() - INTERVAL '6 hours'
        GROUP BY mp.conversation_id
        HAVING COUNT(DISTINCT ca.character_id) >= 3
      )
  LOOP
    UPDATE conversations
    SET party_detected_at = NOW()
    WHERE id = _conv.conversation_id;

    UPDATE followup_emails
    SET scheduled_for = NOW() + INTERVAL '16 hours'
    WHERE conversation_id = _conv.conversation_id
      AND email_type = 'how_did_it_go'
      AND status = 'pending';
  END LOOP;
END;
$function$;

SELECT cron.schedule(
  'party-cluster-detection',
  '*/30 * * * *',
  $$SELECT public.detect_party_clusters();$$
);

-- To disable without dropping the audit history:
--   SELECT cron.unschedule('party-cluster-detection');
