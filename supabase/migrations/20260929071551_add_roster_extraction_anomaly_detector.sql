-- ADR-0130 Addendum 2: pre-purchase checkout-path anomaly detector.
--
-- Closes the gap named explicitly in ADR-0131 Part 3A ("No detector coverage
-- of the pre-purchase/checkout path at all") -- every existing detector in
-- this codebase operates on mystery_packages/mystery_characters AFTER
-- generation. The ADR-0130 incident's actual failure mode (a roster-
-- extraction regex regression silently blocking checkout) sat entirely
-- outside that machine's domain: nothing would have caught it even in
-- principle, at any layer, before a purchase. It took two customers
-- (Mel, Alison) emailing support over ~28 hours to surface it.
--
-- Deliberately NOT a paid LLM fallback on the checkout page itself -- most
-- empty-roster hits there are legitimate (a customer mid-concept-chat who
-- hasn't finished yet; confirmed via PostHog during the ADR-0130 Addendum 1
-- investigation that 8 of 10 checkout-page visits in the incident window
-- were exactly this, not bugs), so a paid retry would fire constantly on the
-- normal case. This is the free, deterministic alternative: log an anomaly
-- row only when a character-list-shaped section header (any supported
-- locale, via the shared `sectionHeaderRegex`) is actually present somewhere
-- in the conversation but the parser still extracted zero characters from
-- it -- the exact shape of "this should have worked and didn't," not
-- "the customer just isn't done yet." health-check.yml (check 18) reports
-- any hit within a rolling 24h window, turning the next undetected
-- regression into "noticed within hours" instead of "noticed when a
-- customer emails."

CREATE TABLE IF NOT EXISTS public.roster_extraction_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid,
  player_count int,
  detected_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roster_extraction_anomalies IS
  'ADR-0130 Addendum 2: logged by extract-concept-roster (the pre-purchase checkout preview) whenever a character-list-shaped section header is present in the customer''s concept chat but roster extraction still found zero characters -- the exact ADR-0130 Addendum 1 failure shape. Not deduplicated (a customer retrying the checkout page multiple times during one incident is expected and fine to log repeatedly); list_roster_extraction_anomalies() groups by conversation for reporting.';

ALTER TABLE public.roster_extraction_anomalies ENABLE ROW LEVEL SECURITY;
-- Service-role only (same posture as auto_remediation_log / acknowledged_health_alerts) --
-- no public policy is added, so PostgREST access requires the service key.

CREATE INDEX IF NOT EXISTS idx_roster_extraction_anomalies_detected_at
  ON public.roster_extraction_anomalies (detected_at);

CREATE OR REPLACE FUNCTION public.list_roster_extraction_anomalies(_since timestamptz)
RETURNS TABLE (
  conversation_id uuid,
  title text,
  player_count int,
  is_paid boolean,
  hit_count bigint,
  first_detected_at timestamptz,
  last_detected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.conversation_id,
    c.title,
    a.player_count,
    c.is_paid,
    count(*) AS hit_count,
    min(a.detected_at) AS first_detected_at,
    max(a.detected_at) AS last_detected_at
  FROM public.roster_extraction_anomalies a
  JOIN public.conversations c ON c.id = a.conversation_id
  WHERE a.detected_at >= _since
    AND COALESCE(c.is_test, false) = false
  GROUP BY a.conversation_id, c.title, a.player_count, c.is_paid
  ORDER BY min(a.detected_at) ASC;
$$;

COMMENT ON FUNCTION public.list_roster_extraction_anomalies(timestamptz) IS
  'ADR-0130 Addendum 2 (closes the ADR-0131 Part 3A gap "no detector coverage of the pre-purchase/checkout path"): reports conversations where extract-concept-roster (the pre-purchase preview) found a character-list-shaped section header in the customer''s own concept chat but extracted zero characters from it -- the exact failure shape that silently blocked Mel and Alison at checkout for ~28 hours before either emailed support. Free, deterministic, no LLM spend, no false-positive risk from customers who simply have not finished their concept yet (those never have the header at all). ESCALATE-ONLY: a human should read the flagged conversation and confirm whether it is a genuine parser gap (like ADR-0130 Addendum 1) or something else before acting -- this detector cannot distinguish "the regex has a new bug" from "the model wrote a malformed header" on its own.';

GRANT EXECUTE ON FUNCTION public.list_roster_extraction_anomalies(timestamptz) TO service_role;
