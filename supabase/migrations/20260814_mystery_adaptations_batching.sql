-- ADR-0088: multi-character batching + murderer/accomplice reassignment for the
-- guest-dropout adaptation feature (ADR-0036/0082).
--
-- Two pieces:
--   1. batch_id/batch_sequence on mystery_adaptations -- a single purchase can now
--      cover N character removals. adapt-mystery-apply processes a batch strictly
--      sequentially (chain-dispatch: each invocation, on completion, dispatches the
--      next batch_sequence itself) so two removals in the same batch never run
--      concurrently against the same package -- see the ADR for the lost-update race
--      this prevents (conversations.player_count blind read-modify-write; two removed
--      characters both mentioned in a third character's rumors field silently
--      clobbering each other's edit while both legitimately report 'verified').
--   2. A package-scoped concurrency claim, mirroring claim_package_for_remediation /
--      release_package_remediation_claim (20260802_wire_child_content_regenerator.sql)
--      exactly -- same reasoning applies: this is called over PostgREST/RPC, one call
--      per statement, no persistent session to hold a session-scoped advisory lock
--      across the several calls one adaptation invocation makes. This is the second
--      line of defense chain-dispatch alone can't provide: it only serializes *within*
--      one batch_id, not across two different batches racing the same package_id.
--      Kept as its own column (adaptation_claimed_at), separate from
--      remediation_claimed_at -- coordinating adaptations with auto-remediation on the
--      same package is a real, separate, pre-existing gap, not addressed here.

-- ---------------------------------------------------------------------------
-- 1. Batching columns on mystery_adaptations
-- ---------------------------------------------------------------------------

ALTER TABLE public.mystery_adaptations
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS batch_sequence int,
  ADD COLUMN IF NOT EXISTS requested_replacement_character_id uuid;

COMMENT ON COLUMN public.mystery_adaptations.batch_id IS
  'ADR-0088: groups every row created from one purchase, even a batch of 1 (no special-cased solo path). One Stripe Checkout Session covers every row sharing a batch_id.';

COMMENT ON COLUMN public.mystery_adaptations.batch_sequence IS
  'ADR-0088: 0-indexed position within batch_id. adapt-mystery-apply chain-dispatches strictly in this order -- never processes two rows of the same batch concurrently.';

COMMENT ON COLUMN public.mystery_adaptations.requested_replacement_character_id IS
  'ADR-0088: only meaningful when character_role is murderer/accomplice in a detective-style package. The host''s chosen replacement, captured at create-time so adapt-mystery-apply (invoked later, only ever given an adaptation_id) knows who to promote. NULL means "let the system choose" -- resolved inside the rewrite call itself. Not FK''d, same reasoning as character_id: this is an input/audit field, not a referential-integrity-bearing relationship the DB needs to enforce.';

CREATE INDEX IF NOT EXISTS idx_mystery_adaptations_batch
  ON public.mystery_adaptations(batch_id, batch_sequence);

-- Backfill: any pre-existing rows (none expected -- this table shipped 2026-08-13,
-- staging-only, feature-flagged off, never live-tested against real Stripe) each become
-- their own batch of 1 so the columns can be made NOT NULL.
UPDATE public.mystery_adaptations
SET batch_id = gen_random_uuid(), batch_sequence = 0
WHERE batch_id IS NULL;

ALTER TABLE public.mystery_adaptations
  ALTER COLUMN batch_id SET NOT NULL,
  ALTER COLUMN batch_sequence SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Package-scoped adaptation claim (mirrors claim_package_for_remediation /
--    release_package_remediation_claim, 20260802_wire_child_content_regenerator.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE public.mystery_packages
  ADD COLUMN IF NOT EXISTS adaptation_claimed_at timestamptz;

COMMENT ON COLUMN public.mystery_packages.adaptation_claimed_at IS
  'ADR-0088: set by claim_package_for_adaptation() while an adapt-mystery-apply '
  'invocation is in flight against this package, so two different batches (or, before '
  'chain-dispatch resolves it, two rows of the same batch) can never both mutate this '
  'package at once. Self-releasing: a claim older than its TTL is treated as expired '
  '(crash backstop), and the claimant releases it explicitly in a finally block '
  'regardless of outcome.';

CREATE OR REPLACE FUNCTION public.claim_package_for_adaptation(
  _pkg_id uuid,
  _ttl_minutes int DEFAULT 10
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _rows int;
BEGIN
  UPDATE public.mystery_packages
  SET adaptation_claimed_at = now()
  WHERE id = _pkg_id
    AND (
      adaptation_claimed_at IS NULL
      OR adaptation_claimed_at < now() - make_interval(mins => _ttl_minutes)
    );
  GET DIAGNOSTICS _rows = ROW_COUNT;
  -- Atomic by construction, same reasoning as claim_package_for_remediation: two
  -- concurrent callers racing this statement serialize on the row under normal MVCC
  -- row-level locking, and the second one (re-evaluating WHERE against the
  -- now-claimed row) affects zero rows and returns false.
  RETURN _rows > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_package_adaptation_claim(
  _pkg_id uuid
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  UPDATE public.mystery_packages
  SET adaptation_claimed_at = NULL
  WHERE id = _pkg_id;
$function$;

-- Same lock-down as claim_package_for_remediation/release_package_remediation_claim:
-- REVOKE ALL FROM PUBLIC alone is not sufficient -- Supabase grants EXECUTE on
-- public-schema functions to anon/authenticated by default, which must be explicitly
-- revoked too.
REVOKE ALL ON FUNCTION public.claim_package_for_adaptation(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_package_adaptation_claim(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_package_for_adaptation(uuid, int) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_package_adaptation_claim(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_package_for_adaptation(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_package_adaptation_claim(uuid) TO service_role;
