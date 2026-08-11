# ADR-0076: Parent51's empty master_context (Sonnet 5 `.textResponse` bug) and unbounded auto-recovery retries

- **Status:** Accepted
- **Date:** 2026-08-11
- **Related:** ADR-0074 (blanket Sonnet 5 upgrade — introduced the `.textResponse` unreliability and already fixed it in the Child scenario), ADR-0047/0061/0062 (auto-remediate-packages' attempt-cap + daily-spend-cap safety rails, mirrored here), ADR-0065 (notify-generation-issue's self-heal grace period gate)

## Context

Customer `nathan@coppellbible.org` purchased "Operation: Nightfall - A Spy Agency Murder Mystery" (30 players, conversation `cf8844ff-...`, package `9288548b-...`) at 2026-08-11 20:10. He emailed minutes later: *"the finished product... appears to be made up of two mysteries that do not go together."* He was right, and the investigation turned up two separate, serious bugs.

**Bug 1 — wrong content shipped to the customer.** `game_overview`, `detective_script`, and `evidence_cards` all described a completely unrelated Gothic-manor art-collector murder ("Ravenscroft Manor," "Julian Ashford," "Director Voss," "Poisoned Flask"), while the 30 character sheets correctly reflected his actual SENTINEL/Project-ORACLE spy-agency concept. The two pipelines diverged: characters come from `mystery-webhook-trigger`'s deterministic regex extraction of the customer's own chat, while the overview/script/cards come from Make.com's own AI planning steps — only the latter broke.

Jonathan provided a Make.com execution audit (`temp-files/v51audit.txt` + `temp-files/v51audit input.txt`) that made the root cause fully traceable:
- **Part 1 (`master_context`) generated correctly** — the actual murderer selection (Tactical Commander Raptor), full victim profile for Commander Phoenix, relationship matrix, and every character's motive, all matching Nathan's real story.
- But the **prompts sent to Claude for `game_overview`, `detective_script`, and `evidence_cards` all had `<master_context></master_context>` completely empty** — just the tag pair with nothing inside, alongside a title and formatting instructions. Given nothing to work with, Sonnet 5 (temperature 1) defaulted to a generic manor-murder pattern instead of erroring, so nothing downstream noticed anything was wrong — a plausible, well-formed, completely fictional mystery.

Tracing the raw blueprint mapping in `temp-files/MM Live - Parent51 (Blanket Sonnet Upgrade).blueprint.json` found the exact defect: the `<master_context>` placeholder was populated via `{{171.textResponse}}{{3000.textResponse}}` (modules "Master Doc - Part 1/2"). `.textResponse` is the **exact same Make.com Anthropic-connector field that ADR-0074 already found unreliable for Sonnet 5 responses** — that ADR fixed it in the Child scenario (`Child (Unified)23-FixParseFieldMapping`, `.textResponse` → `.content[].text`) but the equivalent fix was never applied to the Parent scenario, which was rebuilt the same day for the same blanket-Sonnet-5 upgrade.

Scoping the blast radius: **all 28 Anthropic-Claude modules across all 4 routes in Parent51** (Character/Detective × Murder/Intrigue) read their own or another module's output via `.textResponse` — 88 occurrences total. Since Parent51 only went live today and Nathan is the only completed generation since, this was a fresh regression with no other confirmed victims yet, but every subsequent detective- or character-style purchase would have hit some version of the same silent-corruption risk until fixed.

**Bug 2 — no bound on the auto-recovery retry loop.** While investigating, Jonathan asked whether the "keeps looping every ~5-10 minutes" behavior he'd observed on Nathan's stuck package (`generation_status.status = 'needs_review'`, unchanged content, re-written repeatedly) could burn real money unattended overnight. Tracing it: `sweep_stuck_needs_review_packages` (a `*/10 * * * *` pg_cron job, `supabase/migrations/20260805_sweep_stuck_needs_review_packages.sql`) calls `notify-generation-issue` for every `needs_review` package under 30 days old. That function's auto-recovery block (fire a paid child-webhook regeneration call for every character with empty content) had **no attempt cap and no spend cap** — unlike `auto-remediate-packages` (ADR-0047), which caps every defect class at 2 attempts and a shared $5/day spend ceiling. A character stuck for a persistent (non-transient) reason would get a real, paid Sonnet 5 regeneration attempt fired every 10 minutes, for up to 30 days, with nothing to stop it.

## Decision

**Accepted.** Two fixes, both mirroring already-established patterns in this codebase rather than inventing new ones:

1. **Parent52 blueprint** (`temp-files/MM Live - Parent52 (Fix textResponse Field Mapping).blueprint.json`): blanket-replaced all 88 occurrences of `{{<id>.textResponse}}` with `{{<id>.content[].text}}` across Parent51, using the exact syntax already proven in `Child (Unified)23`. Verified the result is byte-identical to Parent51 except for exactly those 88 substitutions plus the scenario name (`b === expected` string-equality check, not just a visual diff). **Not yet imported into Make.com** — that step needs Jonathan (no Make.com API access from this session); the fix is otherwise complete and ready.
2. **`notify-generation-issue` safety rails**: added `MAX_ATTEMPTS_PER_CHARACTER = 2` and a `DAILY_SPEND_CAP_USD = 5.0` to the auto-recovery block, using the exact same accounting mechanism as `auto-remediate-packages` — attempts counted from `auto_remediation_log` (new `defect_class = 'empty_character_content'`, `action = 'regenerate_character:<name>'`), spend summed from the same table since UTC midnight. Deliberately **one shared $5/day ceiling** across both systems (not a second independent $5/day budget), matching the existing "shared spend cap" philosophy already documented in `auto-remediate-packages` for `regenerate-child-content` (ADR-0054/0061). Characters that hit either cap are surfaced in the alert email under a new "Auto-Recovery Capped" row instead of silently vanishing. Also fixed a latent bug found while touching this code: the old `recovered`/`skipped` email rows were a mutually-exclusive ternary chain, so a package with characters in *both* buckets would silently drop the `skipped` row from the email — now all three lists render independently.

