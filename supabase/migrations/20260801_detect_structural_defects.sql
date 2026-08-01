-- Durable detector for STRUCTURAL defects in generated packages — the class
-- where the package's *shape* is broken (bad enum value, two culprits, a row
-- whose own background names a different character) rather than its prose being
-- low-quality. Companion to the ADR-0042 content-quality detectors.
--
-- WHY (incident 2026-07-30, paid, conversation 1572aac5-c103-40dc-aff0-0166154da70c,
-- "Death At The Velvet Viper: A New Orleans Speakeasy Tragedy"):
--   * A 502 from the generation chain was stored verbatim as a character's
--     character_role: "<html>...<title>502 Bad Gateway</title>...".
--   * The package had TWO 'murderer' characters (Thea + Theo Babineaux) for the
--     same crime, in a detective/predetermined-style game that must have one.
--   * The 30-person cast was gender-duplicated with cross-wired content: a row
--     named "Grace Marchand" whose background read "**Name:** Gus Marchand",
--     and 15 male/female pairs sharing a surname AND a byte-identical
--     "**Role:**" line ("Head Chef at Fancy's Supper Club" twice, etc.).
--   Every ADR-0042 content detector AND the health check passed. This class was
--   a blind spot: content detectors read prose, nothing read structure.
--
-- ESCALATE-ONLY. Unlike the ADR-0042 findings, none of these are repairable by
-- the ADR-0047 auto-remediation worker — you cannot synthesise a correct role,
-- pick which of two murderers is real, or un-cross-wire a cast without
-- regenerating. The worker is deliberately NOT taught about these; the health
-- check alerts a human. See ADR-0048.
--
-- Read-only backlog, same pattern as list_packages_with_identity_conflicts
-- (ADR-0041) and the ADR-0042 detectors: no status mutation, _since default,
-- callable on demand or from health-check.yml.
--
-- ---------------------------------------------------------------------------
-- generation_status ENCODING NOTE (found while validating this detector)
-- ---------------------------------------------------------------------------
-- generation_status is jsonb, but 23 of 144 rows (17 of them 'completed',
-- including the Velvet Viper package itself) hold a jsonb *string* containing
-- encoded JSON rather than a jsonb object. For those rows
-- `generation_status->>'status'` returns NULL, so every existing detector's
-- `(generation_status->>'status') = 'completed'` filter silently skips them.
-- This function normalises both encodings. The existing detectors still carry
-- the narrow filter — tracked as an open follow-up, see ADR-0048 Consequences.

-- ---------------------------------------------------------------------------
-- SUB-CHECKS — validated 2026-08-01 against ALL history (_since '2000-01-01')
-- ---------------------------------------------------------------------------
-- SHIPPED:
--   invalid_role            3 packages. "Murder At The Coronation: A Royal
--                           Scandal" (paid, 2026-07-31, LIVE 502-in-role — an
--                           unfixed recurrence of the motivating incident) plus
--                           two 2026-04-22 packages using a legacy uppercase
--                           vocabulary (INNOCENT/MURDERER/GUILTY/ACCOMPLICE).
--                           All three are genuine: app code compares against the
--                           lowercase set. NULL character_role is NOT flagged —
--                           492 rows across 42 character-style (random-slip)
--                           packages legitimately have no role.
--   multiple_murderers      2 packages, both genuine: "Death In The Spotlight"
--                           (15 murderers, unpaid, 2026-04-21) and "The Night Of
--                           The Tide" (2 murderers, paid, 2026-03-26).
--   name_background_mismatch 0 packages — zero false positives. The Velvet Viper
--                           true positive was repaired in place on 2026-07-31
--                           before this detector existed; the rule is verified by
--                           construction against it (see the sub-check comment).
--   duplicated_cast         1 package: exactly the Velvet Viper package, zero
--                           false positives. This is the surviving, unrepaired
--                           evidence of the gender-duplication defect.
--
-- DROPPED (validated, too noisy to ship — same discipline as the ADR-0042
-- meta-leak tightening and the evidence-spoiler exclusion):
--   cast_count_mismatch     35 packages when comparing character rows to
--                           conversations.player_count. player_count is the
--                           request-time ask, not a contract: casts legitimately
--                           run ±1 (victim/host handling) and the 2025 backlog is
--                           full of partial legacy rows. Signal-free. Omitted.
--   raw duplicate-surname   Flags every legitimate family mystery (the "Crane"
--                           package et al). Replaced by duplicated_cast, which
--                           requires surname AND an identical Role line.
--   naive name-vs-background Comparing character_name to the "**Name:**" line
--                           without guards flags 18 packages, almost all benign:
--                           the gender-flexible dual-name convention
--                           ("Jordan/Jordana Vance" -> "Jordan Vance"),
--                           honorifics ("The Honourable Tiggy ..."), parenthetical
--                           aliases ("Reese Hart (also goes by Reagan Hart)") and
--                           nickname/formal variance (Joe/Joseph, Bill/William,
--                           Emily/Emilia). Tightened, not shipped raw.

