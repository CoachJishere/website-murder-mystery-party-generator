# ADR-0120: an orphaned, always-present accomplice-confession stage direction leaks into `detective_script`'s reveal when there is no accomplice

- **Status:** Root cause found and fix drafted; not yet imported into Make.com. Historical remediation not yet decided.
- **Date:** 2026-09-05
- **Related:** ADR-0103 Addendum 19 (a *different* accomplice-tagging bug found the same week — role over-assignment, not this template leak), the Make.com blueprint historically named "Parent49 (Accomplice-Beat Silent-Omission)" (introduced the correct mechanism this ADR's fix relies on, but left the buggy one behind), ADR-0069 Addendum 1/2 (the `has_accomplice`/`player_count` staleness investigation that led here)

## Context

Sweeping "The Oath And The Poisoned Cup" (a real, correctly-built accomplice mystery) surfaced that `conversations.has_accomplice` doesn't reliably track whether a package's actual roster has an accomplice character — that part was fixed directly (see below). But checking the historical corpus for the same mismatch in the *opposite* direction (`has_accomplice = true`, no accomplice character) found **30 paid packages**, far too many to be the same narrow staleness bug.

Reading one of the 30 ("The Final Cut") explained it: `detective_script`'s REVEAL section contains a literal, unresolved leaked bracket, in the customer-facing text a host would read aloud at the climactic arrest:

> *The detective turns, naming the accomplice, and waits.*
> **`*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*`**
> *Detective Inspector Ashford nods slowly, satisfied at last...*

This isn't a rare fluke. A corpus-wide check for this exact bracket pattern found:

| Package | Purchased/generated | Player count | Style | Host email |
|---|---|---|---|---|
| The Final Cut | 2026-09-04 | 13 | character | — |
| Blood, Dust & Dead Man's Hand | 2026-09-02 | 8 | character | dhr148@gmail.com |
| Elementary, My Dear Cadaver | 2026-09-01 | 12 | character | — |
| The Workshop Of St. Nick | 2026-08-31 | 10 | character | alana.holmes@live.com.au |
| Casa Ferrel | 2026-08-30 | 9 | character | romanelegoaster@gmail.com |
| Love Island Season 8 Reunion Murder Mystery | 2026-08-29 | 11 | character | saanchijain04@gmail.com |
| Operation: Thirty & Murdery | 2026-08-25 | 30 | character | — |
| Murder In Paradise: Death At Coral Cove Resort | 2026-08-24 | 16 | character | — |
| The Enchanted Family Reunion Murder | 2026-08-02 | 6 | detective | — |
| The Case Of The Stolen Golden Flamingo | 2026-08-01 | 8 | detective | — |
| Death At The Deadwood Saloon | 2026-04-22 | 9 | character | — |

11 paid packages, 2026-04-22 through 2026-09-04 — this has been live for over 4 months. 9 of 11 are `mystery_style = 'character'` (slip-style), though the reveal narration itself reads as a central-detective voice regardless of style, meaning both styles share this prompt section. Several `host_email` values are null (not every purchase captures one) — full identification would need cross-referencing `conversations`/order records, not attempted here.

**Root cause, found directly in the live Make.com Parent blueprint** (`temp-files/MM Live - Parent63 (Single Accomplice Constraint).blueprint.json`, read locally, nothing edited in Make.com): the detective_script REVEAL prompt contains two separate, back-to-back mechanisms for the accomplice confession beat:

1. A correctly-worded conditional **instruction** (an `[ACCOMPLICE BEAT — conditional...]` bracket): *"First check whether the master_context defines an accomplice. If it DOES: after the murderer's confession, add one paragraph... If it does NOT: write nothing here — no paragraph, no placeholder, no bracketed note... Never output this instruction itself..."* This one works as designed — it's an instruction *about* what to write, correctly told not to leak itself.
2. Immediately following it, a **second, separate, always-present line** styled exactly like the legitimate host stage-direction convention used correctly elsewhere in the same prompt (e.g. `*[Present Round 2 Evidence]*`): `*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*`

Line 2 is a leftover duplicate of what line 1 already handles — but because it's formatted identically to the *other* stage directions the model is told elsewhere to preserve verbatim, the model frequently copies it straight through into player-facing output even when there is no accomplice, rather than recognizing it needs the same conditional treatment as line 1. This produces exactly the symptom found: a stub "naming the accomplice" sentence pointing at no one, followed by the raw, unresolved bracket instruction, sitting in text a host reads aloud at the game's climax.

This line predates the Make.com blueprint historically named "Parent49 (Accomplice-Beat Silent-Omission)" — the fix that correctly introduced mechanism 1 — and appears to be exactly what that fix should have replaced but didn't: a paired-predicate-drift shape (two mechanisms answering the same question, only one ever updated), the same recurring bug family this project has hit multiple times before (see `feedback_regex_pair_alignment` / `project_gate_detector_deadlock` in memory).

## Decision

**Immediate, low-risk part — done:**
- Corrected `conversations.has_accomplice` for "The Oath And The Poisoned Cup" (`a3c58f9a-368e-4fca-ab32-3b87e37925bd`) directly.
- Added an auto-sync to `validate_package_characters()` (the existing ADR-0108 completion trigger): on every transition of a package's `generation_status` into `'completed'`, `conversations.has_accomplice` is corrected to match whether `mystery_characters` actually has a `character_role = 'accomplice'` row for that package — unconditional, best-effort, same spirit as `player_count`'s existing auto-sync. Migration `20260905183501_sync_has_accomplice_from_actual_characters.sql`, tested end-to-end on a live package (forced a stale value, re-triggered completion, confirmed self-correction with zero disturbance to the otherwise-clean package).

**The actual leak — root-caused, fix drafted, not yet imported:**
- Duplicated `Parent63` to `MM Live - Parent64 (Remove Orphaned Accomplice Stage Direction).blueprint.json` (confirmed 63 was the current head before duplicating, per this project's versioning convention), deleting the orphaned line 2 from all 4 routes that carry this prompt. `temp-files/build-parent-v64.py` applies the removal as a verified single-substring replacement (asserted exactly 4 matches, one per route) — mechanism 1 (the working conditional) and the `[CLOSING]` beat are both left untouched, since mechanism 1 alone is already sufficient to produce the correct confession paragraph when an accomplice genuinely exists.
- Validated: output is well-formed JSON, and a sorted-key diff against Parent63 shows exactly the 4 intended deletions and nothing else.
- **Not deployed.** Per this project's established Make.com pattern, importing `Parent64` into the live scenario and any live-generation validation are Jonathan's to do — this session has no Make.com API access.

**Not yet decided — flagged for Jonathan, not resolved here:**
- Whether/how to remediate the 11 historical packages' `detective_script` text. Each needs the exact leaked bracket replaced with either a real accomplice-confession paragraph (if `master_context` shows one was actually meant to exist and just never got named — needs per-package inspection) or removed cleanly with the closing arrest line adjusted to name only the murderer (if there truly is no accomplice). This is customer-facing content on paid orders, several delivered months ago — likely already used for real parties — so a blind mechanical strip risks being wrong per-package in a way the Golden Feather Magpie fix wasn't. Recommend a `sweep`-style pass per package rather than a bulk script.
- Whether to backfill `conversations.has_accomplice` for the 30-package corpus found in the opposite-direction check (only 11 of the 30 were confirmed to share this exact leaked-bracket root cause; the remaining ~19 weren't individually verified in this pass and may be a legitimately different shape — not conflated with this ADR's scope).

## Consequences

- Confirmed this is not a one-off: 11 real paid customers received a package with an unresolved template bracket sitting in their game's central reveal moment, some as recently as yesterday.
- The `has_accomplice` DB flag being wrong for months made this systemic pattern invisible to any check that trusted it — the flag mismatch, once actually investigated instead of assumed benign, is what surfaced the real content bug underneath it.
- `list_packages_with_meta_text_leak()` does not catch this pattern (its bracket markers don't include this phrase) — a natural follow-up once the historical-remediation approach is decided, mirroring ADR-0103's practice of extending that detector alongside each newly-found leak shape.

## Key files

- Make.com Parent blueprint (not in this repo) — actual root cause. `temp-files/MM Live - Parent63 (Single Accomplice Constraint).blueprint.json` (previously live) / `temp-files/MM Live - Parent64 (Remove Orphaned Accomplice Stage Direction).blueprint.json` (drafted fix, not yet imported) / `temp-files/build-parent-v64.py` (the verified transform)
- `supabase/migrations/20260905183501_sync_has_accomplice_from_actual_characters.sql` — `has_accomplice` auto-sync, live
- `supabase/functions/mystery-webhook-trigger/index.ts` — confirmed `has_accomplice` is read-only here, never written (not the sync site; the trigger above is)
- Fixed directly: `conversations` row for `a3c58f9a-368e-4fca-ab32-3b87e37925bd`
- Not yet remediated: the 11 packages listed above in Context

## Discussion

This was found by refusing to accept "has_accomplice is probably just a stale flag, not a big deal" at face value — checking the opposite direction of the mismatch (flag says true, no character exists) rather than stopping once the narrow, already-understood direction (flag says false, character exists) was fixed. The volume (30 mismatches) was the signal that something structural was wrong, not a handful of one-off chat-decision-never-synced cases; reading even one of the 30's actual delivered content is what turned "a data hygiene footnote" into "a customer-facing defect that's been live for four months."
