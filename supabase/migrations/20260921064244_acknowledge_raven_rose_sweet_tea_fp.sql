-- ADR-0070 addendum: acknowledge two more instances of the documented
-- "denial-shaped clause embedded inside a genuine confession" false-positive
-- class (see Death At The Velvet Rose, Ghosts Of The Past, The Person Who
-- Died Wasn't A Stranger in ADR-0070).
--
-- 2026-09-20/21 scheduled health checks flagged:
--
-- 1. "The Raven And The Rose" (murderer_denies, Susan/Stuart). This package's
--    murderer identity was hand-corrected the same day (ADR-0103 Addendum 52
--    — Make.com's plot-generation step had originally named the wrong
--    character as murderer; Susan's final_statement was rewritten to confess
--    directly: "I'm the one who killed Danny Mercer..."). The regex hit the
--    literal substring "I would never" inside an earlier, unrelated sentence
--    — "I told myself, every one of those thirty years, that I would never
--    let it happen again" — about a broken 30-year self-promise regarding
--    the 1996 cover-up, not about denying Danny's murder. Read in full: a
--    genuine, unambiguous, detailed confession.
--
-- 2. "Sweet Tea, Secrets, And A Slug Of Bourbon" (accomplice_denies_despite_
--    named, Cornelius Sinclair). Read in full: a genuine, unambiguous
--    confession ("I disabled that porch camera myself, on purpose... I
--    triggered that loop because Axel asked me to"). The regex hit the
--    literal substring "nothing more." inside "I gave Axel a window, nothing
--    more." — an idiomatic understatement of scope, not a denial. None of
--    the accomplice confession-keyword exclusions happen to appear verbatim
--    in Cornelius's own phrasing (he never says "I helped" or "I admit",
--    for example) despite the content being an unambiguous admission.
--
-- Both content-correct as delivered; no patch needed to either final_statement.
-- Same false-positive class ADR-0070's Rationale already declined to chase
-- with more regex. Without this, both alerts would keep re-firing every 6
-- hours for the rest of their 30-day windows.

INSERT INTO public.acknowledged_health_alerts (package_id, detector, note)
VALUES
  (
    '7b7bd8bf-3482-41a4-9c78-18720548b121',
    'unconfessed_culprit',
    'The Raven And The Rose: Susan/Stuart flagged as murderer_denies. Read in full 2026-09-21: genuine, unambiguous, detailed confession ("I picked up that raven off the mantel and I hit him... I''m the one who killed Danny Mercer"), rewritten the same day as part of ADR-0103 Addendum 52''s murderer-identity fix. Detector false positive — regex matched the literal substring "I would never" inside "I told myself, every one of those thirty years, that I would never let it happen again" (about her broken 30-year self-promise regarding the 1996 cover-up, not about denying Danny''s murder). Same false-positive class already documented in ADR-0070. Content is correct as delivered, no patch needed.'
  ),
  (
    '4dca8af6-2e1c-4f12-b0f2-22d819b18ccd',
    'unconfessed_culprit',
    'Sweet Tea, Secrets, And A Slug Of Bourbon: Cornelius Sinclair flagged as accomplice_denies_despite_named. Read in full 2026-09-21: genuine, unambiguous confession ("I disabled that porch camera myself, on purpose... I triggered that loop because Axel asked me to"). Detector false positive — regex matched the literal substring "nothing more." inside "I gave Axel a window, nothing more." (an idiomatic understatement of scope, not a denial); none of the accomplice confession-keyword exclusions happen to appear verbatim in Cornelius''s own phrasing. Same false-positive class already documented in ADR-0070. Content is correct as delivered, no patch needed.'
  )
ON CONFLICT (package_id, detector) DO NOTHING;
