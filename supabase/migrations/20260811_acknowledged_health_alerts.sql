-- Acknowledged health-check alerts: a lightweight way for a human to mark a
-- specific detector finding on a specific package as "seen, investigated,
-- decision made, don't keep re-alerting" without touching detector logic or
-- customer-delivered content.
--
-- Distinct from the ADR-0072 `is_test` flag (which excludes disposable test
-- rows from ALL detectors permanently) — this is per-package, per-detector,
-- and for real, investigated production packages where the underlying gap is
-- real but the decision was to leave it. Same "escalate-only, human decides,
-- durable record" philosophy as every detector in this codebase (ADR-0016,
-- ADR-0041, ADR-0064, ADR-0070).
--
-- First use: "Death At The Birthday Bash" (733b02dd-...), roster-count
-- mismatch (20 approved vs 17 delivered — real gap, ADR-0068 follow-up
-- 2026-08-11). Jonathan emailed the customer 2026-08-08 with no reply;
-- decision was to leave the package as-is rather than proactively patch it.
-- See CHANGELOG 2026-08-11.
CREATE TABLE IF NOT EXISTS public.acknowledged_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.mystery_packages(id) ON DELETE CASCADE,
  detector text NOT NULL, -- matches the detector's own name, e.g. 'roster_mismatch'
  note text,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (package_id, detector)
);

COMMENT ON TABLE public.acknowledged_health_alerts IS
  'Per-package, per-detector suppression for health-check findings that were investigated and knowingly left as-is. Detectors should exclude any package_id present here for their own detector name. Not a substitute for fixing real bugs — only for a human decision to accept a specific, already-understood gap.';

ALTER TABLE public.acknowledged_health_alerts ENABLE ROW LEVEL SECURITY;
-- Service-role only (same posture as auto_remediation_log / other internal audit tables) —
-- no public policy is added, so PostgREST access requires the service key.

INSERT INTO public.acknowledged_health_alerts (package_id, detector, note)
VALUES (
  '733b02dd-074f-4d20-b3ac-ad32c714a43c',
  'roster_mismatch',
  'Death At The Birthday Bash: 20 approved vs 17 delivered (Mikey/Add Sinchai + Jessica Thorne missing). Real gap, not detector noise (ADR-0068 follow-up placeholder-line fix already applied). Jonathan emailed customer 2026-08-08, no reply as of 2026-08-11. Decision: leave as-is, revisit only on customer response or new signal.'
)
ON CONFLICT (package_id, detector) DO NOTHING;