## Rationale

- Both fixes apply patterns this codebase already decided were correct elsewhere (`content[].text` per ADR-0074; attempt-cap + spend-cap per ADR-0047) rather than introducing new judgment calls. Lower risk, and keeps the two safety-rail systems conceptually and financially consistent instead of drifting apart.
- The blueprint fix is a pure mechanical substitution (verified via string equality against the exact expected transform, not eyeballed), so there's effectively no risk of introducing a *different* bug while fixing this one.
- The spend cap is explicitly **shared**, not additive — two independently-capped $5/day budgets would let combined auto-remediation spend hit $10/day without either system's own accounting ever showing a breach.
- `CHARACTER_REGEN_COST_USD = 0.15` is a stated **estimate**, not a measured figure like the Haiku/Replicate costs already in `auto-remediate-packages` — flagged as such in the code so it doesn't get mistaken for a verified number later.

## Alternatives Considered

- **Fix only the specific 3 modules (game_overview/detective_script/evidence_cards) that broke Nathan's package**, leaving the other 85 `.textResponse` references untouched. Rejected: every one of those 85 references reads a Sonnet 5 module's output the same unreliable way; patching only the symptom that happened to surface today would leave the identical latent bug in image prompts, themed materials, and every other route.
- **A second, independent $5/day cap for `notify-generation-issue`.** Rejected in favor of a shared cap — see Rationale.
- **Cap at the package level instead of per-character.** Rejected: a 30-player package with 2 independently-stuck characters would exhaust a package-level cap on one character, leaving the other with zero attempts. Per-character capping (mirroring the per-defect-class capping in `auto-remediate-packages`) treats each stuck item as its own bounded problem.

## Consequences

- **Not yet live.** Parent52 needs a manual import into Make.com by Jonathan (replacing Parent51 as the scenario the webhook calls). `notify-generation-issue`'s code fix needs a Supabase deploy (`verify_jwt: true`, matching current — confirmed via `get_edge_function` before this ADR was written) before it protects anything in production.
- Until Parent52 is imported, any new detective- or character-style purchase is still exposed to the empty-`master_context` risk on `game_overview`/`detective_script`/`evidence_cards`/`themed_materials`/image prompts.
- Until `notify-generation-issue` is deployed, the sweep job's auto-recovery path is still uncapped for any package that enters `needs_review`.
- Nathan's own package (`9288548b-...`) was hand-repaired in full during this incident (all 30 characters, `game_overview`, `detective_script`, `evidence_cards` rewritten by hand from the conversation transcript and the correct Part 1 master_context — no metered API calls used) — see CHANGELOG for the itemized fix. He has already been emailed and confirmed his package looks correct.
- No sweep was run for *other* packages potentially affected by the `.textResponse` bug beyond Nathan's, because the live-scenario timeline check (Parent51 went live today, Nathan is the only completed generation since) ruled out other victims for *this specific* regression. This does not rule out the possibility that other Parent versions (Parent49, still handling some traffic per earlier ADR-0074 notes) have their own instance of the same class of bug — not investigated in this pass.
- A health-check detector for "package content doesn't reference its own roster" / "master_context empty but downstream content populated" was proposed as additional defense-in-depth but not yet built as of this ADR — deferred, not forgotten.

## Key files

- `temp-files/MM Live - Parent52 (Fix textResponse Field Mapping).blueprint.json` — the fixed blueprint, awaiting Make.com import
- `supabase/functions/notify-generation-issue/index.ts` — attempt cap + shared daily spend cap added to the auto-recovery block
- `supabase/migrations/20260805_sweep_stuck_needs_review_packages.sql` — the 10-minute cron that calls the now-capped function
- `supabase/functions/auto-remediate-packages/index.ts` — the pattern mirrored (`MAX_ATTEMPTS_PER_DEFECT`, `DAILY_SPEND_CAP_USD`, `auto_remediation_log`)
- Hand-repaired: `conversations`/`mystery_packages`/`mystery_characters` for conversation `cf8844ff-694e-400b-9a3a-7b02400b48a5` (package `9288548b-b615-4ca1-a4db-6051359981ae`)

## Discussion

The investigation nearly stopped one level too shallow twice. First: it would have been easy to treat "characters are fine, overview/script/cards are wrong" as a data-integrity mystery (cross-package content leakage) rather than tracing it to a specific, findable prompt-construction bug — the actual Make.com audit Jonathan provided (not something available from Supabase logs or local blueprint greps alone) is what turned a vague "something's wrong upstream" into an exact module ID and an exact broken expression. Second: the initial framing of the retry-loop question ("will it keep looping until characters are done") assumed the loop was benign-if-slow; it took Jonathan naming the actual financial risk explicitly to prompt tracing the auto-recovery code path all the way to "zero cap, real spend, every 10 minutes, for 30 days" — which was a genuine, unrelated-to-Nathan's-specific-incident gap that had been sitting in production since 2026-08-05 (the sweep migration's date) without anyone's attention landing on it until this conversation surfaced it as a side effect of asking "could this get expensive while I'm asleep."
