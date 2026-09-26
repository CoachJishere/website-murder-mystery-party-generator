-- ADR-0128 Addendum 1: the flat "3 distinct characters" threshold in
-- detect_party_clusters() is a low bar for a large cast -- e.g. a 30-player
-- mystery only needs 3 of 30 guests to peek at their link right after the
-- host mass-sends it (curiosity, not a party) to trip the detector. Scale
-- the floor with player_count: max(3, ceil(player_count / 2)). Keeps the
-- existing floor of 3 for small casts (where it's already a meaningful
-- bar) and raises it for large ones.
--
-- Deliberately NOT gating on time-since-sent_at (considered and rejected):
-- a host who sends links the same day as, or the night before, the party
-- is a real and common cohort in the retro data (ADR-0128) -- for that
-- cohort "just got the link" and "the party is starting" are the same
-- event, so a delay-since-sent gate would suppress exactly the fast
-- detection this system exists to provide.

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
        HAVING COUNT(DISTINCT ca.character_id) >= GREATEST(3, CEIL(COALESCE(c.player_count, 6) / 2.0))
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
