-- ADR-0036 Phase B: "A guest can't make it" paid surgical character removal.
-- One row per removal request, tracking pending -> paid -> processing ->
-- verified/failed/rolled_back. The row IS the job's audit trail (no separate
-- log table, unlike auto_remediation_log which logs many attempts across many
-- packages) and holds a full pre-edit snapshot so a failed verify can revert
-- every touched field plus re-insert the deleted character/assignment rows.
--
-- character_id is intentionally NOT a cascading FK: the whole point of the job
-- is to delete that row, and the audit record must survive it. character_name/
-- character_role are captured as a snapshot at request time instead.
--
-- STAGING-ONLY as of this migration (2026-08-13): the feature is gated off in
-- production by VITE_ENABLE_GUEST_DROPOUT_ADAPTATION (frontend) and
-- ENABLE_GUEST_DROPOUT_ADAPTATION (edge functions), both unset in prod. See
-- docs/adr/0082-guest-dropout-phase-b-implementation.md.
CREATE TABLE IF NOT EXISTS public.mystery_adaptations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id             uuid NOT NULL REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  conversation_id        uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  character_id           uuid NOT NULL,
  character_name         text NOT NULL,
  character_role         text,
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid', 'processing', 'verified', 'failed', 'rolled_back')),
  requested_by_email     text,
  stripe_session_id      text,
  stripe_client_reference_id text,
  amount_usd             numeric(10,2) NOT NULL DEFAULT 5.00,
  snapshot               jsonb,
  transform_result       jsonb,
  verify_result          jsonb,
  error_message          text,
  created_at             timestamp with time zone NOT NULL DEFAULT now(),
  paid_at                timestamp with time zone,
  processing_started_at  timestamp with time zone,
  completed_at           timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_mystery_adaptations_package_id ON public.mystery_adaptations(package_id);
CREATE INDEX IF NOT EXISTS idx_mystery_adaptations_status ON public.mystery_adaptations(status);

COMMENT ON TABLE public.mystery_adaptations IS
  'ADR-0036 Phase B: one row per guest-dropout removal request (pending -> paid -> processing -> verified/failed/rolled_back). snapshot holds pre-edit values for rollback; this table is itself the per-job audit trail.';

ALTER TABLE public.mystery_adaptations ENABLE ROW LEVEL SECURITY;
-- Writes are service-role only (same posture as acknowledged_health_alerts /
-- auto_remediation_log) -- create/apply only ever happen through the
-- adapt-mystery-create / adapt-mystery-apply edge functions. The one
-- exception is a narrow SELECT policy so the frontend's success/polling page
-- can read an adaptation's own status directly, scoped to the owning
-- conversation's user_id (same ownership pattern + auth.uid() wrap as
-- "Users can view own packages" on mystery_packages).
CREATE POLICY "Users can view own adaptations" ON public.mystery_adaptations
  FOR SELECT TO public
  USING (conversation_id IN (
    SELECT conversations.id FROM conversations
    WHERE conversations.user_id = (select auth.uid())
  ));
