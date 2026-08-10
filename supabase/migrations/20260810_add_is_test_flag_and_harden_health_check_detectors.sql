-- ADR-0072: is_test flag + health-check detector hardening.
--
-- WHY (incident 2026-08-10): "TEST ADR-0067 Reveal-Confession Split"
-- (conversation 74b66430-56d6-4376-b3f1-105b8601af65) was ad-hoc test data
-- created 2026-08-07 while validating ADR-0067, marked is_paid=true to
-- exercise the paid path, and left with two abandoned in_progress
-- mystery_packages rows after a successful third attempt. Nothing in the
-- schema or the detectors distinguished it from a real customer, so it fired
-- TWO false alarms: check 2 (stuck in_progress) and check 10
-- (completed_but_empty), the latter via a genuine join bug (see below).
--
-- This migration:
--   1. Adds conversations.is_test (default false) so test data can be marked
--      and excluded, instead of relying on nobody forgetting to clean up.
--   2. Backfills is_test=true on the known offending conversation.
--   3. Adds "AND NOT c.is_test" to every health-check detector function.
--   4. Fixes the list_completed_but_empty_packages join bug: it OR'd a
--      conversation-level flag (c.has_complete_package) against a
--      package-level row, so ANY sibling mystery_packages row for a
--      conversation with one completed package inherited the "completed"
--      verdict even if that row's own status was in_progress. Scoped to the
--      latest package per conversation instead — the only package a
--      conversation-level flag can legitimately describe.
--   5. Promotes checks 2 (stuck in_progress) and 3 (needs_review) from raw
--      REST filters in health-check.yml to proper SQL functions, so they can
--      join conversations and apply the same is_test exclusion (PostgREST
--      can't cleanly do this filter from a shell one-liner).

-- ---------------------------------------------------------------------------
-- 1-2. is_test flag + backfill
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.conversations.is_test IS
  'Marks ad-hoc/manual test conversations (e.g. exercising the live paid-generation path against production). Excluded from every health-check detector. Set explicitly when creating test data; see docs/OPERATIONS.md "Testing against production" and ADR-0072.';

UPDATE public.conversations SET is_test = true
WHERE id = '74b66430-56d6-4376-b3f1-105b8601af65';

-- ---------------------------------------------------------------------------
-- 3a. list_packages_missing_evidence_images (ADR-0016)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_missing_evidence_images(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  cards_in_text integer,
  images_present integer,
  missing_rounds text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH pkg AS (
    SELECT
      mp.id,
      mp.conversation_id,
      c.title,
      c.is_paid,
      mp.created_at,
      coalesce(
        CASE WHEN jsonb_typeof(mp.evidence_cards) = 'string'
             THEN mp.evidence_cards #>> '{}'
             ELSE mp.evidence_cards::text END,
        ''
      ) AS ec_text,
      coalesce(mp.evidence_card_images, '{}'::jsonb) AS imgs
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status->>'status') = 'completed'
      AND mp.created_at >= _since
      AND NOT c.is_test
  ),
  scored AS (
    SELECT
      p.id,
      p.conversation_id,
      p.title,
      p.is_paid,
      p.created_at,
      ((length(p.ec_text) - length(replace(p.ec_text, '## EVIDENCE: ROUND', '')))
        / length('## EVIDENCE: ROUND'))::integer AS cards_in_text,
      (SELECT count(*) FROM jsonb_object_keys(p.imgs))::integer AS images_present,
      ARRAY(
        SELECT 'round' || n
        FROM (VALUES (2), (3), (4)) AS rounds(n)
        WHERE p.ec_text ILIKE '%EVIDENCE: ROUND ' || n || '%'
          AND coalesce(p.imgs ->> ('round' || n), '') = ''
      ) AS missing_rounds
    FROM pkg p
  )
  SELECT
    s.id,
    s.conversation_id,
    s.title,
    s.is_paid,
    s.created_at,
    s.cards_in_text,
    s.images_present,
    s.missing_rounds
  FROM scored s
  WHERE array_length(s.missing_rounds, 1) > 0
  ORDER BY s.is_paid DESC, s.created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- 3b. list_packages_with_identity_conflicts (ADR-0041)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_identity_conflicts(
  _since timestamptz DEFAULT '2026-06-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  kin_term text,
  claimants text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH chars AS (
    SELECT
      mp.id AS package_id,
      mp.conversation_id,
      c.title,
      c.is_paid,
      mp.created_at,
      mc.character_name,
      coalesce(mc.introduction, '') || ' ' ||
      coalesce(mc.round2_script, '') || ' ' ||
      coalesce(mc.round3_script, '') || ' ' ||
      coalesce(mc.round4_script, '') || ' ' ||
      coalesce(mc.final_statement, '') AS claims,
      coalesce(mc.background, '') || ' ' ||
      coalesce(mc.relationships::text, '') || ' ' ||
      coalesce(mc.description::text, '') AS truth
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (mp.generation_status->>'status') = 'completed'
      AND mp.created_at >= _since
      AND NOT c.is_test
  ),
  kin AS (
    SELECT unnest(ARRAY[
      'brother','sister','father','mother','husband','wife','son','daughter',
      'uncle','aunt','nephew','niece','cousin','twin'
    ]) AS term
  ),
  conflicts AS (
    SELECT ch.package_id, ch.conversation_id, ch.title, ch.is_paid,
           ch.created_at, k.term, ch.character_name
    FROM chars ch
    CROSS JOIN kin k
    WHERE ch.claims ~* ('\mmy (own )?' || k.term || '\M')
      AND ch.truth !~* ('\m' || k.term)
  )
  SELECT
    co.package_id,
    co.conversation_id,
    co.title,
    co.is_paid,
    co.created_at,
    co.term AS kin_term,
    array_agg(co.character_name ORDER BY co.character_name) AS claimants
  FROM conflicts co
  GROUP BY co.package_id, co.conversation_id, co.title, co.is_paid, co.created_at, co.term
  HAVING count(*) >= 2
  ORDER BY co.is_paid DESC, co.created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- 3c. Content-quality detectors (ADR-0042, migration 20260725)
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
    SELECT '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty)'::text AS rx
  ),
  hits AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           'character:' || mc.character_name AS source
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    CROSS JOIN marker m
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
      AND NOT c.is_test
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
    SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, 'package'::text AS source
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    CROSS JOIN marker m
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
      AND NOT c.is_test
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
           (regexp_match(mc.character_name, '([A-Za-z]+)[^A-Za-z]*$'))[1] AS surname,
           regexp_replace(coalesce(mp.evidence_cards #>> '{}',''), '#### SIGNIFICANCE[^#]*', '', 'g') AS player_evidence
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id AND mc.character_role = 'murderer'
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
      AND NOT c.is_test
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         character_name AS murderer, surname
  FROM murderer
  WHERE surname IS NOT NULL AND length(surname) >= 4
    AND player_evidence ~* ('\m' || surname || '\M')
  ORDER BY is_paid DESC, created_at DESC;
$fn$;

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
           (regexp_match(coalesce(mp.game_overview,''),
              'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1] AS overview_name
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status->>'status') = 'completed' AND mp.created_at >= _since
      AND NOT c.is_test
  ),
  named AS (
    SELECT *, (regexp_match(overview_name, '([A-Za-z]+)$'))[1] AS surname
    FROM ov WHERE overview_name IS NOT NULL
  )
  SELECT n.package_id, n.conversation_id, n.title, n.is_paid, n.created_at, n.overview_name AS overview_victim
  FROM named n
  WHERE length(n.surname) >= 4
    AND coalesce(n.master_context,'') !~* ('\m' || n.surname || '\M')
    AND NOT EXISTS (
      SELECT 1 FROM mystery_characters mc
      WHERE mc.package_id = n.package_id
        AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || n.surname || '\M')
    )
  ORDER BY n.is_paid DESC, n.created_at DESC;
$fn$;

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
      AND NOT c.is_test
      AND mp.mystery_style = 'character'
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
      AND NOT c.is_test
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS offenders
  FROM q
  WHERE questions ~* ('\*\*to ' || regexp_replace(character_name, '([\[\](){}.*+?^$\\|])', '\\\1', 'g') || '\M')
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$fn$;

-- ---------------------------------------------------------------------------
-- 3d/4. list_completed_but_empty_packages (ADR-0043) — is_test filter PLUS
-- the join-bug fix: c.has_complete_package is a conversation-level signal and
-- must only ever be compared against the LATEST package for that
-- conversation (the one it can legitimately describe), not every sibling row.
-- Before this fix, an earlier abandoned in_progress attempt for a
-- conversation whose later attempt succeeded was misreported as
-- "completed_but_no_characters".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_completed_but_empty_packages(
  _since timestamptz DEFAULT '2026-04-01'
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  status text,
  has_complete_package boolean,
  character_count bigint,
  reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  WITH latest_pkg AS (
    SELECT DISTINCT ON (mp.conversation_id) mp.id
    FROM mystery_packages mp
    ORDER BY mp.conversation_id, mp.created_at DESC
  )
  SELECT
    mp.id AS package_id,
    mp.conversation_id,
    c.title,
    c.is_paid,
    mp.created_at,
    (mp.generation_status->>'status') AS status,
    c.has_complete_package,
    (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) AS character_count,
    CASE
      WHEN (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) = 0
        THEN 'completed_but_no_characters'
      ELSE 'completed_but_no_overview'
    END AS reason
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE mp.created_at >= _since
    AND NOT c.is_test
    AND (
      (mp.generation_status->>'status') = 'completed'
      OR (c.has_complete_package = true AND mp.id IN (SELECT id FROM latest_pkg))
    )
    AND (
      (SELECT count(*) FROM mystery_characters mc WHERE mc.package_id = mp.id) = 0
      OR mp.game_overview IS NULL
      OR length(btrim(mp.game_overview)) = 0
    )
  ORDER BY mp.created_at DESC
$$;

COMMENT ON FUNCTION public.list_completed_but_empty_packages(timestamptz) IS
  'ADR-0043 detector: packages marked completed/has_complete_package but missing a real cast (0 mystery_characters rows) or an empty game_overview. The has_complete_package branch is scoped to each conversation''s LATEST package only (ADR-0072 fix — it previously cross-contaminated abandoned sibling rows). Read-only backstop for the completion invariant + concept-completeness entry gate. Wired into health-check.yml.';

-- ---------------------------------------------------------------------------
-- 3e. list_packages_with_structural_defects (ADR-0048)
-- ---------------------------------------------------------------------------
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
      AND NOT c.is_test
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
      AND character_name !~ '/'
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

-- ---------------------------------------------------------------------------
-- 3f. list_packages_with_unconfessed_culprit (ADR-0070)
-- ---------------------------------------------------------------------------
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
      AND NOT c.is_test
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
  )
  SELECT * FROM murderer_flags
  UNION ALL
  SELECT * FROM accomplice_flags
  ORDER BY is_paid DESC, created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- 3g. list_packages_with_final_statement_confession_leak (ADR-0067 follow-up)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_packages_with_final_statement_confession_leak(
  _since timestamp with time zone DEFAULT '2026-08-06 00:00:00+00'::timestamp with time zone
)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, characters text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH leaked AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at, mc.character_name
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review') AND mp.created_at >= _since
      AND NOT c.is_test
      AND mp.mystery_style = 'character'
      AND (
        (mc.reveal_confession_guilty IS NOT NULL AND mc.final_guilty ~* '\mI (did it|killed|poisoned|stabbed|shot|struck)\M')
        OR
        (mc.reveal_confession_accomplice IS NOT NULL AND mc.final_accomplice ~* '\mI (helped (him|her|them)|stood watch)\M')
      )
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS characters
  FROM leaked
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;

-- ---------------------------------------------------------------------------
-- 5. New: checks 2 & 3, promoted from raw REST filters in health-check.yml so
-- they can join conversations and exclude is_test. created_at floor on check
-- 2 preserved (orphaned pre-2025 rows from deleted conversations).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_stuck_in_progress_packages(
  _stuck_before timestamptz,
  _created_after timestamptz
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at, mp.updated_at
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (mp.generation_status->>'status') = 'in_progress'
    AND mp.updated_at < _stuck_before
    AND mp.created_at > _created_after
    AND NOT c.is_test
  ORDER BY mp.created_at DESC;
$$;

COMMENT ON FUNCTION public.list_stuck_in_progress_packages(timestamptz, timestamptz) IS
  'health-check.yml check 2. Packages stuck in_progress past _stuck_before, created after _created_after (excludes pre-2025 orphans from deleted conversations). Excludes is_test conversations. ADR-0072.';

CREATE OR REPLACE FUNCTION public.list_needs_review_packages(
  _held_before timestamptz,
  _since timestamptz
)
RETURNS TABLE (
  package_id uuid,
  conversation_id uuid,
  title text,
  is_paid boolean,
  needs_review_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.needs_review_at
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (mp.generation_status->>'status') = 'needs_review'
    AND mp.needs_review_at < _held_before
    AND mp.needs_review_at > _since
    AND NOT c.is_test
  ORDER BY mp.needs_review_at DESC;
$$;

COMMENT ON FUNCTION public.list_needs_review_packages(timestamptz, timestamptz) IS
  'health-check.yml check 3. Packages held in needs_review past _held_before (10-min grace period for the self-heal loop), within the _since window. Excludes is_test conversations. ADR-0072.';

GRANT EXECUTE ON FUNCTION public.list_stuck_in_progress_packages(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_needs_review_packages(timestamptz, timestamptz) TO service_role;
