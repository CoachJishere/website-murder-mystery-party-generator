-- ADR-0016 Addendum 1: give list_packages_missing_evidence_images() a grace
-- period so it stops alerting on packages the existing auto-remediation
-- cron hasn't had a chance to fix yet.
--
-- Found via the "Il Brindisi Di Troppo" sweep (2026-09-19): the health check
-- (GitHub Action, nominally every 6h at :17) alerted on a package whose
-- evidence_card_images was genuinely NULL at that moment -- a real instance
-- of the documented ADR-0016 failure (Imagen timeout aborts the batch save
-- while generation_status still reads 'completed'). But auto-remediate-
-- packages (pg_cron, every 30 min at :13/:43) already regenerates missing
-- images automatically -- confirmed in auto_remediation_log, this exact
-- package's images were fixed 17 minutes after the alerting run, cost
-- $0.12, outcome 'fixed'. By the time anyone reads the GitHub notification,
-- the gap is usually already closed.
--
-- The 4-minute offset between the two crons (health check nominally :17,
-- remediation at :13/:43) was designed so remediation always runs first
-- (ADR-0047) -- but GitHub Actions' scheduled-workflow queue is known to
-- drift by hours (this repo's own health-status commit history shows runs
-- landing anywhere from on-time to ~4.5h late), so that ordering isn't
-- reliable. Every OTHER time-windowed check in health-check.yml has a grace
-- period for exactly this reason (check 3's 10-minute needs_review hold,
-- checks 5-15's 30-day rolling windows) -- check 4 was the one check with
-- none.
--
-- Fix: exclude packages whose generation_completed_at is under 45 minutes
-- old (comfortably 2 remediation cycles) from the backlog. NULL
-- generation_completed_at (packages that completed before the 2026-09-08
-- stamping migration) is treated as "old enough" -- it can only be old
-- data, never a package mid-self-heal right now.
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
      AND (mp.generation_completed_at IS NULL
           OR mp.generation_completed_at < now() - interval '45 minutes')
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
  'Read-only backlog of paid+completed mystery_packages whose evidence_cards text contains round cards but whose evidence_card_images is NULL/partial, excluding packages completed under 45 minutes ago (grace period for the auto-remediate-packages cron to self-heal first). Decoupled from needs_review (no status mutation, no 24h window) so image-only gaps are discoverable on demand instead of by chance. Default _since = 2026-04-01 (evidence-image feature launch). See ADR-0016 + Addendum 1.';
