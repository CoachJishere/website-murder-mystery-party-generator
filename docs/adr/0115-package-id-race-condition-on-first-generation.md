# ADR-0115: package_id race condition on first-ever generation, fixed at the source

- **Status:** Accepted — implemented and verified live 2026-08-30
- **Date:** 2026-08-30
- **Related:** ADR-0104 (`claim_package_for_generation`, the claim this fix builds on), ADR-0106 (the "Wait for all child fires" aggregator this incident's investigation also touched), ADR-0114 (reversed same day mid-incident, see its Addendum)

## Context

Staša (`stasa.student@gmail.com`) paid for "The Cookie, The Crown, And The Jester's Heart" (conversation `cb044fc0-5ef9-423a-ac01-6dff0f36cb0d`) at 2026-08-30 14:04 UTC and emailed the contact form ~3 hours later asking when it would arrive. No `mystery_packages` row existed at all: the client-side trigger (`MysteryView.tsx` firing `generateCompletePackage()` on page load) never ran, almost certainly because she never landed on/stayed on `/mystery/{id}` after paying.

**Scope-checked before deciding anything:** queried all paid conversations ever with zero `mystery_packages` row — 4 total (including Staša) out of 150 total paid orders, oldest from 2025-10-23. Not systemic; one every few months. Decided not to build a detector for "paid but generation never even started" given that rate — see Consequences.

**Manually triggered generation** (service-role call to `mystery-webhook-trigger`) to unblock her. It stalled: all 5 characters got full round scripts, but `game_overview`/`detective_script`/`evidence_cards`/`title`/materials never landed, and the Make.com scenario ("MM Live - Parent61 (Evidence Cards Language Bracket Fix)", `9106101`) showed a `[400] RuntimeError` at the "Generate Evidence Images (Flux)" module, which calls `generate-evidence-images`. Pulling the actual Make execution payload (`056684c9486147bd8936c3238a69e03a`) showed the cause directly: `"package_id": ""` — an empty string, tripping that function's own `if (!package_id || ...)` guard. The `prompts` object was fine.

**Root cause, traced further:** the Parent blueprint has never received `package_id` from the edge function — `claim_package_for_generation` (ADR-0104) only ever returns a boolean, never the row's id. Every write in the Parent scenario has always re-derived it itself via `supabase:searchRows` on `conversation_id` (module 46, referenced as `{{46.id}}` in 29 places across all 4 branches). For a brand-new package, that search can race the INSERT `claim_package_for_generation` just committed. Staša's first run lost that race.

Retriggering (after she'd have an existing row) got further — the search this time found the already-existing row immediately, no race — reaching 90% before Jonathan manually stopped the run in Make.com's UI once its Parent61-vs-newly-diagnosed-cause was confirmed.

**A second, worse symptom of the same root cause, found while diagnosing:** `supabase:upsertARecord` with a blank `id` doesn't error — it silently INSERTs a new row. Two separate "early save" steps in Staša's first run each independently hit the same empty `{{46.id}}` and each created their own orphaned duplicate `mystery_packages` row (`e877faec...`, `ea406d0b...`), one holding `game_overview` with no `detective_script`, the other the reverse. Neither was ever linked to her real package or her characters. Deleted after the fix (Consequences).

## Decision

**Pass `package_id` through explicitly, at the source, instead of having Make re-derive it.**

1. **`mystery-webhook-trigger`** (edge function): after the claim step, look up the package's real id (`SELECT id FROM mystery_packages WHERE conversation_id = ... ORDER BY updated_at DESC LIMIT 1`) and include it as `packageId` in the webhook payload sent to Make. Deployed as v133.
2. **Make.com blueprint** (`9106101`): added `packageId` to the custom webhook's declared interface, then mechanically replaced every one of the 29 `{{46.id}}` references with `{{63.packageId}}` (module 46's own search left in place but now unreferenced — harmless dead weight, not removed, to keep the diff minimal and reviewable). Published as **`MM Live - Parent62 (Package ID Race Fix)`**.
3. **Staša's package completed manually**, using the exact field shape Make's own "no empty characters" completion branch writes (`generation_status → completed`, `generation_completed_at`, `conversations.is_completed`/`has_complete_package`) — content was already fully present and clean (full coherence sweep run: `list_packages_with_meta_text_leak`/`list_packages_with_victim_mismatch`/`list_packages_with_unresolved_victim_name` all 0 hits, `package_completion_blocking_defects()` null, manual read of overview/detective script clean). This write fired the existing `notify_package_ready()` trigger (ADR-0106), which sent her the real "ready" email automatically — confirmed via `net._http_response`, `200 {"success":true,"message":"Ready email sent"}`.
4. **Both orphan rows deleted** (confirmed zero `mystery_characters` referenced either first).

## Rationale

- **Fixes the actual race, not a symptom of it.** The narrower fix considered first (a Make-side `util:SetVariable` right after the aggregator, repointing only the handful of modules that visibly failed) would have papered over the specific manifestation without removing the underlying re-derivation-via-search pattern — leaving the silent-orphan-insert failure mode intact for the next module that happens to run in the same racy window.
- **Removes a whole class of dead weight along with the race.** Module 46's search existed only because the edge function had no id to give Make. Once the edge function has it, the search (and the aggregator-scope question raised while investigating it) stops mattering — 29 references now point at data that's present from the very first module in the scenario, not something the scenario has to go re-derive and hope it lands before something else needs it.
- **Mechanical, verifiable diff over structural surgery.** A find-and-replace of one exact token, done programmatically and diffed line-by-line before publishing (29 replacements, zero unexpected touches), is much easier to trust on a live, revenue-critical scenario than adding new modules whose interaction with Make's router/aggregator scoping I couldn't fully verify statically.

## Alternatives Considered

- **Set Variable workaround, scoped only to the modules observed failing** (403/413/2434/2470, plus 15300/15301/15302/15303). Rejected once the retry (started against an already-existing row) revealed the failure was specifically a first-time-generation race, not a general aggregator-scope problem — the workaround would have fixed today's symptom while leaving the actual race (and the silent-orphan-insert failure mode) live for the next brand-new package that hits the same timing window.
- **Do nothing beyond the manual fix for Staša, since only 4 orders in 10 months have ever ended up with zero package row.** That statistic is about the *outer* symptom (client trigger never firing at all) which remains genuinely rare and wasn't touched by this ADR's scope decision (see Consequences). It says nothing about how often the *inner* race (this ADR's actual subject) fires on completely normal, correctly-triggered first-time generations — which was unmeasured before this incident and could plausibly be far more common, just usually resolved without visible customer impact because most of the 29 affected write points don't 400 loudly the way `generate-evidence-images` does.
- **Delete module 46 (the now-unused search) as part of this fix.** Rejected to keep the diff minimal and mechanically verifiable; a dead, unreferenced module is a later cleanup, not a correctness question.

## Consequences

- **Positive:** the race that caused today's incident cannot recur for any normal customer-triggered generation (client trigger always goes through the claim step, which always creates/finds the row before the edge function now looks it up and passes it along).
- **Positive:** silent orphan `mystery_packages` inserts from this specific cause stop happening going forward — the blank-id condition that produced them no longer occurs on this path.
- **Neutral, verified narrow residual, not closed here:** a service-role call (internal recovery/triage only, `isServiceCall` bypasses the claim step per ADR-0104) triggering generation on a conversation with **no** existing package row at all would still get `packageId: null` — the edge function's lookup finds nothing because nothing exists yet, same as before. Not customer-reachable, not new (identical to pre-fix behavior for this one narrow path), not addressed here.
- **Deliberately NOT built:** a detector/cron for packages stuck at `generation_status = 'in_progress'` with `generation_completed_at` never set. Found during this incident that no existing healing job (`sweep_incomplete_packages`, `promote_complete_packages`, `auto-remediate-packages`, `sweep_stuck_needs_review_packages`) touches this state — all require `status` already `'completed'` or `'needs_review'`. Real gap, but this ADR's fix removes the specific mechanism (the race) that produced today's stuck-in-progress package; whether the gap is worth closing independently (a package could still stall in-progress for other reasons — a genuine Make.com scenario failure with no corresponding write, for instance) is an open follow-up, not decided here.
- **Not done:** module 46 (the now-dead search) left in place, not removed.

## Discussion

Jonathan's read after seeing the Make.com warning email (which named the wrong culprit — "Evidence Cards Language Bracket Fix" turned out to have nothing to do with language or brackets) was to ask directly "is this systemic" before accepting a quick patch. That question changed the scope twice: first from "just unblock Staša" to "check how often this happens" (4/150, not systemic in the outer sense), and second — once the actual Make execution payload was pulled and the real cause turned out to be a race rather than a scoping bug — from a narrow Set-Variable patch to fixing the race at its source. Explicitly asked to make the edits himself rather than doing it in Make's UI by hand; both halves (edge function deploy, Make blueprint publish) were shown as diffs and verified round-trip before/after publishing, given the live-revenue-critical nature of scenario `9106101` (same caution ADR-0106's own addenda applied).

Also mid-incident: Jonathan reversed ADR-0114 (`send-custom-email`, built earlier the same day) — see that ADR's Addendum. Not otherwise related to this incident's technical content, but happened during it and is cross-referenced here for anyone reading the session history.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `packageId` lookup + payload field (deployed v133)
- Make.com scenario `9106101` ("MM Live - Parent61 (Evidence Cards Language Bracket Fix)" → **"MM Live - Parent62 (Package ID Race Fix)"**), published via `PATCH /api/v2/scenarios/9106101`
- `temp-files/MM Live - Parent62 (Package ID Race Fix).blueprint.json` — record copy (gitignored, same as prior Parent58-61 records — local-only)
- `docs/adr/0114-generic-ad-hoc-email-capability.md` — Addendum reversing the send-custom-email decision, made mid-incident
