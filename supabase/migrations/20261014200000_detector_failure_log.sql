-- ADR-0103 Addendum 87 Update 7: auto-remediate-packages used to email on every single detector timeout (about 3 a day,
-- contention-driven, harmless). It now records each skip here and only emails when one detector keeps failing.
CREATE TABLE IF NOT EXISTS public.detector_failure_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rpc text NOT NULL,
  message text,
  alerted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS detector_failure_log_rpc_created_idx ON public.detector_failure_log (rpc, created_at DESC);
-- Service role only (the worker); no policies on purpose.
ALTER TABLE public.detector_failure_log ENABLE ROW LEVEL SECURITY;
