# ADR-0128: Party-Cluster Detection to Accelerate Feedback-Email Timing

## Status
Accepted

## Date
2026-09-25

## Context

The `how_did_it_go` follow-up email (Trustpilot review ask + feedback link) has always fired on a flat `NOW() + 21 days` timer from `package_generated_at` (`schedule_followup_emails()`, `20260424_schedule_invite_friends_followup.sql`), independent of any signal about when the host actually ran their party. Jonathan's stated problem: feedback arrives too rarely and too late to be useful, and the working theory was that catching the email closer to the actual event — while the party's still fresh — would raise response rates.

The working hypothesis: guests access their character's page via a token URL (`/character/:token` or `/c/:token`, `CharacterAccess.tsx`) on their phones during the party. A tight cluster of many distinct character-token accesses in a short window should be a reliable "the party is happening right now" signal.

Two implementation options were considered: (a) an automated live trigger that detects the cluster and schedules the email ~12-16h later, or (b) a one-time retrospective analysis to pick a smarter static delay.

### Retrospective findings (PostHog `$pageview` data, 2026-08-22 to 2026-09-25, joined against `character_assignments` → `mystery_characters` → `mystery_packages` → `conversations`)

- 198 distinct character tokens were accessed across 24 conversations in the window PostHog has been live.
- **Clustering is real and tight.** For the 17 conversations with 3+ distinct characters accessed together, the span between the first and last access in that cluster was almost always under an hour (median ~20 min); a handful ran 3-9 hours (a party running late into the evening, or guests trickling in). This confirms the core hypothesis on real data.
- **A single fixed delay cannot serve this population.** The gap between package-ready and the party cluster ranged from same-day (many hosts buy and run the party within hours) out to 35 days later (planners). Median 0.65 days, mean pulled to 4.6 days by a long tail, p75 = 8 days. This looks like two real populations — same-day hosts and multi-week planners — not noise a single static number could average over. This is what ruled out simply retuning the flat 21-day number: any single fixed delay overshoots one population or undershoots the other.
- **A single character access is not a party signal.** 8 of the 24 conversations showed only one character ever accessed — almost certainly a host previewing their own link, or one curious guest, not a gathering. Any live detector needs a minimum distinct-character threshold, not just "any activity."

This validated building the live trigger rather than just retuning the static timer.

## Decision

1. **Signal source: a first-party Supabase column, not PostHog.** Add `character_assignments.last_accessed_at`, updated via a new token-scoped RPC (`touch_character_access`) called from `CharacterAccess.tsx` on successful page load. Rejected keeping PostHog as the live signal source: it would add a live external API dependency for a pipeline that emails paying customers, and any guest whose browser blocks PostHog (ad blockers, consent-mode defaults) would be silently invisible to the trigger. PostHog remains the right tool for retrospective/ad-hoc analysis; it is not the right foundation for a production trigger.
2. **Detection, not full cluster reconstruction.** The live detector doesn't need the retro analysis's full gap-based clustering (which requires access history). It checks, per conversation, whether at least 3 distinct characters have `last_accessed_at` within the trailing 6 hours — a proxy justified by the retro finding that real clusters resolve within roughly 1-9 hours. Runs via `detect_party_clusters()`, scheduled every 30 minutes via `pg_cron`.
3. **Accelerate, never replace, the existing safety net.** The flat 21-day `how_did_it_go` row is still inserted exactly as before at package-generation time. `detect_party_clusters()` only pulls its `scheduled_for` earlier (to `NOW() + 16 hours`) when a cluster is detected, gated by `conversations.party_detected_at IS NULL` so it only fires once per conversation, and only if the row is still `status = 'pending'`. A host who never generates a detectable cluster (printed character sheets, distributed some other way) still gets the 21-day email — this system can only make timing better, never worse.
4. **Minimum threshold fixed at 3, not scaled to `player_count`.** Kept simple per the retro data (which used the same bar to validate the hypothesis) rather than adding a scaling formula on a sample this small.

## Rationale

- Directly answers Jonathan's stated goal: catch feedback requests within ~24h of the actual party instead of on an arbitrary calendar delay.
- Low blast radius: additive columns, one new RPC, one new scheduled SQL function that only ever moves an existing row's timestamp earlier. No changes to `send-followup-emails` (the actual sender) or to the insert-time trigger.
- Reuses the existing `net.http_post`-via-`pg_cron` pattern already established in this codebase (`sweep_stuck_in_progress_packages`, `auto_remediate_packages`, etc.) is not needed here at all — `detect_party_clusters()` is pure SQL against tables already in the same database, no edge-function hop required.

