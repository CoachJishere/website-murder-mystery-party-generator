-- Durable detector for cross-character identity contamination in generated
-- packages: multiple characters claiming the same kinship to the victim.
--
-- WHY:
--   "Blood, Blackmail & Bollinger" (2026-07-02, 1-star guest feedback 2026-07-22):
--   the murderer's storyline ("I am Rex's brother", his embezzlement secret, his
--   alibi and guilty knowledge) bled into three other characters' round scripts
--   and final statements — four of ten characters claimed to be the victim's
--   brother. The package had generation_status=completed and every field
--   populated, so no existing check (NULL sweeps, needs_review, ADR-0016
--   detector) could see it. Only the customer did.
--
-- HEURISTIC:
--   A character's scripts (introduction, round2-4 scripts, final statement)
--   claim a kinship term ("my brother", "my own niece", ...) that the same
--   character's ground-truth fields (background, relationships, description)
--   never mention. One such claim is usually benign (a passing reference to
--   the character's own family); TWO OR MORE characters in the same package
--   claiming the SAME unestablished kin term is the contamination signature.
--   Validated 2026-07-22 against all packages since 2026-05-01: the >=2
--   threshold isolates exactly the contaminated package (3 false "brother"
--   claimants + a false "niece" claim) with zero false positives; per-character
--   singles were all benign self-references.
--
-- LIMITATION (documented, accepted): a single contaminated character (one
--   false claimant, term established only in the murderer's own background)
--   stays below the threshold. Lowering to >=1 flags benign own-family
--   references in most packages; not worth the alert fatigue. The Child v17
--   prompt-level CHARACTER IDENTITY rule is the prevention layer; this
--   detector is the >=2 backstop.
--
-- Read-only backlog, same pattern as list_packages_missing_evidence_images
-- (ADR-0016): no status mutation, no lookback window, callable on demand or
-- from the health-check workflow. See ADR-0041.

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

COMMENT ON FUNCTION public.list_packages_with_identity_conflicts(timestamptz) IS
  'Read-only backlog of completed packages where >=2 characters'' scripts claim the same kinship term ("my brother") that their own background/relationships never establish — the signature of the murderer''s storyline bleeding into other characters (Bollinger incident, 2026-07-02). No status mutation. Default _since = 2026-06-01. See ADR-0041.';
