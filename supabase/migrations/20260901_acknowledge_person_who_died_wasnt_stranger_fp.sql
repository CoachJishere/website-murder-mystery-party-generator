-- ADR-0070 addendum: acknowledge a new instance of the documented
-- "denial-shaped clause embedded inside a genuine confession" false-positive
-- class (see Death At The Velvet Rose and Ghosts Of The Past in ADR-0070).
--
-- 2026-09-01 scheduled health check flagged "The Person Who Died Wasn't A
-- Stranger" (murderer Ivy/Ivo Castellan, murderer_denies). Read in full:
-- Ivy/Ivo's final_statement is a genuine, unambiguous, detailed confession
-- (cut the wire, struck Bear with the sconce, forged Wren's handwriting,
-- motive fully explained). The denial regex matched the literal substring
-- "not me." inside "...needed it to look like Wren was the one demanding
-- the truth, not me." — about disguising the forged note's authorship, not
-- denying the murder. Content is correct as delivered; no patch needed.
--
-- Without this, the alert would keep re-firing every 6 hours for as long as
-- the package stays inside the detector's 30-day window (same systemic gap
-- already fixed once in 20260812_unconfessed_culprit_honor_acknowledged_alerts.sql
-- — the function itself is unchanged here, just a new acknowledged row).

INSERT INTO public.acknowledged_health_alerts (package_id, detector, note)
VALUES (
  '504d973c-c92c-498c-986d-1d4f36ef7b2e',
  'unconfessed_culprit',
  'The Person Who Died Wasn''t A Stranger: Ivy/Ivo Castellan flagged as murderer_denies. Read in full 2026-09-01: genuine, unambiguous, detailed confession (cut the wire, struck Bear with the sconce, forged Wren''s handwriting, motive fully explained). Detector false positive — regex matched the literal substring "not me." inside "...needed it to look like Wren was the one demanding the truth, not me." (about disguising the forged note''s authorship, not denying the murder). Same false-positive class already documented in ADR-0070 for Death At The Velvet Rose and Ghosts Of The Past. Content is correct as delivered, no patch needed.'
)
ON CONFLICT (package_id, detector) DO NOTHING;
