# ADR-0159: Defer the "how did it go" email until enough guests have opened their links

## Status
Accepted

## Date
2026-10-13

## Context
The `how_did_it_go` follow-up (Trustpilot and feedback request) is scheduled at package generation + 21 days (ADR-0078). ADR-0128 pulls it forward to about 16 hours after a detected party, but only while the row is still pending.

Data on 2026-10-13 (weekly SEO digest follow-up):
- PostHog guest-page pageviews cover 33 packages: 25 had their first guest open within 2 days of purchase, but a minority are played much later (first opens at day 9, 15, 22 and 36 after generation).
- "The Masque Of Shadows" (25 players) got the email on 2026-08-26 and was played on 2026-10-06, 62 days after purchase.
- Of 42 emails sent since 2026-09-25, 34 have no recorded guest open at all (tracking began 2026-09-25, so this is ambiguous: played earlier, never played, or played from a printed guide).
- A single open is often the host checking a link: a due row (7 players) had exactly 1 open two weeks earlier.

## Decision
In `send-followup-emails`, before sending a `how_did_it_go` email:
- If `conversations.party_detected_at` is set, send as before.
- Otherwise, count distinct characters whose link has ever been opened. If that count is below `max(3, ceil(player_count / 2))` (the ADR-0128 threshold, `player_count` defaulting to 6) and the row is younger than 49 days, push `scheduled_for` out by 14 days and set `skipped_reason = 'deferred_guests_not_opened'`. The status stays `pending`, so the party-cluster detector (which needs `scheduled_for > now + 16h`) can still pull it forward later.
- At 49 days (21 + 14 + 14) the email goes out regardless.
- A sent row clears `skipped_reason`.

Jonathan's call: "hold off on asking for feedback vs sending a premature email."

## Rationale
Asking for feedback before the party is wasted and mildly annoying; asking a few weeks late costs little. Reusing the detector's threshold keeps one definition of "the guests have played", and counting opens (not only the 6-hour window) also covers parties that happened before detection or between detector runs.

## Alternatives Considered
- Flat delay of 28 or 35 days: delays the roughly 75% of hosts who play within 2 days and still misses the late ones.
- Defer on "no opens at all" only: a single host proofreading click would release the email (the 7-player row above). Rejected before deploy.
- New column or table for deferrals: unnecessary; the existing `scheduled_for` and `skipped_reason` columns carry it.

## Consequences
- Hosts who never use the platform's guest links get the email at day 49 instead of day 21.
- Cap and step (14, 49) are guesses; review after about 4 weeks of data.
- `skipped_reason` on a pending row now means "deferred", on a skipped row "excluded".
- Not verified live: first effect expected on the 2026-10-14 10:15 UTC run (conversation `aa119be0`, 1 of 4 opens needed, should show `deferred_guests_not_opened` and `scheduled_for` about 14 days out).

## Discussion
Option A (conditional deferral) versus a flat 28-day delay was put to Jonathan; he chose to bias toward later. The first version (any open releases the email) was deployed for a few minutes and replaced after checking the pending queue showed the single-open case.

## Key files
- `supabase/functions/send-followup-emails/index.ts` (deployed as the live version after this change, verify_jwt on)
- `docs/adr/0128-party-cluster-detection-for-feedback-email-timing.md`
- `docs/adr/0078-post-purchase-sequence-scheduling-and-video-hosting.md`
