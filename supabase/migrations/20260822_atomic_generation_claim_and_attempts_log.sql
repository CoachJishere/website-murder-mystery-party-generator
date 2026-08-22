-- ADR-0104: close the post-purchase free-regeneration hole.
--
-- mystery-webhook-trigger's ONLY guard against re-running a completed/
-- in-progress generation was the CLIENT-SIDE check in generateCompletePackage()
-- (src/services/mysteryPackageService.ts) -- a plain read-then-branch, not
-- atomic, and irrelevant to anyone who calls the edge function directly
-- (verify_jwt is disabled on it; only is_paid is checked server-side). A
-- customer holding their conversationId could re-trigger the full paid
-- Make.com + Claude pipeline indefinitely, for free, forever.
--
-- Two pieces, mirroring patterns already established elsewhere in this
-- codebase rather than inventing new ones:
--   1. claim_package_for_generation() -- an atomic conditional-UPDATE claim,
--      same shape as claim_package_for_remediation() (20260802) and the
--      lost-ack-hardened claim in adapt-mystery-apply (ADR-0098). Locks the
--      target row with SELECT ... FOR UPDATE so two concurrent callers
--      (two tabs, a double-click, or a direct API call racing the UI)
--      serialize instead of both passing a read-then-branch check.
--   2. generation_attempts -- a parent-level audit trail. Today there is
--      NO log of calls to mystery-webhook-trigger at all (only
--      child_generation_attempts, which is per-character and only reflects
--      calls that got far enough to reach Make.com's child scenario). This
--      gives visibility into rejected/claimed calls and backs a simple
--      rolling rate limit, independent of the status guard, as defense in
--      depth in case the guard itself ever has a bug.

-- ---------------------------------------------------------------------------
-- 1. Atomic claim
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_package_for_generation(
  _conversation_id uuid,
  _ttl_minutes int DEFAULT 20
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _pkg_id uuid;
  _rows int;
BEGIN
  -- Lock the most recent package row for this conversation (mirrors the
  -- "order by updated_at desc limit 1" convention mystery-webhook-trigger and
  -- mysteryPackageService.ts already use elsewhere to pick a row when more
  -- than one exists for a conversation_id -- there is no unique constraint on
  -- that column). FOR UPDATE makes a concurrent second caller block here
  -- until this transaction commits, rather than racing the UPDATE below.
  SELECT id INTO _pkg_id
  FROM public.mystery_packages
  WHERE conversation_id = _conversation_id
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF _pkg_id IS NULL THEN
    -- First-ever generation for this conversation: nothing existing to race
    -- against. No worse than the client-side check-then-insert this replaces.
    INSERT INTO public.mystery_packages (
      conversation_id, generation_status, generation_started_at, created_at, updated_at
    ) VALUES (
      _conversation_id,
      jsonb_build_object('status', 'in_progress', 'progress', 10, 'currentStep', 'Sending to external generation service...'),
      now(), now(), now()
    );
    RETURN true;
  END IF;

  UPDATE public.mystery_packages
  SET generation_status = jsonb_build_object('status', 'in_progress', 'progress', 10, 'currentStep', 'Sending to external generation service...'),
      generation_started_at = now(),
      updated_at = now()
  WHERE id = _pkg_id
    -- Claimable when: not already completed, AND (not currently in_progress,
    -- OR it's been in_progress past the TTL -- a prior invocation died
    -- mid-generation, same dead-invocation shape ADR-0098 found and handled
    -- in adapt-mystery-apply). IS DISTINCT FROM treats a NULL/missing status
    -- (a package row with no generation_status ever written) as claimable.
    AND (generation_status->>'status') IS DISTINCT FROM 'completed'
    AND (
      (generation_status->>'status') IS DISTINCT FROM 'in_progress'
      OR updated_at < now() - make_interval(mins => _ttl_minutes)
    );
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$function$;

-- Same lock-down as claim_package_for_remediation (20260802) and
-- remediation_read_field/remediation_write_field (20260729): REVOKE ALL FROM
-- PUBLIC alone is not sufficient -- Supabase grants EXECUTE on public-schema
-- functions to anon/authenticated by default, which must be explicitly
-- revoked too. Only mystery-webhook-trigger's service-role client may call this.
REVOKE ALL ON FUNCTION public.claim_package_for_generation(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_package_for_generation(uuid, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_package_for_generation(uuid, int) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Parent-level attempts log + rate-limit backing table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.generation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  package_id uuid,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  is_service_call boolean NOT NULL DEFAULT false,
  outcome text NOT NULL, -- 'claimed' | 'rejected_payment' | 'rejected_status' | 'rejected_rate_limit'
  generation_status_at_attempt text
);

COMMENT ON TABLE public.generation_attempts IS
  'ADR-0104: one row per call to mystery-webhook-trigger, service-role calls '
  'included. Parent-level audit trail (child_generation_attempts is per-'
  'character and only reflects calls that reached Make.com''s child scenario) '
  'and backs a simple rolling rate limit on the trigger endpoint, independent '
  'of claim_package_for_generation() -- defense in depth in case the claim '
  'itself has a bug.';

CREATE INDEX IF NOT EXISTS idx_generation_attempts_conversation_recent
  ON public.generation_attempts (conversation_id, attempted_at DESC);

ALTER TABLE public.generation_attempts ENABLE ROW LEVEL SECURITY;
-- No policies -- service role bypasses RLS entirely (same posture as
-- auto_remediation_log and child_generation_attempts); nothing else should
-- ever read or write this table.
