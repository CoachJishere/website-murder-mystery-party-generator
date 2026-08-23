# ADR-0106: Single source of truth for the "your mystery is ready" customer email

- **Status:** Accepted — both halves shipped and verified end-to-end 2026-08-23
- **Date:** 2026-08-23
- **Related:** ADR-0103 (new-purchase coherence sweep — this is where the bug was found), ADR-0104 (atomic claim pattern this reuses), ADR-0098 (`claim_package_for_remediation` — the same pattern, third application)

## Context

Toby Wragg's purchase ("Death On The Île De Ré," conversation `781f7d62-b520-442e-93aa-e61abd3ffb5d`) surfaced two related bugs during the ADR-0103 sweep, both traced to Make.com execution logs (scenario `9106101`, "MM Live - Parent56"; scenario `9061052`, "MM Live - Child (Unified)36"):

1. **The customer got the "Your Mystery is Ready! We'd Love Your Feedback" email twice**, ~5 minutes apart, from a single Parent scenario execution (confirmed via Make's API: one execution, `23a38ce9e0c246f1846ba366c12058cc`, no replay).
2. **Generation took ~20 minutes for a 4-character package** (vs. ~10-11 minutes for comparable recent packages) — the Child scenario ran 8 times instead of the expected ~4-5, including one hard failure.

Root cause of the underlying defect: Sylvie/Sylvain Dubois's round-content generation call was blocked by Anthropic's content filter (`[400] Output blocked by content filtering policy`, confirmed via Make's dead-letter queue, character name confirmed in the DLQ'd bundle). Her character combines detailed prescription/dosage-management content with "IF YOU'RE GUILTY" framing implicating her in the poisoning — plausible classifier bait. A retry succeeded.

That retry is where the architecture problem shows up. **Two independent, uncoordinated systems can each recover from the same defect and each can trigger customer-facing behavior:**

- **Parent's own internal retry loop.** The Parent blueprint has, duplicated across all 4 top-level mystery-type branches (router `173` → routes 0-3), a "has empty characters → `BasicFeeder` retry → recheck → send ready email" sub-flow. 12 total copies of the same "send ready email" HTTP module (`api.resend.com/emails`) sit at the terminal branches of this logic (3 per top-level branch × 4 branches).
- **`notify-generation-issue` (Supabase edge function).** Fires independently — via the completion-time callback and/or the `sweep_incomplete_packages`/`sweep-stuck-needs-review-packages` crons — re-firing the Child webhook for specific empty/missing characters, with its own attempt cap, spend cap, and audit log (`auto_remediation_log`). This is the system that actually fixed Sylvie/Sylvain's content (`auto_remediation_log` row, `action: regenerate_character:Sylvie/Sylvain Dubois`, `18:01:21`).

Both systems were built at different times to solve the same problem ("a character came back empty, fix it") without either one being aware the other exists. Parent's retry predates `notify-generation-issue`'s more careful version and is architecturally cruder — no attempt cap, no spend cap, no audit trail, and its "success" check races against whatever `notify-generation-issue` might independently be doing to the same row. The duplicate email and the padded runtime are both downstream symptoms of this same root cause, not two separate bugs.

There's also a real functional gap hiding in "just delete Parent's retry logic": `notify-generation-issue` only sends the **internal** support alert (`🚨 Generation Issue` to `support@mysterymaker.party`), never a customer-facing one. If Parent's retry-then-email logic were simply deleted with no replacement, a package that needed `notify-generation-issue`'s recovery to actually complete would never notify the customer at all — a regression, not a fix.

## Decision

**Move the "ready" email out of Make.com entirely, into a single Postgres trigger that fires exactly once per package, on the transition into `generation_status.status = 'completed'` — regardless of which code path caused that transition.**

1. **New column:** `mystery_packages.ready_email_sent_at timestamptz`.
2. **New trigger function `notify_package_ready()`**, `BEFORE INSERT OR UPDATE ON mystery_packages FOR EACH ROW`:
   - Fires only when `NEW.generation_status->>'status' = 'completed'` AND the row wasn't already `'completed'` (`OLD` is NULL on insert, or `OLD.generation_status->>'status' IS DISTINCT FROM 'completed'`) AND `ready_email_sent_at IS NULL`.
   - Sets `NEW.ready_email_sent_at := now()` **in the same trigger invocation that's already holding the row lock** — a `BEFORE` trigger mutating `NEW` needs no follow-up `UPDATE` and can't recurse into itself, and Postgres's normal MVCC row locking means a concurrent second transition for the same row blocks until the first commits, then re-reads the now-committed `ready_email_sent_at` and correctly no-ops. This is simpler than the RPC-based atomic claim used elsewhere (`claim_package_for_generation`, `claim_package_for_remediation`) because a trigger already runs inside the same transaction as the write that's changing the status — no separate claim round-trip needed.
   - Calls `net.http_post` to a new edge function, `send-mystery-ready-email`, passing `package_id`.
3. **New edge function `send-mystery-ready-email`**: looks up the customer email/name/mystery title/language from `conversation_id`, sends the existing HTML template (ported verbatim from the Parent blueprint's module 315) via Resend. Follows the same shape as `send-welcome-email`/`send-host-email` (already-established pattern in this codebase) rather than inventing a new one.
4. **Parent blueprint: remove the retry-and-email sub-flow entirely, in all 4 branches.** Delete the 12 "ready" email HTTP modules, the 4 "has empty characters" routers (`197`/`301`/`2437`/`2473`) and their nested `BasicFeeder` retry loops and recheck routers (`206`/`306`/`2442`/`2478`). Each branch does its one generation pass, writes what it has, and stops — exactly the behavior the "no empty characters" path already has today, minus the email (which the DB trigger now owns). Recovery for anything left incomplete is `notify-generation-issue`'s job alone, as it already effectively is today (it's the system that actually fixed Sylvie/Sylvain).

## Rationale

- **A DB trigger, not a 13th copy of an atomic-claim RPC.** ADR-0104's Rationale already established the atomic-claim pattern (`SELECT ... FOR UPDATE` + conditional `UPDATE`) for exactly this class of problem. A trigger is a lighter version of the same idea that fits better here specifically because the "did the status just become completed" check and the "claim the send" check are the *same* write — there's no separate caller to race against, since every possible path that could mark a package `completed` already goes through a normal `UPDATE`/`INSERT` on this table (Make.com's `supabase:upsertARecord` modules, `promote_complete_packages()`, `heal_completed_packages()`, and any future path) and all of them fire the same trigger.
- **Single source of truth beats patching 12 call sites.** The alternative (add an atomic-claim RPC call in front of each of the 12 existing email modules) closes today's specific duplicate but leaves the same footgun for the next person who copies one of those 12 branches to add a 13th — the exact "paired predicate, easy to miss one copy" failure class already seen in this codebase (ADR-0055/56/57). Moving the send to a DB trigger means there is structurally only one place it can ever fire from, independent of how many recovery paths exist upstream or get added later.
- **Removing Parent's retry loop, not just gating its email, closes the actual root cause.** The retry loop is what made this package take 2x as long and run the Child scenario 8 times instead of ~4-5 — it was doing (uncapped, unaudited, unbudgeted) work that `notify-generation-issue` already does more carefully. Leaving it in place but gating only its email would still leave two systems racing to fix the same defect, still burning double the Anthropic spend on every package that hits this path, just without the customer-visible symptom.
- **`heal_completed_packages()` and `promote_complete_packages()` are two more instances of the same "two systems, one job" pattern** (noticed but not touched here) — both crons independently promote `needs_review → completed` with near-identical guard logic on separate 2-minute schedules. Out of scope for this ADR (neither sends customer-facing email, so they don't reproduce this specific bug), but worth its own pass — flagged for a future ADR rather than scope-creeping this one.

## Alternatives Considered

- **Option A — gate all 12 existing email modules behind an atomic-claim RPC, leave Parent's retry loop in place.** Closes the duplicate-email symptom with a small, low-risk, easily-reversible change (no blueprint restructuring, verifiable with a plain SQL test, no live spend needed). Rejected as the *final* fix because it leaves the actual root cause (two uncoordinated recovery systems, doubled spend, doubled runtime) in place — but this was seriously considered as a safer first step before Option B, specifically because Option B requires restructuring a live, revenue-critical Make.com scenario that can't be fully dry-run without a real purchase. Discussed directly with Jonathan; he chose to go straight to the deeper fix (Option B, this ADR) rather than land Option A first.
- **Keep the email in Make.com but add a "did we already send this" check via a `supabase:searchRows` module before each of the 12 sends.** Equivalent in spirit to Option A but implemented in Make.com rather than SQL. Rejected for the same reason ADR-0104 chose a SQL RPC over PostgREST filter syntax: the "already sent AND this is a genuine transition" condition is exactly the kind of AND/OR logic that's fragile to express correctly 12 times over in a visual builder, versus once in SQL.
- **Leave Parent's retry loop but make it call `notify-generation-issue` instead of retrying inline.** Would unify the recovery *work* but still requires Parent to somehow know when recovery finished in order to email — reintroducing the same "how does Parent know the async recovery is done" problem this ADR is solving by moving the trigger to the DB, which is the one place that's guaranteed to observe every possible completion path.

## Consequences

- **Positive:** exactly one customer-facing "ready" email per package, regardless of how many recovery attempts or which system performs them, going forward and for any future recovery mechanism without further code changes.
- **Positive:** removes Parent's redundant, uncapped, unaudited retry work — should meaningfully cut both average generation time and Anthropic spend for any package that has an initially-empty character, since only `notify-generation-issue`'s capped/audited recovery does that work now, not both systems racing.
- **Neutral:** the email template moves from inline HTML in a Make.com blueprint (English-only, as it already was) to a Supabase edge function. No behavior change to the email itself in this pass; i18n for this email (matching the 13-locale coverage other transactional emails already have) is a natural follow-up but deliberately out of scope here to keep this change to the structural fix.
- **Risk, mitigated:** this touches a live, revenue-critical Make.com scenario. The DB-side half (migration + trigger + new edge function) is independently testable with plain SQL and zero live spend before anything touches Make.com. The Parent blueprint edit will be prepared as a new versioned blueprint (`Parent57`, per this repo's existing blueprint-versioning discipline) and shown to Jonathan for explicit review before publishing to the live scenario — not auto-published.

## Discussion

Jonathan's read after the sweep found the duplicate email: rather than patch the symptom (Option A), he asked directly for the deeper fix once the tradeoff was laid out — accepting the larger, riskier blueprint change in exchange for actually removing the wasted spend and doubled runtime, not just the customer-visible symptom. The explicit call was: do Option B, but the DB-side pieces (which are safe and independently verifiable) proceed first, and the live Make.com scenario change gets shown for review before it's published — the ADR's staged rollout reflects that.

## Addendum (2026-08-23): Parent57 shipped with a real regression, caught and fixed same session via the planned test run

Parent57 removed routers `197`/`301`/`2437`/`2473` exactly as planned — but each of those routers' two branches did more than gate the retry/email: the "no empty characters" exit (modules `313`/`314` in the `Character-Murder` branch, and the equivalent pair in each of the other 3) also contained the *only* writes that ever marked a package `generation_status = 'completed'` and set `mystery_packages.generation_completed_at` / `conversations.is_completed`. Removing the whole router subtree removed those writes too, not just the retry-and-email logic layered on top of them. Parent57 was live for several minutes: any real generation running through it would have produced correct content but never been marked complete — stuck showing "in progress" indefinitely, with nothing (not even `heal_completed_packages()`/`promote_complete_packages()`, both of which require `generation_status->>'status' = 'needs_review'`, never reached) able to recover it.

**Caught by:** the planned post-deploy test run itself — a 4-character test package stalled at `generation_status.progress = 90`, `"Verifying character content..."`, with `generation_completed_at` still null well after Make's own execution log showed the Parent and all 4 Child scenario runs had completed successfully. Confirmed via Make's blueprint export that the removed modules included the completion-writes, not just retry infrastructure.

**Fixed:** published as `Parent58`, reusing the original routers' own filter conditions verbatim (`length(<empty-check>.data) = 0` / `> 0`, reused rather than re-derived) but with only two `supabase:upsertARecord` writes per branch and no retry, no email:
- No empty characters → mark `mystery_packages` `completed` + `conversations` `is_completed`/`has_complete_package` (same fields the original `313`/`314` wrote).
- Has empty characters → mark `mystery_packages` `needs_review` (the existing DB-side recovery pipeline — `notify-generation-issue`, `sweep_incomplete_packages`, `promote_complete_packages` — takes it from there, exactly as it already does today).

Also fixed a second, previously-unnoticed bug in the *original* (pre-Parent57) blueprint while reading its structure to build this: the "still broken after retry" exit (`306.route1` → modules `310`/`311`/`312`) sent the customer the "ready" email and marked `conversations.is_completed = true` even when generation was confirmed still broken. Parent58's `needs_review` branch does neither.

**Verified end-to-end, real spend, no manual workaround on the corrected path:** the test package's one genuine defect (round content blocked by Anthropic's content filter for a different character, unrelated to this bug — same failure class as Sylvie/Sylvain in the ADR-0104 addendum) was correctly routed to `needs_review`, recovered by `notify-generation-issue`, and promoted to `completed` by the existing 2-minute sweep cron — which correctly fired the new trigger exactly once (confirmed via `net._http_response`: one `"Ready email sent"` 200, no duplicates).

**Key files touched by this addendum:** Make.com scenario `9106101`, blueprint updated in place from Parent56 → Parent57 (regression) → Parent58 (fix), via `PATCH /api/v2/scenarios/9106101`.

## Key files

- `supabase/migrations/20260823_ready_email_single_source_of_truth.sql` — new column, trigger function, trigger
- `supabase/functions/send-mystery-ready-email/index.ts` — new edge function
- Make.com scenario `9106101` ("MM Live - Parent56" → "Parent58 (Fix Missing Completion Write)", updated in place, same scenario ID/webhook throughout): removes routers `197`/`301`/`2437`/`2473` and their nested `BasicFeeder`/recheck sub-flows and the 12 embedded "ready" email HTTP modules; adds back a minimal completion-marking router per branch (see Addendum)
- `temp-files/MM Live - Parent57 (Remove Redundant Retry Loop).blueprint.json` — the regression, kept for the record per this repo's blueprint-versioning convention
- `temp-files/MM Live - Parent58 (Fix Missing Completion Write).blueprint.json` — the fix, currently live
- Vault note `duplicate-ready-email-parent-router-bug-2026-08-23-mystery-maker.md` — the original investigation this ADR resolves
