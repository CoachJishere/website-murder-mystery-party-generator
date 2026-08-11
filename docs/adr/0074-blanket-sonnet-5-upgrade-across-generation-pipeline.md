# ADR-0074: Blanket Claude Sonnet 5 upgrade across the generation pipeline

- **Status:** Accepted
- **Date:** 2026-08-11
- **Related:** ADR-0067 (reveal-confession split; introduced the first two Sonnet 5 calls), ADR-0042/ADR-0064 (content-quality detector pattern)

## Context

ADR-0067's fix relies on the model reliably keeping a confession out of the Final Statements round and saving it for The Reveal. On Haiku 4.5, the new `list_packages_with_final_statement_confession_leak` detector caught a genuinely high leak rate (4/5 guilty and 4/5 accomplice on a test package) even after the prompt was rewritten — Haiku's weaker contrastive-instruction-following was the root cause, not the wording. Jonathan asked whether upgrading Call 4/5 (the two calls that write `final_guilty`/`final_accomplice`/`reveal_confession_*`) from Haiku to Sonnet 5 would help; both blueprints (`Child (Unified)20` → `21`) were duplicated with just those two calls moved to Sonnet, plus a strengthened prompt and the detector, as a three-part fix (2026-08-09/10).

Jonathan then asked whether a **blanket** upgrade — every Anthropic call in the pipeline, not just Call 4/5 — would be "worth it and not cost that much more." Before committing to that, a real cost estimate was pulled (not guessed) from:
- Every Anthropic call's model, `max_tokens`, and prompt template across `Parent50` (28 calls: 7 call-types × 4 mystery-type/style routes) and `Child (Unified)21` (8 calls: 3 calls × 2 routes + Call 4/5)
- Which calls re-inject prior calls' output as context (traced via `{{module_id.field}}` references in the IML templates)
- Real production content lengths from Supabase (`mystery_packages`, `mystery_characters`) over the trailing 60 days, and real monthly generation volume (26 completed paid generations/month: 7 character-style, 19 detective-style)

The headline finding: Parent's 5 downstream calls (Game Overview, Themed Materials, Detective Script, Evidence Cards, Image Prompts) each re-inject the **full** `master_context` field, which is literally `{{171.textResponse}}{{3000.textResponse}}` — the two Master Doc calls' raw combined output, averaging ~113,456 characters (~28K tokens), resent whole in every one of those 5 calls. That volume, not instruction text, dominates Parent-side cost.

Per-generation cost estimate (character-style, blended real accomplice/non-accomplice mix):
- Current (narrow Sonnet — only Child Calls 4/5): ~$0.69/generation
- Blanket Sonnet, standard pricing ($3/$15 per MTok): ~$1.84/generation (2.7×)
- Blanket Sonnet, intro pricing ($2/$10, through 2026-08-31): ~$1.23/generation

At real volume (26 generations/month, Parent shared across both styles): combined blanket delta ≈ **+$10–21/month** depending on pricing window. Sample size is thin (n=9 character packages, n=26 total/month) and the estimate is derived from static blueprint text plus DB content-length averages rather than live billing logs, so treat it as ±30-40%, not exact — but even doubled, the absolute dollar amount doesn't come close to mattering at current sales volume.

Separately, while inspecting every call's full parameter set (not just `model`), found that **Child v21's Calls 4/5 — already on Sonnet 5 and not yet imported into Make.com — had `temperature: 0.7` set**, which Sonnet 5 rejects with a 400 for any non-default sampling parameter. Same `temperature: 0.7` was set on the then-Haiku-only Child calls (harmless there, but would break the moment they moved to Sonnet 5) and on the single Detective-Style Child call, which was separately found to already be running on a deprecated `claude-sonnet-4-20250514` rather than Haiku.

## Decision

Move every Anthropic call in the generation pipeline to `claude-sonnet-5`, and fix the `temperature: 0.7` sampling-parameter bug on every call being touched (Sonnet 5 requirement, not optional):

1. **`Parent51`** (duplicated from `Parent50`): all 28 calls (7 call-types × 4 routes) `claude-haiku-4-5-20251001` → `claude-sonnet-5`. `temperature` was already `'1'` (the default) on every Parent call — no fix needed there.
2. **`Child (Unified)22`** (duplicated from `Child (Unified)21`): the remaining 6 Haiku calls (Calls 1-3, both routes) → `claude-sonnet-5`. `temperature: 0.7` stripped from all 8 calls (the 6 just-swapped plus the 2 already on Sonnet 5 from ADR-0067) — this was a live bug fix, not just cleanup for the two already-Sonnet calls.

