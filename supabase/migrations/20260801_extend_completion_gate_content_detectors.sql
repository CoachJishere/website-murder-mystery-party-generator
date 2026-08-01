-- ADR-0051 layer 2 / ADR-0053: extend the pre-completion validation gate
-- (ADR-0049) to block on the RELIABLE content-quality detector classes
-- (ADR-0042, ADR-0041), not just the structural classes ADR-0049 shipped.
--
-- WHY: ADR-0049 proved the pattern (one shared function,
-- package_completion_blocking_defects(), enforced by validate_package_characters()
-- AND the two recovery paths heal_completed_packages()/promote_complete_packages()
-- so no path can silently resurrect a blocked package) but scoped itself
-- deliberately to structural, zero-judgment invariants (invalid_role,
-- error_body). ADR-0051 names the content-quality classes (meta-text leak,
-- self-directed questions, victim mismatch, slip-culprit leak, identity
-- contamination) as the next layer: they are ALSO mechanically detectable
-- (ADR-0042/0041 already validated each against full history with zero or
-- near-zero false positives), so the same "detect == gate" reuse applies.
--
-- THIS MIGRATION touches exactly one function:
-- public.package_completion_blocking_defects(_pkg mystery_packages). Because
-- every one of the three enforcement paths (the pre-completion trigger, and
-- the two recovery crons) already calls this single shared function and only
-- branches on "IS NULL / IS NOT NULL", extending its body is sufficient --
-- no trigger or cron function needs to change. This is the same
-- chokepoint-reuse property ADR-0049 established.
--
-- WHAT'S ADDED (ported from the read-only list_packages_with_* detectors as
-- PER-PACKAGE predicates -- WHERE package_id = the row being checked -- so a
-- per-row completion trigger never pays for a full-history scan):
--   * meta_text_leak        (20260725_detect_content_quality_issues.sql #1)
--   * self_directed_question(20260725_detect_content_quality_issues.sql #5)
--   * victim_mismatch       (20260725_detect_content_quality_issues.sql #3)
--   * slip_culprit_leak     (20260725_detect_content_quality_issues.sql #4)
--   * identity_conflict     (20260722_detect_character_identity_conflicts.sql)
-- Regex markers, thresholds, and heuristics are ported VERBATIM from the
-- validated detectors -- only the query shape changes (single-package
-- predicate instead of a `generation_status = 'completed' AND created_at >=
-- _since` history scan, since _pkg is already the specific row being
-- completed).
--
-- DELIBERATELY EXCLUDED (see ADR-0053 Decision + Discussion for the full
-- reasoning):
--   * evidence_culprit_spoiler -- advisory only. ADR-0042 validation found a
--     high false-positive rate (murderer surname legitimately appearing as a
--     location/family/common word). Gating on it would false-block real,
--     paying customers' legitimate packages. Excluded from the gate exactly
--     as it is excluded from health-check alerting.
--   * missing_evidence_images -- images are generated asynchronously and
--     later than text content (a separate Make/Replicate step), so gating
--     completion on their presence risks a race against normal, successful
--     generation. The ADR-0047 auto-remediation worker already recalls
--     generate-evidence-images for missing rounds post-completion. Blocking
--     completion here would convert a self-healing async gap into a
--     needs_review package for every normal package whose images simply
--     haven't landed yet. Left to the worker, as today.
--
-- INTERIM BEHAVIOUR (until ADR-0051 layer 3, the child-content regenerator,
-- exists): a package blocked on one of these NEW content-defect classes
-- becomes needs_review and HOLDS -- it does not self-heal, because no
-- automated repair exists yet for these classes at the point they'd be
-- caught here. Two of the five ported classes are the exception: the live
-- ADR-0047 auto-remediate-packages worker already auto-fixes
-- self-directed/victim-directed questions (deterministic retarget) and
-- missing evidence images are excluded from the gate entirely per above --
-- so in practice only meta_text_leak, victim_mismatch, slip_culprit_leak, and
-- identity_conflict packages sit in needs_review until layer 3 ships. This is
-- the intended interim trade-off: hold rather than ship a detectable defect.
--
-- NOTE ON LIVE HISTORY: applied to the DB as TWO migration versions
-- (20260801140706_extend_completion_gate_content_detectors, then
-- fix_extend_completion_gate_array_concat_bug -- a same-session hotfix for a
-- text[]-append type-resolution bug caught by this migration's own
-- disposable-row verification before any real package hit it; see ADR-0053
-- Verification #2/#6). This single repo file folds both together (the
-- corrected version throughout), so a fresh apply is correct in one step --
-- same pattern already established in ADR-0047's Key Files note on
-- 20260729082237/20260729082931.

CREATE OR REPLACE FUNCTION public.package_completion_blocking_defects(_pkg mystery_packages)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  _defects text[] := ARRAY[]::text[];
  -- Deliberately narrow: two-word HTTP-error phrases, a status code paired
  -- with its reason phrase, or literal markup markers. Never a bare word like
  -- "gateway" that could appear in legitimate mystery-party prose.
  _pattern text := '<html[\s>]|<!doctype\s+html|bad gateway|gateway[\s-]*time[\s-]*out|50[234]\s+(bad gateway|service unavailable|gateway[\s-]*time[\s-]*out)';
  -- ADR-0053: content-quality marker, ported verbatim from
  -- list_packages_with_meta_text_leak (20260725_detect_content_quality_issues.sql).
  -- Tightened set validated 2026-07-25: 10 historical true positives, zero
  -- false positives.
  _meta_pattern text := '(let me reconsider|let me reread|let me recalculate|let me look at this more carefully|i need to correct this|on second thought|master_context|as an ai language model|wait, i need to|\[closing paragraph|\[insert |\[choose |\[if guilty)';
  _hit record;
  _overview_name text;
  _overview_surname text;
BEGIN
  IF _pkg.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Package-level delivered content holding a raw upstream error/HTML body.
  FOR _hit IN
    SELECT kv.key
    FROM jsonb_each_text(to_jsonb(_pkg)) AS kv(key, value)
    WHERE kv.key IN (
      'title', 'game_overview', 'host_guide', 'materials', 'preparation_instructions',
      'timeline', 'hosting_tips', 'evidence_cards', 'relationship_matrix', 'detective_script'
    )
    AND kv.value ~* _pattern
  LOOP
    _defects := _defects || ('error_body_in_package.' || _hit.key);
  END LOOP;

  -- character_role outside the known vocabulary. NULL is legitimate
  -- (character-style/random-slip games leave it unset) -- only flag a non-NULL
  -- value that isn't one of the four known roles. Mirrors ADR-0048's
  -- invalid_role sub-check, but as a BLOCKING prevention check rather than a
  -- read-only detector.
  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND mc.character_role IS NOT NULL
      AND mc.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
  LOOP
    _defects := _defects || ('invalid_role.' || _hit.key);
  END LOOP;

  -- ANY character column (round scripts, background, secret, pointform
  -- variants, etc.) holding a raw upstream error/HTML body. Dynamic scan via
  -- to_jsonb so a newly added column is covered automatically, without a
  -- follow-up migration to this allowlist.
  FOR _hit IN
    SELECT mc.character_name || '.' || kv.key AS key
    FROM mystery_characters mc,
         jsonb_each_text(to_jsonb(mc)) AS kv(key, value)
    WHERE mc.package_id = _pkg.id
      AND kv.key NOT IN ('id', 'package_id', 'created_at', 'updated_at')
      AND kv.value ~* _pattern
  LOOP
    _defects := _defects || ('error_body_in_character.' || _hit.key);
  END LOOP;

  -- ===========================================================================
  -- ADR-0051 layer 2 / ADR-0053: reliable content-quality detector classes,
  -- ported per-package from the ADR-0042/0041 read-only detectors. See the
  -- migration header for what's included and what's deliberately excluded
  -- (evidence_culprit_spoiler, missing_evidence_images).
  -- ===========================================================================

  -- meta_text_leak (ADR-0042 #1) -- package-level fields.
  IF (
    coalesce(_pkg.game_overview,'') || ' ' || coalesce(_pkg.detective_script,'') || ' ' ||
    coalesce(_pkg.host_guide,'') || ' ' || coalesce(_pkg.timeline,'') || ' ' ||
    coalesce(_pkg.hosting_tips,'') || ' ' || coalesce(_pkg.preparation_instructions,'') || ' ' ||
    coalesce(_pkg.evidence_cards #>> '{}','')
  ) ~* _meta_pattern THEN
    _defects := _defects || 'meta_text_leak.package'::text;
  END IF;

  -- meta_text_leak -- character-level fields (narrative + host/player fields).
  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
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
      ) ~* _meta_pattern
  LOOP
    _defects := _defects || ('meta_text_leak.character.' || _hit.key);
  END LOOP;

  -- self_directed_question (ADR-0042 #5) -- a "**To <own name>:**" question
  -- directed at the asking character. Already auto-fixed post-completion by
  -- the ADR-0047 worker (deterministic retarget) when it slips past this gate
  -- via the recovery paths' pre-existing state, but blocking it here too
  -- keeps first-completion honest.
  FOR _hit IN
    SELECT mc.character_name AS key
    FROM mystery_characters mc
    WHERE mc.package_id = _pkg.id
      AND (coalesce(mc.round2_questions,'') || ' ' || coalesce(mc.round3_questions,'') || ' ' || coalesce(mc.round4_questions,''))
          ~* ('\*\*to ' || regexp_replace(mc.character_name, '([\[\](){}.*+?^$\\|])', '\\\1', 'g') || '\M')
  LOOP
    _defects := _defects || ('self_directed_question.' || _hit.key);
  END LOOP;

  -- victim_mismatch (ADR-0042 #3) -- the victim named at the top of
  -- game_overview must also appear in master_context or a character
  -- background; otherwise the overview bled a foreign victim.
  _overview_name := (regexp_match(coalesce(_pkg.game_overview,''), 'Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1];
  IF _overview_name IS NOT NULL THEN
    _overview_surname := (regexp_match(_overview_name, '([A-Za-z]+)$'))[1];
    IF _overview_surname IS NOT NULL AND length(_overview_surname) >= 4
       AND coalesce(_pkg.master_context,'') !~* ('\m' || _overview_surname || '\M')
       AND NOT EXISTS (
         SELECT 1 FROM mystery_characters mc
         WHERE mc.package_id = _pkg.id
           AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || _overview_surname || '\M')
       )
    THEN
      _defects := _defects || ('victim_mismatch.' || _overview_name);
    END IF;
  END IF;

  -- slip_culprit_leak (ADR-0042 #4) -- random-slip ("character" style) games
  -- only, where the culprit is drawn at the table: a character's STATIC
  -- secret must never be a fixed murder confession.
  IF _pkg.mystery_style = 'character'
     AND NOT EXISTS (SELECT 1 FROM mystery_characters m2 WHERE m2.package_id = _pkg.id AND m2.character_role = 'murderer')
  THEN
    FOR _hit IN
      SELECT mc.character_name AS key
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'')) ~* '\myou (poisoned|killed|murdered|stabbed|strangled|shot|smothered)\M'
        AND (coalesce(mc.secret,'') || ' ' || coalesce(mc.secrets::text,'')) ~* '(hide|hiding|conceal|cover up).{0,60}(guilt|your crime|your own crime|what you did)'
    LOOP
      _defects := _defects || ('slip_culprit_leak.' || _hit.key);
    END LOOP;
  END IF;

  -- identity_conflict (ADR-0041) -- >=2 characters' scripts claim the same
  -- kinship term ("my brother") that their own background/relationships never
  -- establish -- the signature of the murderer's storyline bleeding into
  -- other characters. Single unestablished claims are benign self-reference
  -- and are NOT flagged (validated threshold, ADR-0041).
  FOR _hit IN
    WITH kin AS (
      SELECT unnest(ARRAY[
        'brother','sister','father','mother','husband','wife','son','daughter',
        'uncle','aunt','nephew','niece','cousin','twin'
      ]) AS term
    ),
    chars AS (
      SELECT mc.character_name,
        coalesce(mc.introduction,'') || ' ' || coalesce(mc.round2_script,'') || ' ' ||
        coalesce(mc.round3_script,'') || ' ' || coalesce(mc.round4_script,'') || ' ' ||
        coalesce(mc.final_statement,'') AS claims,
        coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'') || ' ' ||
        coalesce(mc.description::text,'') AS truth
      FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
    ),
    conflicts AS (
      SELECT k.term, ch.character_name
      FROM chars ch CROSS JOIN kin k
      WHERE ch.claims ~* ('\mmy (own )?' || k.term || '\M')
        AND ch.truth !~* ('\m' || k.term)
    )
    SELECT term, array_to_string(array_agg(character_name ORDER BY character_name), ',') AS claimants
    FROM conflicts
    GROUP BY term
    HAVING count(*) >= 2
  LOOP
    _defects := _defects || ('identity_conflict.' || _hit.term || ':' || _hit.claimants);
  END LOOP;

  IF array_length(_defects, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _defects;
END;
$fn$;

COMMENT ON FUNCTION public.package_completion_blocking_defects(mystery_packages) IS
  'Prevention-layer check (ADR-0049 structural + ADR-0051/ADR-0053 content). Returns NULL if clean, or a text[] of defects. Structural (ADR-0049): invalid character_role, or a raw upstream error/HTML body in any delivered field. Content (ADR-0053, ported per-package from the ADR-0042/0041 read-only detectors): meta-text/chain-of-thought leak, self-directed questions, victim mismatch, slip-culprit leak, cross-character identity contamination (>=2 claimants). Deliberately EXCLUDES evidence_culprit_spoiler (ADR-0042: high false-positive rate, advisory only) and missing_evidence_images (async/late-generated; ADR-0047 worker auto-heals post-completion instead). Called from validate_package_characters() (the pre-completion trigger) and from heal_completed_packages()/promote_complete_packages() (the recovery paths) so no path can ever mark a defective package completed. Does not attempt multiple_murderers, name_background_mismatch, or duplicated_cast (ADR-0048), which require human judgment.';

-- No changes needed to validate_package_characters(), heal_completed_packages(),
-- or promote_complete_packages(): all three already call
-- package_completion_blocking_defects(...) IS NULL / IS NOT NULL and only
-- branch on nullness, never inspect individual defect strings. Extending the
-- shared function's body is sufficient -- the same chokepoint-reuse property
-- ADR-0049 established. (Comments inside those three functions still say
-- "ADR-0049: structural-integrity gate" / "ADR-0049: structural-defect
-- guard" -- left as-is since the code path description is still accurate;
-- this migration's header and the new function comment above are the record
-- of the ADR-0053 extension.)
