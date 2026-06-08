-- Durable detector for paid+completed packages that are missing their evidence-card
-- images, decoupled from the customer-facing needs_review flag.
--
-- WHY:
--   The Make Imagen flow saves evidence images in a single batch *after* all image
--   generations finish, so one Imagen 40s timeout aborts the route before anything
--   saves -> evidence_card_images = NULL while generation_status stays 'completed'.
--   (See CHANGELOG 2026-06-04 "Bigby Wolf" + 2026-06-08 entries.)
--
--   sweep_incomplete_packages() already flags evidence_card_images IS NULL, BUT:
--     1. heal_completed_packages() resets needs_review -> completed based only on
--        character description + character_role, ignoring evidence_card_images, so
--        an image-only gap is healed away within one 2-min cycle.
--     2. The sweep only looks back 24h, so anything missed is never re-flagged.
--   Net effect: an image-only failure surfaces as a single, easy-to-miss support
--   email and then looks 'completed' forever -- found only by chance.
--
--   We deliberately do NOT make heal_completed_packages keep these in needs_review:
--   nothing auto-regenerates images (only characters self-heal), so that would pin
--   the "We're Finalizing Your Mystery" warning forever on an otherwise-complete,
--   fully-usable mystery. Blocking the whole product over a missing illustration is
--   the wrong UX. Instead we expose a read-only backlog that can be queried on
--   demand (or by a GitHub Action writing to a tracked file) and later drive an
--   automatic image re-trigger once image generation is its own Make scenario.
--
-- _since defaults to 2026-04-01 because evidence-image generation effectively went
-- live that month; packages before it legitimately have no images (the feature did
-- not exist) and are not failures. Pass an earlier timestamp to include them.

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

COMMENT ON FUNCTION public.list_packages_missing_evidence_images(timestamptz) IS
  'Read-only backlog of paid+completed mystery_packages whose evidence_cards text contains round cards but whose evidence_card_images is NULL/partial. Decoupled from needs_review (no status mutation, no 24h window) so image-only gaps are discoverable on demand instead of by chance. Default _since = 2026-04-01 (evidence-image feature launch). See ADR-0016.';
