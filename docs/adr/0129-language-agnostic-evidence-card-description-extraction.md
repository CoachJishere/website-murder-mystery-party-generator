# ADR-0129: Extract evidence-card descriptions by position, not the English word "DESCRIPTION"

- **Status:** Accepted
- **Date:** 2026-09-27
- **Builds on:** ADR-0016/0017 (evidence image generation, Flux 1.1 Pro), ADR-0047 (auto-remediation worker), ADR-0066 (the other `handleMissingImages` fix, same function)

## Context

A GitHub health-check alert flagged package `2b8d5cd9-cd70-4de1-bee7-7dcaecc7c10f` ("L'eredità Del Silenzio", paid, `flavia_valente@hotmail.it`, Italian) as missing its Round 2 evidence-card image, roughly 7 hours after the package finished generating. Jonathan asked whether anything needed to change so this stopped taking so long to catch.

The health-check timing itself turned out to be a red herring: the `list_packages_missing_evidence_images()` detector correctly declined to flag the package at 05:24 (inside its deliberate 45-minute post-completion grace period, ADR-0016), and `auto-remediate-packages`'s own 30-minute-cadence cron **did** pick the defect up right on schedule at 05:43 — `auto_remediation_log` shows a row for this package at that exact time. The actual GitHub Actions alert firing at 12:10 instead of ~06:17 was a real but secondary delay (GitHub's `schedule` trigger is documented best-effort, no SLA, and appears to have dropped one scheduled run here) — not the reason the customer's package sat broken for hours.

The real cause was in the 05:43 remediation attempt itself. It ran, detected the missing round, and logged `action: "escalate:no_mechanical_fix", outcome: "escalated"` — i.e. it gave up without even trying to regenerate the image. `handleMissingImages`'s `extractCard()` helper pulls a round's player-facing description out of `evidence_cards` by matching the literal heading `#### DESCRIPTION`. This package's evidence card used `#### DESCRIZIONE` — the Italian translation, produced by the same `language_instruction` convention that translates every other section header in this pipeline (confirmed: the Parent generation prompt explicitly tells the model to translate template headers into the customer's language unless it's English). The hardcoded English regex never matched, `extractCard` returned `null`, `handleMissingImages` had no prompt to send, and the whole remediation attempt silently no-opped — burning one of the class's two attempt slots for nothing.

Checked the blast radius before fixing: sampled evidence-card text across the corpus and found the description heading is consistently the *first* `####`-level subsection under a round's `###` title, regardless of which word labels it — but that word varies both by **language** (`DESCRIPTION`/`DESCRIZIONE`/presumably `BESCHREIBUNG`, `DESCRIPCIÓN`, `DESCRIÇÃO`, `BESCHRIJVING`, ...) and by **template version** (older packages use `#### SIGNIFICANCE (Host Only)` as the next section, some newer English packages use `#### IMPLICATIONS` instead, and some carry an extra `#### VISUAL DESCRIPTION (FOR IMAGE GENERATION)` section after that). No other file in the repo duplicates this parsing logic (checked `regenerate-parent-content`, which only contains the *generation* template, not a parser) — this was a single, well-contained bug, not a paired-predicate-drift case.

## Decision

Rewrote `extractCard()` in `supabase/functions/auto-remediate-packages/index.ts` to find the description by **position** instead of by an English keyword: the first `####`-level heading inside the round's section, whatever word follows it, capturing everything up to the next heading of any level (`#{2,6}`) — the same structural stop the old code already used to *end* the capture, just now also used to *start* it. The existing "Host Only" defensive truncation (originally matching only `significance`) now also matches `implications`, covering the newer template's naming without needing to enumerate every language's translation of either word — the structural stop already excludes the next section regardless of language; the keyword truncation is a backstop, not the primary defense.