**`Child (Detective-Style)3` was also produced during this work but is out of scope — see Correction below.**

`thinking: {type: "disabled"}` was left unchanged everywhere — still valid on Sonnet 5 (the effort-cap restriction on disabled thinking that applies to Claude Opus 5 is an Opus-only quirk, not shared by Sonnet 5).

### Correction (same day): `Child (Detective-Style)` is not part of the live pipeline

Jonathan flagged after this ADR was written: *"I only use Parent and Child Unified live."* Verified directly against `Parent50`'s JSON — the single outbound webhook URL (`hook.eu2.make.com/3l26wasbsjzh5396np25qoyv8g82u6j3`) appears 8 times across all 4 routes (both the "detective" and "char-based" labeled ones) and nowhere else; there is no second webhook URL anywhere in the file. Every character-generation trigger, regardless of mystery style, goes to the same Child (Unified) scenario. `Child (Detective-Style)` is a leftover from before the April 2026 child-scenario unification (see the "Child Scenario Unification & Parent Fix" work) — dead, not invoked by anything live.

Consequence: **`Child (Detective-Style)3-SonnetUpgrade.blueprint.json` should not be imported into Make.com** — it upgrades a file nothing calls. No harm done (temp-files are git-untracked scratch, and nothing was imported before this was caught), but the live scope of this ADR is **`Parent51` + `Child (Unified)22` only** — those two already cover both mystery styles, since Child (Unified)'s two routes (accomplice / non-accomplice) are style-agnostic.

Every edit was verified with a full recursive, type-aware structural diff against the pre-edit source before being considered safe — same discipline established after the `max_tokens` string/number bug during the ADR-0067 work. Each diff showed exactly the intended `model`/`temperature`/`name` changes and nothing else.

## Rationale

- Cost is not the deciding factor here — the real number is roughly the price of a couple of coffees per month at current volume, and Jonathan's stated motivation ("give out better quality mysteries now that I'm getting regular sales") is a quality call, not a cost-optimization one.
- Haiku's weaker instruction-following is plausibly not confined to the confession-leak defect class it was diagnosed against — several other already-known, already-detector-covered defect classes (self-directed questions, meta-text/CoT leaks, identity contamination, victim mismatches — ADR-0042) share the same "contrastive instruction the model needs to actually track" shape.
- The `temperature: 0.7` bug would have silently broken Calls 4/5 the moment `Child21` was imported into Make.com, regardless of the blanket-upgrade decision — worth fixing now while every call's full parameter set was already being inspected rather than discovering it later via a production 400.
- The Detective-Style Child call was already on a deprecated Sonnet 4 snapshot (`claude-sonnet-4-20250514`, no retirement date announced but flagged deprecated) — moving it to Sonnet 5 is a model-currency fix independent of the Haiku question, bundled in since it's the same blueprint family.

## Alternatives Considered

- **Staged rollout** (Parent's story-foundation calls next, then Child's remaining Haiku calls, verifying each before the next): the originally-planned path pending the cost estimate. Dropped once the estimate came back small enough that staging buys verification safety at a cost the dollar figure doesn't justify weighing against — Jonathan's "let's go for it" after seeing the numbers was a direct call to skip staging, not an oversight to flag back.
- **Leave detective-style out of scope**: considered, since ADR-0067's confession-split fix explicitly doesn't apply to detective-style (single predetermined culprit, no slip-draw). Jonathan chose the full-pipeline option when asked, given via `AskUserQuestion` — moot in practice once it turned out both styles already run through the same `Child (Unified)` scenario (see Correction above), so "full pipeline" and "both styles" reduce to the same two files either way.

## Consequences

- Every Parent and Child call across both mystery styles now runs on Sonnet 5 pricing ($3/$15 per MTok standard, $2/$10 intro through 2026-08-31) instead of Haiku ($1/$5).
- The two live-scope blueprint files (`Parent51`, `Child (Unified)22`) are not yet imported into Make.com — Jonathan confirmed production is still running `Parent49`/`Child19` (pre-dating even the ADR-0067 confession-split work). Import order and end-to-end re-test are still pending.
- `Child (Detective-Style)3` exists in `temp-files/` but is not part of this ADR's live scope — see Correction above. Left in place as harmless scratch, not slated for import.
- No backfill implication — this only affects future generations from the point of import onward.
- The blanket move means any future Haiku-specific quality regression this session was tracking (confession leak, self-directed questions, etc.) should be re-measured against Sonnet 5 output rather than assumed fixed — the existing detectors (health-check checks 6-13) remain the verification mechanism.

