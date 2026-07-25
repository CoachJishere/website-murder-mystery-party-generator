-- Durable post-generation detectors for content-quality defects that reach
-- customers with generation_status=completed and every field populated — the
-- class of failure only a human reader (or an angry customer) has caught so far.
--
-- WHY (audit 2026-07-25): three recent paid packages were reviewed by hand and
-- surfaced failure modes that NO existing check could see:
--   * "Mutiny And Murder On The Crimson Tide": raw model chain-of-thought in a
--     character's relationships field ("Wait, I need to correct this... the
--     matrix shows Morgan's row..."); a bracketed authoring directive in the
--     detective reveal ("[CLOSING PARAGRAPH — No Accomplice Beat because
--     master_context...]"); an evidence card DESCRIPTION naming the culprit.
--   * "The Last Will And Testament Of Adelaide Crane": game_overview opened with
--     a DIFFERENT victim ("Sophie Duplock, a 24-year-old real estate magnate")
--     than the rest of the package (Adelaide Crane); a random-slip ("character"
--     style) game whose static secret was a fixed murder confession ("You
--     poisoned Adelaide's Earl Grey... You killed Adelaide"), pre-revealing a
--     culprit the slip mechanic is supposed to choose at the table.
--
-- These mirror the read-only-backlog pattern of list_packages_missing_evidence_images
-- (ADR-0016) and list_packages_with_identity_conflicts (ADR-0041): no status
-- mutation, on-demand or health-check callable, _since default. They are the
-- detection backstop; the Make.com prompt guardrails are the prevention layer.

-- ---------------------------------------------------------------------------
-- 1. Meta-text / chain-of-thought / template-artifact leakage (mode 5)
--    High-precision marker phrases that should never appear in delivered text.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_meta_text_leak(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  sources text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
  WITH marker AS (
    -- Markers tightened 2026-07-25 after validation: dropped "the matrix shows"
    -- and "the master context" (both appear legitimately in sci-fi/tech themes);
    -- kept the code token master_context and unambiguous authoring/CoT artifacts.
    -- Validated: 10 historical true positives ([choose ...] accusation placeholders
    -- + master_context leaks), zero false positives.
    SELECT '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty)'::text AS rx
  ),
  hits AS (
    -- character-level narrative + host/player fields
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           'character:' || mc.character_name AS source
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    CROSS JOIN marker m
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
      AND (
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
    UNION
    -- package-level host/player fields
    SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, 'package'::text AS source
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    CROSS JOIN marker m
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
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
$fn$;

COMMENT ON FUNCTION public.list_packages_with_meta_text_leak(timestamptz) IS
  'Completed packages whose delivered text contains model chain-of-thought or template artifacts (e.g. "the matrix shows", "[CLOSING PARAGRAPH ...]", "let me reconsider"). Crimson Tide incident, audit 2026-07-25. Read-only.';

-- ---------------------------------------------------------------------------
-- 2. Evidence card DESCRIPTION names the culprit (mode 2, ADR-0035)
--    ⚠️ ADVISORY / NOT WIRED INTO health-check alerting: validation 2026-07-25
--    showed a high false-positive rate — the murderer surname legitimately
--    appears in evidence as a location/family name ("Blackstone Manor"), a
--    common word ("Student", "Midnight"), or inside host-only sections that use
--    "### IMPLICATIONS" instead of "#### SIGNIFICANCE" (so stripping misses
--    them). Kept for manual spot-checks; ADR-0035's parent-prompt guardrail
--    (Parent v45 "EVIDENCE SPOILER RULE") is the real prevention. Refine (name
--    tokenisation + all host-section formats) before auto-alerting.
--    Predetermined games only (a character_role='murderer' exists). The
--    player-facing DESCRIPTION must not name the murderer; SIGNIFICANCE
--    (Host Only) may. We strip SIGNIFICANCE blocks then look for the
--    murderer's surname (last name token) in the remaining player text.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_evidence_culprit_spoiler(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  murderer text,
  surname text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
  WITH murderer AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           mc.character_name,
           -- last alphabetic word of the character name = surname (e.g. "...'Compass' Weatherby" -> "Weatherby")
           (regexp_match(mc.character_name, '([A-Za-z]+)[^A-Za-z]*$'))[1] AS surname,
           -- player-facing evidence: strip host-only SIGNIFICANCE blocks
           regexp_replace(coalesce(mp.evidence_cards #>> '{}',''), '#### SIGNIFICANCE[^#]*', '', 'g') AS player_evidence
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id AND mc.character_role = 'murderer'
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         character_name AS murderer, surname
  FROM murderer
  WHERE surname IS NOT NULL AND length(surname) >= 4
    AND player_evidence ~* ('\m' || surname || '\M')
  ORDER BY is_paid DESC, created_at DESC;
$fn$;

COMMENT ON FUNCTION public.list_packages_with_evidence_culprit_spoiler(timestamptz) IS
  'Predetermined packages whose player-facing evidence-card DESCRIPTION names the murderer (surname appears outside the host-only SIGNIFICANCE block). ADR-0035. Crimson Tide R4 incident, audit 2026-07-25. Read-only.';

-- ---------------------------------------------------------------------------
-- 3. Wrong victim in game_overview (mode 3)
--    The victim named at the top of game_overview should also appear in the
--    master_context (source of truth) or a character background. If the
--    overview's victim surname appears NOWHERE else, the overview bled a
--    foreign victim (Adelaide Crane / "Sophie Duplock" incident).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_victim_mismatch(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  overview_victim text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
  WITH ov AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           mp.master_context,
           -- first "First Last" proper-noun pair after the "Game Overview" heading
           (regexp_match(coalesce(mp.game_overview,''),
              'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1] AS overview_name
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
  ),
  named AS (
    SELECT *, (regexp_match(overview_name, '([A-Za-z]+)$'))[1] AS surname
    FROM ov WHERE overview_name IS NOT NULL
  )
  SELECT n.package_id, n.conversation_id, n.title, n.is_paid, n.created_at, n.overview_name AS overview_victim
  FROM named n
  WHERE length(n.surname) >= 4
    -- surname absent from master_context AND from every character background
    AND coalesce(n.master_context,'') !~* ('\m' || n.surname || '\M')
    AND NOT EXISTS (
      SELECT 1 FROM mystery_characters mc
      WHERE mc.package_id = n.package_id
        AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || n.surname || '\M')
    )
  ORDER BY n.is_paid DESC, n.created_at DESC;
$fn$;

COMMENT ON FUNCTION public.list_packages_with_victim_mismatch(timestamptz) IS
  'Completed packages whose game_overview names a victim (surname) that appears nowhere in master_context or any character background — a foreign-victim bleed. Adelaide Crane / "Sophie Duplock" incident, audit 2026-07-25. Read-only.';

-- ---------------------------------------------------------------------------
-- 4. Fixed-culprit leak in a random-slip ("character") game (mode 4)
--    In character-style mysteries the culprit is drawn at the table, so a
--    character's STATIC secret must be a motive, never a murder confession.
--    Flag a static secret that both confesses a kill AND talks about hiding
--    guilt / investigating your own crime (the pairing that separates a real
--    confession from backstory or hypothetical framing).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_slip_culprit_leak(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  characters text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
  WITH slip AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at, mc.character_name,
           coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'') AS static_secret
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
      AND mp.mystery_style = 'character'
      -- character-style packages should have NO predetermined murderer role
      AND NOT EXISTS (SELECT 1 FROM mystery_characters m2 WHERE m2.package_id = mp.id AND m2.character_role = 'murderer')
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS characters
  FROM slip
  WHERE static_secret ~* '\myou (poisoned|killed|murdered|stabbed|strangled|shot|smothered)\M'
    AND static_secret ~* '(hide|hiding|conceal|cover up).{0,60}(guilt|your crime|your own crime|what you did)'
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$fn$;

COMMENT ON FUNCTION public.list_packages_with_slip_culprit_leak(timestamptz) IS
  'Random-slip ("character" style) packages whose static secret is a fixed murder confession (pre-reveals a culprit the slip should choose). Adelaide Crane / Morgan Ashford incident, audit 2026-07-25. Read-only.';

-- ---------------------------------------------------------------------------
-- 5. Self-directed / victim-directed questions (mode 6)
--    A character's "questions to ask" list must target other LIVING players.
--    Flag a question whose target is the asking character themselves.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_self_directed_questions(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  offenders text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
  WITH q AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           mc.character_name,
           coalesce(mc.round2_questions,'') || ' ' || coalesce(mc.round3_questions,'') || ' ' || coalesce(mc.round4_questions,'') AS questions
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS offenders
  FROM q
  -- a "**To <own name>:**" question directed at the asking character
  WHERE questions ~* ('\*\*to ' || regexp_replace(character_name, '([\[\](){}.*+?^$\\|])', '\\\1', 'g') || '\M')
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$fn$;

COMMENT ON FUNCTION public.list_packages_with_self_directed_questions(timestamptz) IS
  'Completed packages where a character''s "questions to ask" list contains a question directed at themselves ("**To <own name>:**"). Crimson Tide incident, audit 2026-07-25. Read-only.';

GRANT EXECUTE ON FUNCTION public.list_packages_with_meta_text_leak(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_packages_with_evidence_culprit_spoiler(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_packages_with_victim_mismatch(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_packages_with_slip_culprit_leak(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_packages_with_self_directed_questions(timestamptz) TO service_role;
