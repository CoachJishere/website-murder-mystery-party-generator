# ADR-0066: Retry NSFW-rejected evidence images at a higher safety tolerance before escalating

- **Status:** Accepted
- **Date:** 2026-08-05
- **Builds on:** ADR-0016/0017 (evidence image generation, Flux 1.1 Pro), ADR-0047 (auto-remediation worker), the 2026-08-02 manual recovery of "Death At The Birthday Bash" (CHANGELOG, same failure mode, fixed by hand)

## Context

Package `c28f5a73-2ac8-4b55-a501-481de66517a9` ("Death At The Top: A Blackstone Betrayal", paid, customer ayomideajiboye1@icloud.com) was missing its Round 3 evidence-card image. The worker had tried twice (11:13, 11:43 UTC) and failed both times with `Flux prediction failed: Error generating image: NSFW content detected.`, hitting its 2-attempt cap — the exact "keeps spending its attempt budget retrying an identical doomed prompt" gap flagged as a known, unfixed follow-up in the 2026-08-02 CHANGELOG entry for the same failure mode.

That prior incident ("Death At The Birthday Bash") had a real cause: the evidence description described ricin-extraction methodology and Bitcoin-paid black-market procurement — genuinely graphic content, fixed by a human hand-rewriting the prompt to drop the explicit synthesis language.

This case's Round 3 card ("Crystal Decanter Stopper with Forensic Analysis Report") describes a glass decanter stopper and a lab report noting latex-glove residue — nothing graphic on inspection. Tested the hypothesis directly: re-sent the **exact same prompt, byte-for-byte**, via `generate-evidence-images` at `safety_tolerance: 5` instead of the pipeline's default `2`. It succeeded on the first attempt. This confirms a false-positive rejection by an overly strict default filter, not genuinely unsafe content — a different root cause from the 2026-08-02 case despite the identical error string, and one a text rewrite isn't actually needed for.

## Decision

**Two changes:**