## Discussion

The key trade-off debated was staged vs. blanket rollout. The earlier caution (two real surprises — the `max_tokens` type bug and the `package_id` test-harness gap — from touching just two calls) argued for staging. But that caution was about *verification risk*, not cost, and the cost question was the one actually blocking the decision. Once real numbers showed the blanket move costs roughly $10-21/month more at current volume — immaterial next to "regular sales" — the remaining risk is entirely the same structural-diff-and-disposable-test-conversation discipline already in place, which applies identically whether the diff has 2 changes or 29. Jonathan's directive after seeing the estimate ("let's go for it... time to give out better quality mysteries") was treated as resolving the staging question in favor of blanket, not as grounds to re-litigate it.

The `temperature: 0.7` finding changed the shape of the task mid-flight: it surfaced only because every call's *full* parameter set was inspected (not just `model`), prompted by the same discipline that caught `max_tokens` earlier. Bundling the fix into this same set of edits (rather than a separate pass) was a scope call made and disclosed to Jonathan before any files were touched, per the standing "never make bulk changes without showing what you're about to do first" rule.

## Key files

- `temp-files/MM Live - Parent51 (Blanket Sonnet Upgrade).blueprint.json` (new, from `Parent50`) — **live scope, needs import**
- `temp-files/MM Live - Child (Unified)22-BlanketSonnetUpgrade.blueprint.json` (new, from `Child (Unified)21`) — superseded by v23, see below
- `temp-files/MM Live - Child (Unified)23-FixParseFieldMapping.blueprint.json` (new, from v22) — **live scope** (fixes the `textResponse` bug — see Correction 2)
- `temp-files/MM Live - Child (Unified)24-PreParseDelay.blueprint.json` (new, from v23) — pre-Parse Sleep delay; did not fix the residual failures (see Correction 3), superseded by the `parse-claude-json` fix, which needs no blueprint change on top of v23
- `temp-files/MM Live - Child (Detective-Style)3-SonnetUpgrade.blueprint.json` (new, from `Child (Detective-Style)2`) — **not live scope, do not import** (see Correction 1)
- `supabase/functions/parse-claude-json/index.ts` — **deployed** (v6 → v7), string-aware control-character escaping fix (see Correction 3)

## Correction 2 (same day): first end-to-end test on Sonnet 5 failed — `textResponse` field mapping, not prompt formatting

Jonathan ran a real end-to-end test of `Parent51` + `Child (Unified)22` against the disposable test conversation (`74b66430-...`, "Murder At Blackwater Lodge," 5 characters, has-accomplice). Parent completed cleanly (`game_overview`, `materials`, `master_context`, `detective_script`, `evidence_cards` all populated correctly on Sonnet 5). Child did not: characters landed with wildly inconsistent partial content — some got only their innocent branch, some only guilty, some only accomplice, one character got nothing at all across ~15 minutes and two automatic retry waves from the health-check remediation sweep (itself found to not respect `is_test`, a separate bug worth a future fix).

Root-caused via Supabase edge function logs (`get_logs` on `parse-claude-json`): the `parse-claude-json` edge function that all 8 Child Anthropic calls route through was returning `422 "Empty input"` on roughly 90% of invocations in the test window (~55 failures vs ~6 successes). Confirmed with a side-by-side comparison Jonathan pulled directly from Make's execution history: **the Anthropic call itself succeeded with a complete, valid response** (full JSON, correct schema, `stop_reason: "end_turn"`, no preamble or markdown fencing — the "prompt formatting mismatch" theory floated earlier in this session was wrong), but the paired "Parse Claude JSON" HTTP module's request body — built from Make's `{{callId.textResponse}}` convenience field — evaluated to an **empty string** even though the same response's raw `content[1].text` field held the full text. This is a Make.com "Anthropic Claude" app connector-level bug in how it populates `textResponse` for `claude-sonnet-5` responses specifically; nothing wrong with the prompts, the parser, or the model output itself.