## Alternatives Considered

- **Retune the static delay instead of building live detection.** Rejected — the retro data shows a bimodal-looking distribution (same-day vs. multi-week hosts) that no single fixed number serves well.
- **Use PostHog as the live signal source.** Rejected — see Decision §1. PostHog stays the retrospective analysis tool.
- **Full gap-based cluster reconstruction live (mirroring the retro script).** Rejected for now — would require storing every access timestamp, not just the latest, adding real schema/complexity for a refinement the sample size doesn't yet justify. The simpler "3 distinct in trailing 6h" proxy is documented here as the deliberate MVP; revisit if live data shows it's too sensitive or not sensitive enough.

## Consequences

- New columns: `character_assignments.last_accessed_at`, `conversations.party_detected_at`.
- New RPC: `touch_character_access(access_token_param uuid)`.
- New scheduled function: `detect_party_clusters()`, cron `party-cluster-detection` every 30 minutes.
- `CharacterAccess.tsx` now fires a non-blocking access-timestamp update on successful load.
- Small sample size (24 conversations) means the 3-distinct-in-6h threshold is a reasonable starting point, not a tuned constant — revisit once more live data accumulates under this system.
- No effect on hosts who don't use the token-URL distribution flow; they remain on the 21-day fallback exactly as before.

## Key files
- `supabase/migrations/20260925010000_party_cluster_detection_for_followup_timing.sql`
- `src/pages/CharacterAccess.tsx`
- `supabase/migrations/20260424_schedule_invite_friends_followup.sql` (unchanged, still the insert-time safety net)
- `supabase/functions/send-followup-emails/index.ts` (unchanged, still the sender)

## Discussion

Started as an exploratory PostHog/analytics question ("how do we improve feedback-email timing"), with the user's stated top preference being the automated live trigger. Before building it, a retrospective join of real PostHog access data against the mystery database was run to validate the "simultaneous character-token access = party happening" premise and to check whether a cheaper static-delay retune could get most of the value. The retro data both confirmed the clustering premise (tight, real clusters) and ruled out the cheaper option (the delay distribution is too spread out for one fixed number). The one open design fork — PostHog-live vs. a first-party Supabase column as the live trigger's signal source — was raised explicitly before implementation; Supabase was chosen for reliability (no ad-blocker blind spot) and architectural locality (same database the cron job and email sender already use).

## Addendum 1 (2026-09-26): scale the threshold by cast size, reject a sent-time delay gate

Jonathan flagged a real edge case the next day: a flat "3 distinct characters" floor is a low bar for a large cast. If a host mass-sends links to, say, 30 guests, having 3 of them peek at their phone within the same hour just because the email arrived is plausible on its own — that's "the link arrived," not "the party is happening." The larger the cast, the easier this specific false positive gets, which is backwards from what you'd want.

A pure percentage swap (e.g. "50% of the cast") was considered and rejected on its own: for a 4-player mystery, 50% is only 2 — weaker than the existing floor of 3. Landed instead on `GREATEST(3, CEIL(player_count / 2))` — keeps the floor of 3 for small casts (already a meaningful bar there) and scales it up for large ones.

Also considered and explicitly rejected: gating on elapsed time since `character_assignments.sent_at` (e.g. "only count an access if it's ≥90 min after the link was sent"), to more directly target the "just got the email" mechanism. Jonathan caught the flaw: a host who sends links the same day as, or the night before, the party is a real and common cohort in the ADR-0128 retro data — for that cohort, "just received the link" and "the party is starting" are the same event. A delay-since-sent gate would suppress fast detection for exactly the population this system was built to serve. The cast-size-scaled count threshold doesn't have this problem — a real same-day party with a large cast still clusters most/all of its characters together and clears the higher bar easily (the original retro data has a clean example: an 11-player mystery where all 11 characters clustered the same day).

No retro evidence yet that the cast-size false positive has actually fired — this is a preemptive fix for a sound-but-unconfirmed mechanism, not a response to an observed incident.

Key file: `supabase/migrations/20260926000000_scale_party_cluster_threshold_by_cast_size.sql`.
