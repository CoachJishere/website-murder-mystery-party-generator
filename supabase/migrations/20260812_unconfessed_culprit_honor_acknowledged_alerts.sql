-- Follow-up to 20260811_acknowledged_health_alerts.sql: that migration's own
-- comment says "Detectors should exclude any package_id present here for
-- their own detector name," but only scripts/detect-roster-mismatches.mjs
-- (check 12) actually did. list_packages_with_unconfessed_culprit (check 14,
-- ADR-0070) never got wired up, so a confirmed false positive would keep
-- re-alerting every 6 hours for as long as it stays inside the detector's
-- 30-day _since window instead of being silenceable like check 12's findings.
--
-- Caught investigating the 2026-08-12 health-check alert: "Ghosts Of The
-- Past: A Halloween Reunion Murder" (accomplice Parker/Petra Wolfe) flagged
-- as accomplice_denies_despite_named. Read in full — it is a genuine,
-- unambiguous admission of conspiracy ("I worked with someone who did...
-- I was the one who made it possible. And I would do it again."). The
-- detector's denial regex matched the clause "But I didn't kill Reese/Raven"
-- (true — Riley did the killing — but embedded inside a confession, not a
-- denial), and none of the confession-keyword exclusions ("i helped", "i
-- admit", "i provided", etc.) happen to appear verbatim in Parker's phrasing
-- ("I worked with", "we planned", "I made it possible"). Same false-positive
-- class ADR-0070 already documented for "Death At The Velvet Rose"/Max
-- Sullivan — a denial-shaped clause inside a real confession. Chasing this
-- with more regex keywords is the losing battle ADR-0070 already declined to
-- fight; acknowledging the specific instance is the intended mechanism.
--
-- The other 2026-08-12 hit, "The Case Of The Stolen Golden Flamingo"
-- (accomplice Marina Splash), was a real bug (genuine flat denial
-- contradicting the murderer's account that she helped move the statue) and
-- was hand-patched in place, not acknowledged — see CHANGELOG 2026-08-12.

CREATE OR REPLACE FUNCTION public.list_packages_with_unconfessed_culprit(
  _since timestamptz DEFAULT '2026-01-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  reason text,
  character_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH pkgs AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE c.mystery_style = 'detective'
      AND (mp.generation_status->>'status') = 'completed'
      AND mp.created_at >= _since
      AND c.is_test = false
  ),
  murderers AS (
    SELECT mc.package_id, mc.character_name, mc.final_statement
    FROM mystery_characters mc
    WHERE mc.character_role = 'murderer'
  ),
  accomplices AS (
    SELECT mc.package_id, mc.character_name, mc.final_statement,
           regexp_split_to_array(
             regexp_replace(mc.character_name, '[^A-Za-z/ ]', '', 'g'), '[/ ]+'
           ) AS name_tokens
    FROM mystery_characters mc
    WHERE mc.character_role = 'accomplice'
  ),
  murderer_flags AS (
    SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at,
           'murderer_denies'::text AS reason, m.character_name
    FROM murderers m
    JOIN pkgs p ON p.package_id = m.package_id
    WHERE m.final_statement ~* '(that.?s not me|not me\.|wasn.?t me|isn.?t me|i would never|i.?m innocent|i am innocent|i didn.?t (do|kill|murder|commit|help|participate)|not who i am|that.?s something i would never|nothing more\.|no knowledge)'
      AND m.final_statement !~* '(i did it|i killed|i murdered|i poisoned|yes\.? i did|i confess|i stand here guilty|i took .{0,15}life|i understand the gravity|i realize i (took|committed))'
  ),
  accomplice_flags AS (
    SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at,
           'accomplice_denies_despite_named'::text AS reason, a.character_name
    FROM accomplices a
    JOIN murderers m ON m.package_id = a.package_id
    JOIN pkgs p ON p.package_id = a.package_id
    WHERE EXISTS (
            SELECT 1 FROM unnest(a.name_tokens) t
            WHERE length(t) > 3 AND m.final_statement ILIKE '%' || t || '%'
          )
      AND a.final_statement ~* '(that.?s not me|not me\.|wasn.?t me|isn.?t me|i would never|i.?m innocent|i am innocent|i didn.?t (do|kill|murder|commit|help|participate)|not who i am|that.?s something i would never|nothing more\.|no knowledge)'
      AND a.final_statement !~* '(i helped|i agreed to help|guilty of helping|i admit|i confess|i was the lookout|i.?m guilty|i am guilty|i provided|i assisted|i created that|i staged)'
  ),
  combined AS (
    SELECT * FROM murderer_flags
    UNION ALL
    SELECT * FROM accomplice_flags
  )
  SELECT c.*
  FROM combined c
  WHERE NOT EXISTS (
    SELECT 1 FROM acknowledged_health_alerts aha
    WHERE aha.package_id = c.package_id
      AND aha.detector = 'unconfessed_culprit'
  )
  ORDER BY c.is_paid DESC, c.created_at DESC;
$$;

COMMENT ON FUNCTION public.list_packages_with_unconfessed_culprit(timestamptz) IS
  'Read-only backlog of detective-style completed packages whose Final Statements round (the ONLY reveal moment in this format) fails to actually reveal the solution: the murderer''s own final_statement reads as a denial rather than a confession, or a named accomplice''s final_statement denies a role the murderer already confessed to on their behalf. Keyword heuristic, escalate-only — read the flagged final_statement before acting, do not auto-remediate. Excludes is_test packages (ADR-0072) and packages acknowledged for detector=''unconfessed_culprit'' in acknowledged_health_alerts. Default _since = 2026-01-01. See ADR-0070.';

INSERT INTO public.acknowledged_health_alerts (package_id, detector, note)
VALUES (
  '8b0729ac-9709-4ab3-9e56-b5121af048b2',
  'unconfessed_culprit',
  'Ghosts Of The Past: A Halloween Reunion Murder — Parker/Petra Wolfe flagged as accomplice_denies_despite_named. Read in full 2026-08-12: genuine admission of conspiracy ("I worked with someone who did... I was the one who made it possible. And I would do it again."), not a denial. Detector false positive — regex matched "I didn''t kill Reese/Raven" (true, embedded in a confession) and no confession-keyword exclusion happened to match Parker''s phrasing. Same false-positive class as the already-documented Velvet Rose/Max Sullivan case in ADR-0070. Content is correct as delivered, no patch needed.'
)
ON CONFLICT (package_id, detector) DO NOTHING;