Verified against three real formats pulled from the corpus (Italian `DESCRIZIONE`/`SIGNIFICANCE`, English `DESCRIPTION`/`SIGNIFICANCE`, English `DESCRIPTION`/`IMPLICATIONS`/`VISUAL DESCRIPTION`) before deploying: all three now extract the correct player-facing description with no murderer-naming content leaking through. Deployed via `supabase functions deploy` (CLI, not the MCP tool — this project's established practice after an earlier MCP inline-content deploy shipped placeholder text) and confirmed the live function's source matches via `get_edge_function`.

L'eredità Del Silenzio's Round 2 image was already recovered by hand earlier the same session, before this fix was identified — this ADR documents the *systemic* fix, not that recovery.

## Rationale

- **Root-caused before generalizing.** Confirmed the exact failure (regex mismatch on `DESCRIZIONE`) against the real stored text before touching code, rather than guessing at "probably a language thing" and patching broadly.
- **Fixed at the source, not with a translation allowlist.** Enumerating every supported language's word for "description" (13 languages, more if new ones are added) would work today and silently break again the next time a template wording changes or a language is added. Matching by position is invariant to both.
- **No new ongoing cost.** This is a pure parsing fix inside code that already runs on the existing 30-minute cron — no new cron job, no new Replicate spend beyond what `handleMissingImages` already spends when it successfully finds a prompt to send.
- **Checked for duplication first.** Confirmed no other function parses `evidence_cards` the same way before fixing just the one file — this codebase has a known "paired-predicate drift" failure shape (two places implementing the same check independently, only one gets updated) and it was worth the one grep to rule that out here.

## Alternatives Considered

1. **Add `DESCRIZIONE` (and other languages' translations) as explicit alternates in the regex.** Rejected: fixes today's one language, not the general case — the same silent-no-op would recur for German, Spanish, Portuguese, or Dutch the first time one of those hit a missing-image round, and for any new language added later. Confirmed the position-based match handles all of them without enumeration.
2. **Tighten the GitHub Actions health-check cron interval.** Considered as a response to the "7 hours" framing, but investigation showed the detection and remediation timing were never the actual problem — the 05:43 remediation attempt fired right on schedule and simply failed silently. Shortening the cron would not have caught or fixed anything faster; it would only have alerted a human sooner to a defect the self-heal loop was *already* attempting and failing on every 30 minutes. Not pursued.
3. **A brand-new pg_cron self-healing job dedicated to evidence images.** This was the initial plan going into the investigation (a job like this didn't seem to exist). Turned out one already does — `auto-remediate-packages`'s `handleMissingImages`, on the shared 30-minute `auto-remediate-packages` cron — so the actual gap was a bug in existing code, not a missing capability. Building a second, parallel mechanism would have duplicated `handleMissingImages` and its cost/attempt-cap machinery for no reason.

## Consequences

- Any paid package whose evidence-card headers are in a non-English language, or use the newer `IMPLICATIONS`-labeled template, now gets a real regeneration attempt from the existing self-heal loop instead of a silent `escalate:no_mechanical_fix` no-op. This was previously true for **every** non-English package that ever dropped an evidence-card image — not just this one — though the corpus sample suggests it's rare enough (matching the documented ~6 cases in 3 months across the whole feature) that no other customer-facing incident is known to have hit it before now.
- `auto_remediation_log` will start showing real `regenerate_images:roundN` attempts (and their cost) for non-English packages where it previously only ever logged `escalate:no_mechanical_fix` — a good sign the fix is working, not a new problem, if it recurs going forward.
- No change to the GitHub Actions health-check schedule or the 45-minute detector grace period — both were already working as designed; this ADR doesn't touch either.
- The "many hours" gap for *this specific customer* is not expected to recur for the same reason: it needed the health-check's own GitHub Actions delay (a separate, pre-existing, best-effort limitation) stacked on top of the remediation bug this ADR fixes. With the remediation bug fixed, most future cases should self-heal within one 30-minute cron cycle regardless of what the GitHub Actions schedule does.

## Key files

- `supabase/functions/auto-remediate-packages/index.ts` — `extractCard()`, rewritten to match by position; deployed 2026-09-27.
- `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 57 — the sweep that surfaced the original health-check alert this investigation started from.
- CHANGELOG.md 2026-09-27 entry.

## Discussion

The load-bearing moment was resisting the obvious first fix (just add the Italian word) once the real mechanism was confirmed. An English-keyword allowlist would have closed today's specific ticket and left the same trap for the next language or the next template revision — this codebase already has a documented pattern of exactly that failure shape (paired predicates, hardcoded English strings that silently stop matching once content is localized or a template evolves). Matching by position instead of by word content is the more expensive-sounding fix to describe but was actually less code, and it's the version that doesn't need to be revisited the next time a German or Portuguese package hits the same gap. Also worth naming directly: the initial hypothesis presented to Jonathan (GitHub Actions cron drift as the primary cause) was incomplete — investigating further, past the point of having *a* plausible explanation, is what surfaced the actual, fixable bug instead of a recommendation to just poll more often for a problem the system was already trying and failing to fix on its own.