**Fix:** in every one of the 8 Parse Claude JSON modules' `data` field, replaced `{{callId.textResponse}}` with `{{callId.content[].text}}` (raw content-array access, confirmed identical content, confirmed reliably populated). Jonathan applied and verified this manually on one pairing (Call 1 / module 501→502, character-based route) via Make's field picker before I mirrored the same change across the remaining 7 pairs in `Child (Unified)23`, generated via a scripted find-and-replace against the verified `v22` source (not hand-retyped — a first attempt at manually reproducing Jonathan's full pasted blueprint export introduced placeholder text in place of real prompt bodies, caught before it went anywhere, redone from source instead). Diffed `v23` against `v22`: exactly 8 field-reference changes plus the name label, nothing else.

**Left open:** why `textResponse` is unreliable for Child's calls specifically but was fine across all 7 of Parent's Sonnet 5 calls in the same test (100% success there) is not fully understood — possibly related to response size, call sequencing, or something else Make-side. Not blocking the fix, since `content[].text` sidesteps the question entirely, but worth revisiting if Parent ever shows the same symptom after real traffic.

## Correction 3 (same day): second test still failed on Calls 3/4 — real bug, not another Make quirk. Root-caused and fixed in `parse-claude-json` itself.

Re-tested `v23` on a fresh 4-character conversation: `content[].text` fixed most of it, but a residual failure rate remained, concentrated specifically on **Call 3 (Innocent Scripts)** and **Call 4 (Guilty Scripts)** — 50% and 75% failure respectively across two test runs (8 calls each), while Calls 1, 2, and 5 stayed reliable (0-12.5%). Tried a **pre-Parse delay** (2s `Sleep` inserted before each of the 8 Parse Claude JSON calls, in case of a Make bundle-materialization race) as `Child (Unified)24` — this did not help; the third test run was if anything worse (35% vs 20%), and the failure pattern by call position (C3/C4 bad, C1/C2/C5 fine, not a monotonic "later = worse" curve) already argued against a pure timing race.

Pulled the actual failing bundle: Alex's "Call 3: Innocent Scripts" had `stop_reason: "end_turn"` (complete response, ruling out `max_tokens` truncation — a theory raised and discarded in this same pass) and a fully valid-looking response, but the "Parse Claude JSON" step returned `422` with `"error": "JSON parse failed after all sanitization stages: Bad control character in string literal in JSON at position 3376 (line 5 column 921)"`. Comparing the raw response text directly: every paragraph break in the `round3Innocent` field used the correct two-character `\n\n` escape sequence, except one spot with a literal raw newline byte — Claude Sonnet 5 occasionally emits a real line break inside a JSON string value instead of escaping it, which `JSON.parse` correctly rejects. `parse-claude-json`'s existing sanitizer (code-fence stripping, `\'`→`'`, `''`→`'`, trailing-comma removal) had no stage for this.

**Fix, in `supabase/functions/parse-claude-json/index.ts`:** added a new sanitization stage, `escapeControlCharsInStrings()`, that scans the text character-by-character tracking JSON string-open/close state (respecting `\"` escapes) and escapes any literal control byte (`\n`/`\r`/`\t`) found *inside* a string into its proper two-character form — leaving structural whitespace outside strings untouched. That last part matters: a first attempt used a naive global regex replace (`s.replace(/[\n\r]/g, '\\n')` across the whole text), which broke on the response's own pretty-printing — real newlines between top-level JSON fields got escaped too, turning valid structural whitespace into literal `\n` text and producing a new parse error at position 1. Caught via a local test harness (not deployed blind): reproduced the exact real failure from Alex's actual response text, confirmed the naive version broke on it differently, rewrote as the string-aware scanner, and verified the corrected version against four cases — the real failing input (now parses, all 7 fields recovered including the previously-lost `round3Innocent`), already-valid compact JSON (unchanged), pretty-printed JSON with structural newlines (still parses), and an escaped-quote-inside-a-string edge case (string-boundary tracking doesn't get confused by `\"`). Deployed (`parse-claude-json` v6 → v7) and re-verified live against the exact real failing payload via a direct curl — `200`, all 7 fields recovered. This verification cost nothing in Anthropic spend; it's a pure Supabase-side test against already-generated content.

This is the real root cause behind the residual Call 3/4 failures — not a Make platform quirk like the `textResponse` bug, a genuine gap in the JSON-repair logic that any model could in principle have hit, just apparently more likely to trigger with Sonnet 5's response style than it was with Haiku. `Child (Unified)24` (the pre-Parse-delay version) is superseded — no blueprint change needed for this fix, since it lives entirely in the Supabase function both v23 and v24 already call. One more small end-to-end test still needed to confirm the overall failure rate actually drops now that this is live.
