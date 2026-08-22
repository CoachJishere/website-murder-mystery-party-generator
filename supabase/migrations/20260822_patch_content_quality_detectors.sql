-- Patches to the two ADR-0042 content-quality detectors, based on a hands-on
-- audit of Lyn DiFranco's package (a0a985a9-2d2d-4176-a825-82ee6b2990be,
-- ADR-0098 Addendum 4, 2026-08-21/22) and a follow-up sweep of every paid
-- package back to 2026-04-01. Both existing functions returned zero hits
-- across the whole window even though the audit found real, confirmed leaks
-- in 8 packages (all created 2026-07-20 through 2026-08-04, all pre-dating
-- the 2026-08-11 blanket Sonnet 5 upgrade, ADR-0074) — the detectors weren't
-- silent because nothing was wrong, they were silent because of two coverage
-- gaps in what they look for.
--
-- ---------------------------------------------------------------------------
-- Patch 1: meta_text_leak's marker list didn't include the leak pattern that
-- turned out to be the most common one today — a "per the rules" / "per
-- content rules" authoring note explaining why the victim is excluded from a
-- character's relationships list, leaking as literal text instead of being
-- silently followed. Validated against every completed package back to
-- 2026-04-01 (see ADR-0098 Addendum 4 for the query): "not included in" and
-- "per (the/content) rules" have zero legitimate hits anywhere in history —
-- every occurrence found was this exact leak. An earlier version of this
-- patch also added "[VICTIM" on the theory that a victim's identity is
-- always fixed at generation time so there's no legitimate fill-in-the-blank
-- use — that theory was wrong: "[victim's name]" is a real template token in
-- the round2/3/4_innocent/guilty/accomplice branching fields, not covered by
-- this validation pass. Found and reverted same day (Addendum 6) — every
-- real "[VICTIM...]" leak is independently caught by the two markers above,
-- so "[victim" added false-positive risk for zero unique coverage.
--
-- Deliberately NOT added: "[murderer", "[suspect", "[accomplice name" —
-- these looked like the same leak family at first, but Death At Hollowcrest
-- Manor and Blood At Dead Man's Canyon both use "[MURDERER NAME]" as an
-- intentional host-fill-in-the-blank convention in slip-style ("character")
-- games, where the culprit is drawn at the table and the script genuinely
-- cannot know the name in advance. Flagging those patterns would false-
-- positive on legitimate scripts. This is a real design ambiguity, not
-- resolved here — see the ADR for the open question of whether that
-- convention should stay a bracket placeholder or become a host-guide note.
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
    -- Extended 2026-08-22 (ADR-0098 Addendum 4): added the victim-exclusion
    -- authoring-note leak family ("per the rules" / "per content rules" /
    -- "not included in") and "[VICTIM". Validated zero false positives
    -- against every completed package back to 2026-04-01. See header above
    -- for why "[murderer"/"[suspect"/"[accomplice" were deliberately excluded.
    -- "accomplice beat\M" requires a word boundary after "beat" — without it,
    -- "your accomplice Beatrix" (a real character name) false-matched on
    -- "accomplice Beat", caught live during validation (Camp Nightfall:
    -- Murder At Pinewood Lodge). Same bare-substring hazard already known
    -- from ADR-0098's "Cross"/"across" bug — word-boundary every new marker.
    -- Fixed same day (ADR-0098 Addendum 6), applied live rather than via a
    -- new migration file at the time — reconciled here so this file matches
    -- what's actually deployed. Two bugs: (1) "\b" in PostgreSQL's regex
    -- flavor (ARE) means a literal BACKSPACE character, not a word boundary —
    -- "\M" is correct — so the "per rules" marker never matched anything in
    -- production. (2) "\[victim" false-matched the legitimate "[victim's
    -- name]" template token used in the round2/3/4_innocent/guilty/
    -- accomplice branching fields (not covered by the original validation
    -- pass). Every real "[VICTIM...]" leak found is independently caught by
    -- "per rules"/"not included in" in the same bracket, so "\[victim" added
    -- false-positive risk with zero unique detection value — removed.
    SELECT '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty|per (the |content )?rules\M|not included in|accomplice beat\M)'::text AS rx
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
  'Completed packages whose delivered text contains model chain-of-thought or template artifacts (e.g. "the matrix shows", "[CLOSING PARAGRAPH ...]", "let me reconsider", "per the rules"). Crimson Tide incident 2026-07-25; extended 2026-08-22 after Lyn DiFranco audit (ADR-0098 Addendum 4); \b-vs-\M regex fix and "[victim" false-positive removed same day (Addendum 6). Read-only.';

-- ---------------------------------------------------------------------------
-- Patch 2: victim_mismatch's extraction regex required the victim's name to
-- be the literal first "First Last" proper-noun pair immediately after the
-- "Game Overview" heading. Every overview that opens with a narrative
-- sentence before naming the victim (the common case — "On the morning of
-- October 14th, Dr. Morgan Cho, a prominent...") was invisible to the
-- detector: it extracted no name at all, so the row never entered the check.
-- Live-tested against every completed package back to 2026-07-20: the
-- original pattern extracted a name for ~11% of packages; adding the two
-- fallbacks below raised that materially without any change to the actual
-- comparison logic.
--
-- KNOWN REMAINING LIMITATION, not fixed here: this function's core check
-- (surname absent from master_context AND every character background) only
-- catches a *foreign* victim bleed — a name that belongs to no one in the
-- package at all (the original Adelaide/Sophie incident). It does NOT catch
-- Lyn's actual failure mode: game_overview and detective_script agreeing on
-- a victim surname that legitimately belongs to a different, LIVING
-- character in the same package (master_context contains the full original
-- character roster, so the wrong surname is never "absent" from it). Closing
-- that gap needs a different check — something like comparing the surname
-- against a majority-vote of what characters' own "RIVALS & ENEMIES" sections
-- name as their antagonist — deliberately not built today; flagged here as a
-- design question for whoever picks this up next, per the ADR discussion of
-- whether it's worth the added complexity given the defect looks isolated to
-- the pre-2026-08-11 (Haiku) generation era.
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
           -- Extended 2026-08-22: original pattern first, then two fallbacks
           -- for the common "narrative sentence before the name" phrasing.
           coalesce(
             (regexp_match(coalesce(mp.game_overview,''),
                'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1],
             (regexp_match(coalesce(mp.game_overview,''),
                'Dr\.\s+([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)'))[1],
             (regexp_match(coalesce(mp.game_overview,''),
                '([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)\s+(?:was\s+found|had\s+been|is\s+dead|was\s+killed|was\s+murdered|was\s+poisoned)'))[1]
           ) AS overview_name
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
  'Completed packages whose game_overview names a victim (surname) that appears nowhere in master_context or any character background — a foreign-victim bleed. Adelaide Crane / "Sophie Duplock" incident, audit 2026-07-25; extraction broadened 2026-08-22 (ADR-0098 Addendum 4) — still does NOT catch a same-package victim/suspect identity swap (see comment above). Read-only.';