CREATE OR REPLACE FUNCTION public.list_packages_with_structural_defects(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  defects text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
  WITH pkg AS (
    -- Completed packages, tolerating BOTH generation_status encodings (see note above).
    SELECT
      mp.id AS package_id,
      mp.conversation_id,
      c.title,
      c.is_paid,
      mp.created_at,
      coalesce(mp.mystery_style, c.mystery_style) AS mystery_style
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE mp.created_at >= _since
      AND (
        CASE
          WHEN jsonb_typeof(mp.generation_status) = 'object'
            THEN mp.generation_status ->> 'status'
          WHEN jsonb_typeof(mp.generation_status) = 'string'
             AND (mp.generation_status #>> '{}') ~ '^\s*\{'
            THEN ((mp.generation_status #>> '{}')::jsonb) ->> 'status'
          ELSE NULL
        END
      ) IN ('completed', 'complete')
  ),

  -- --------------------------------------------------------------------
  -- 1. invalid_role — character_role outside the known vocabulary.
  --    Catches a truncated/error response stored verbatim (the 502 incident)
  --    and legacy uppercase vocabularies. NULL is legitimate (random-slip).
  --    Highest value, near-zero false-positive rate.
  -- --------------------------------------------------------------------
  invalid_role AS (
    SELECT p.package_id,
           'invalid_role: ' || array_to_string(
             array_agg(DISTINCT left(regexp_replace(mc.character_role, '\s+', ' ', 'g'), 60)
                       ORDER BY left(regexp_replace(mc.character_role, '\s+', ' ', 'g'), 60)), ', '
           ) AS defect
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
    WHERE mc.character_role IS NOT NULL
      AND mc.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
    GROUP BY p.package_id
  ),

  -- --------------------------------------------------------------------
  -- 2. multiple_murderers — a predetermined-culprit game with >1 murderer.
  --    Scoped to detective/predetermined packages; the >1 condition already
  --    implies a murderer role exists, so random-slip games can never trip it.
  -- --------------------------------------------------------------------
  multiple_murderers AS (
    SELECT p.package_id,
           'multiple_murderers (' || count(*) || '): ' ||
           array_to_string(array_agg(mc.character_name ORDER BY mc.character_name), ' / ') AS defect
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id AND mc.character_role = 'murderer'
    WHERE p.mystery_style IS DISTINCT FROM 'character'
    GROUP BY p.package_id
    HAVING count(*) > 1
  ),

  -- --------------------------------------------------------------------
  -- 3. name_background_mismatch — a character row whose own background
  --    introduces a DIFFERENT person.
  --
  --    Tightened hard (see DROPPED note above). A row is only flagged when the
  --    normalised names differ, NEITHER is a substring of the other (kills
  --    honorifics, parenthetical aliases and truncations), neither side uses the
  --    gender-flexible "A/B Surname" convention, AND one of:
  --      (a) the surnames differ outright  -> a foreign person bled in; or
  --      (b) the background's name is the name of ANOTHER character row in the
  --          same package -> unambiguous cross-wiring.
  --    (b) is the Velvet Viper signature: the "Grace Marchand" row whose
  --    background read "**Name:** Gus Marchand" while a separate "Gus Marchand"
  --    row existed. That package was repaired in place on 2026-07-31, so the
  --    rule returns 0 rows today — and 0 false positives across all history.
  -- --------------------------------------------------------------------
  named AS (
    SELECT p.package_id, mc.character_name,
           btrim(split_part((regexp_match(coalesce(mc.background, ''), '\*\*Name:\*\*\s*([^\n\r*]+)'))[1], '(', 1)) AS bg_name
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
  ),
  named_norm AS (
    SELECT package_id, character_name, bg_name,
           lower(regexp_replace(character_name, '[^a-zA-Z]', '', 'g')) AS cn_norm,
           lower(regexp_replace(bg_name, '[^a-zA-Z]', '', 'g')) AS bg_norm,
           lower((regexp_match(character_name, '([A-Za-z]+)[^A-Za-z]*$'))[1]) AS cn_surname,
           lower((regexp_match(bg_name, '([A-Za-z]+)[^A-Za-z]*$'))[1]) AS bg_surname
    FROM named
    WHERE bg_name IS NOT NULL
      AND character_name !~ '/'   -- gender-flexible dual name, e.g. "Jordan/Jordana Vance"
      AND bg_name !~ '/'
  ),
  name_background_mismatch AS (
    SELECT a.package_id,
           'name_background_mismatch: ' || array_to_string(
             array_agg(a.character_name || ' -> background says "' || a.bg_name || '"'
                       ORDER BY a.character_name), '; ') AS defect
    FROM named_norm a
    WHERE a.cn_norm <> '' AND a.bg_norm <> '' AND a.cn_norm <> a.bg_norm
      AND position(a.cn_norm IN a.bg_norm) = 0
      AND position(a.bg_norm IN a.cn_norm) = 0
      AND (
        a.cn_surname IS DISTINCT FROM a.bg_surname
        OR EXISTS (
          SELECT 1 FROM named_norm o
          WHERE o.package_id = a.package_id
            AND o.character_name <> a.character_name
            AND o.cn_norm = a.bg_norm
        )
      )
    GROUP BY a.package_id
  ),

  -- --------------------------------------------------------------------
  -- 4. duplicated_cast — two characters sharing a surname AND a byte-identical
  --    "**Role:**" line: the gender-duplication signature.
  --
  --    A raw duplicate-surname rule is unusable (legitimate family mysteries),
  --    and a raw duplicate-role-line rule alone yields false positives where a
  --    shared role is the premise ("5th Year Hufflepuff Student" across a
  --    Hogwarts cast; two professors of the same subject). Requiring BOTH
  --    isolates exactly the Velvet Viper package across all history — real
  --    families share a surname but not a job description.
  -- --------------------------------------------------------------------
  cast_rows AS (
    SELECT p.package_id, mc.character_name,
           lower((regexp_match(mc.character_name, '([A-Za-zÀ-ÿ]+)[^A-Za-zÀ-ÿ]*$'))[1]) AS surname,
           lower(btrim((regexp_match(coalesce(mc.background, ''), '\*\*Role:\*\*\s*([^\n\r]+)'))[1])) AS role_line
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
  ),
  dup_groups AS (
    SELECT package_id, surname, role_line,
           array_to_string(array_agg(character_name ORDER BY character_name), ' + ') AS whos
    FROM cast_rows
    WHERE surname IS NOT NULL AND length(surname) >= 3
      AND role_line IS NOT NULL AND length(role_line) > 10
    GROUP BY package_id, surname, role_line
    HAVING count(*) > 1
  ),
  duplicated_cast AS (
    SELECT package_id,
           'duplicated_cast (' || count(*) || ' pair(s)): ' ||
           array_to_string(array_agg(whos ORDER BY whos), '; ') AS defect
    FROM dup_groups
    GROUP BY package_id
  ),

  all_defects AS (
    SELECT * FROM invalid_role
    UNION ALL SELECT * FROM multiple_murderers
    UNION ALL SELECT * FROM name_background_mismatch
    UNION ALL SELECT * FROM duplicated_cast
  )
  SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at,
         array_agg(d.defect ORDER BY d.defect) AS defects
  FROM pkg p
  JOIN all_defects d ON d.package_id = p.package_id
  GROUP BY p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at
  ORDER BY p.is_paid DESC, p.created_at DESC;
$fn$;

COMMENT ON FUNCTION public.list_packages_with_structural_defects(timestamptz) IS
  'Completed packages that are STRUCTURALLY broken rather than merely low-quality: a character_role outside (murderer, accomplice, suspect, redHerring) — e.g. a raw 502 body stored as the role; >1 murderer in a predetermined game; a character row whose own background names a different person; or a gender-duplicated cast (same surname + identical Role line). Velvet Viper incident, 2026-07-30. ESCALATE-ONLY: none of these are auto-fixable, only regeneration resolves them — the ADR-0047 remediation worker must not act on this list. Tolerates both generation_status encodings. Read-only. See ADR-0048.';

GRANT EXECUTE ON FUNCTION public.list_packages_with_structural_defects(timestamptz) TO service_role;