1. **`generate-evidence-images`** now accepts an optional `safety_tolerance` (1–6) in its request body, defaulting to `2` (today's unchanged behavior). Purely additive — existing Make.com callers that don't send it are unaffected.

2. **`auto-remediate-packages`'s `handleMissingImages`** now catches this specific failure reason and retries once, automatically, before giving up:
   - On any round(s) failing with `NSFW content detected`, retry *just those rounds* at `NSFW_RETRY_SAFETY_TOLERANCE = 5`.
   - Any other simultaneous failure (network, rate-limit, storage) is **not** retried at a higher tolerance — a looser filter can't fix those, and silently retrying them would mask a different bug instead of surfacing it.
   - If the retry (and every non-NSFW round) comes back clean, the attempt is logged `fixed`. If anything is still broken after the retry, the attempt is logged `failed` with both attempts' detail — genuinely graphic content (the 2026-08-02 shape) still escalates to a human exactly as before, since retrying a truly-unsafe prompt at a higher tolerance is not guaranteed to help and shouldn't be assumed to.
   - This all happens inside **one** `runGatedAttempt` call (one entry against the 2-attempt cap), not two scheduled sweep cycles — a false-positive case that previously took two 30-minute-apart attempts to reach the cap and stay broken now typically resolves on the very first attempt.

Customer's package was fixed manually the same way (logged to `auto_remediation_log` as a manual entry, matching the 2026-08-02 precedent) before this code shipped, so this ADR documents the *autonomous* fix, not the recovery itself.

## Rationale

- **Test-before-build.** The fix targets a confirmed mechanism (verified by literally reproducing success at a higher tolerance against production data) rather than a guessed one. A less rigorous approach — e.g., assuming the 2026-08-02 "rewrite the prompt" pattern applied here too — would have led to building an LLM-based prompt-sanitizer for a problem that a one-line parameter change already solves.
- **No new paid-API dependency.** The fix is one extra Replicate call ($0.04) on a specific, narrow, already-established failure path — not a new capability or a new spend category. It stays within the same Replicate spend this exact worker class already makes autonomously today, under the same $5/day cap. (A text-rewrite fallback, which would need an LLM call, was considered and explicitly not built — see Alternatives.)
- **Narrow trigger, not a general loosening.** The retry only fires on the literal `NSFW content detected` error string, only for the specific round(s) that hit it. A network error or a 5xx doesn't get a pointless second attempt at a different safety setting.
- **One attempt, not two.** Bundling the retry inside the same `apply()` call (rather than letting the natural attempt-cap machinery try again next sweep) means a false positive resolves in seconds instead of consuming both scheduled attempts and permanently escalating — which is exactly what happened to this customer's package before the fix shipped.

## Alternatives Considered

1. **LLM-based prompt sanitizer** (rewrite the evidence description to strip anything that might read as graphic, mirroring the 2026-08-02 manual fix). Rejected for this specific failure: the evidence proves the *content* wasn't the problem, the *filter setting* was — rewriting a prompt that isn't actually graphic doesn't address the real cause and adds a new paid-API dependency (Anthropic/Claude) for no benefit here. Left as a real option for a *future* case that fails even at `safety_tolerance: 5` (i.e., a confirmed 2026-08-02-shaped case) — that would need explicit sign-off before building, since it's a new paid-API surface, not an extension of already-approved Replicate spend.
2. **Just raise the pipeline's default `safety_tolerance`.** Rejected: a global loosening trades a rare false-positive-retry cost for weaker filtering on every image, including genuinely graphic ones. The targeted retry gets the same practical outcome (false positives self-heal) without changing the default's safety posture.
3. **Retry the NSFW rounds within the SAME scheduled attempt cap slot** (i.e., don't bundle the retry into one `apply()` call, just let the 2-attempt cap's second natural try use a higher tolerance). Rejected: doing so would need `handleMissingImages` to know it's on "attempt 2" and behave differently — more state to track for a worse outcome (still takes ~30 minutes / a full sweep cycle to resolve, versus seconds today).

## Consequences

- Round 3's image (and any future NSFW-false-positive case, on any round) recovers automatically, typically on the very first scheduled attempt, instead of permanently escalating after burning both attempts.
- Genuinely graphic content (the 2026-08-02 shape) is unaffected — still escalates to a human after the retry also fails, with both attempts' error detail preserved for whoever investigates.
- Minor, accepted cost-accounting imprecision: `plan.costUsd` for this class stays `IMAGE_COST_USD * rounds.length` (the single-attempt cost) even on the rare path where an NSFW retry adds a second $0.04 Replicate call — consistent with this codebase's existing convention of not separately budgeting for retries-within-a-call (the same gap already exists for `generate-evidence-images`'s own internal 429/5xx retries). Negligible against the $5/day cap; not worth the complexity of precise dynamic cost tracking for a rare edge case.
- `generate-evidence-images`'s new `safety_tolerance` parameter is available to any future caller (e.g., a human recovering a package by hand, as done here) without needing a code change each time.

## Key files

- `supabase/functions/generate-evidence-images/index.ts` — optional `safety_tolerance` request field, threaded into `callFlux11Pro`.
- `supabase/functions/auto-remediate-packages/index.ts` — `NSFW_RETRY_SAFETY_TOLERANCE` constant, `handleMissingImages`'s NSFW-detection-and-retry branch.
- CHANGELOG.md 2026-08-02 entry — the prior, differently-caused incident this one was initially assumed (and confirmed not) to match.

## Discussion

The load-bearing decision was testing the hypothesis against real production data before writing any recovery code — re-sending the identical prompt at a higher tolerance and watching it succeed, rather than pattern-matching to the 2026-08-02 incident's fix (rewrite the prompt) because the error string was identical. The two cases share a symptom but not a cause: one was genuinely graphic content that needed different words; this one was acceptable content that needed a different filter setting. Building the LLM-sanitizer fallback first — the more "obviously correct" fix by analogy to the last incident — would have shipped a fix that didn't address this case's actual mechanism, and would have introduced a new paid-API dependency the task didn't actually need. The empirical test is what made the cheaper, dependency-free fix the correct one instead of just the convenient one.
