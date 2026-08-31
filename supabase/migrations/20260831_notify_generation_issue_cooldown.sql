-- ADR-0103 Addendum 9: notify-generation-issue can be invoked multiple times
-- within seconds of each other for the same package (multiple Make.com child
-- executions each independently re-validating completion via the ADR-0108
-- trigger). Each invocation that finds something missing also dispatches its
-- own recovery re-fire, with no memory of a near-simultaneous sibling
-- invocation having just done the same thing — the root cause behind three
-- separate false-alarm bugs this week. This column lets the function skip a
-- redundant full run when another one processed the same package moments
-- ago, instead of patching one more way the overlap gets misjudged.
--
-- See docs/adr/0103-new-purchase-coherence-sweep-ritual.md Addendum 9.

ALTER TABLE public.mystery_packages
  ADD COLUMN IF NOT EXISTS notify_last_run_at timestamptz;
