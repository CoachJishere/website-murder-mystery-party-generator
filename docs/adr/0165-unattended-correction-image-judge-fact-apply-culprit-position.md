# ADR-0165: Unattended correction - evidence-image judge and re-roll, guarded auto-apply of cross-sheet fact findings, culprit-position rule

- **Status:** Accepted 2026-10-16 (Jonathan: "evidence images - yes ... vision call is fine"; "re read and see why it was turned off and if we should turn it back on"; "yes to new child version")
- **Date:** 2026-10-16
- **Related:** ADR-0163 (making manual sweeps unnecessary; Addenda 6, 7, 10), ADR-0138 (review-before-release), ADR-0152 (cross-sheet passes), ADR-0156 (observer sentences), ADR-0103 Addendum 104 (the sweep that motivated this), ADR-0017 (Flux evidence images)

## Context

The sweep of "Till Death Do Us Part-y" (ADR-0103 Addendum 104) found about 41 real defects in one 23-character package. The machinery fixed 11 unattended (27 percent), found 12 more and left them open, and never saw 18. Two of the three evidence images that Parent85 was meant to make clean had gibberish pseudo-handwriting; nothing in the system looks at an image after it is generated, so only a human sweep and a manual re-roll caught it.

Three gaps are cheap to close and each has its own cause:

1. **Images are never judged.** `generate-evidence-images` generates once. Flux turns "handwriting" into pseudo-words, and a document card is exactly where that shows. Standing practice (up to 2 manual re-rolls, about 0.04 USD each, judged by looking) works; it only needs a looker that is not Jonathan or me.
2. **Found-but-left-open findings.** The `+fact` cross-sheet pass produced 6 findings on this package, 5 real and 1 debatable, each with a concrete replacement. ADR-0163 Addendum 10 stopped them being applied automatically because the pass had "about half precision" on the first 3 packages (6 of 11 real, 10 of 11 real or debatable) and its replacement can target another sheet. The enforcement before Addendum 10 was only call order.
3. **A culprit's position named in Round 1 or 2 sheet text** (3 spoilers in the sweep). The leak probe skips sentences from characters it judges to have a legitimate way of knowing, and a sighting of the murderer is legitimate in Round 4 and a spoiler in Round 1. The probe has no notion of rounds for its owner's role.

A fourth, the Child prompt, is the source of the culprit-position rule and of the wrong-position claims (Child66 redaction). That is a separate Make import (Child68), described in Decision 4.

## Decision

**1. Evidence-image judge and re-roll, before the customer sees it.**
- A vision call (Claude Haiku 4.5, about 0.003 USD per image, `IMAGE_JUDGE_MODEL` override) judges each of the three images against that round's evidence card description. It fails an image that has pseudo-words or garbled lines of text, a watermark or logo, or a main subject that does not match the card. A legible real heading word is fine.
- It runs inside the review-before-release hold (`releaseQueue`), concurrently with the review, so it adds no wall-clock time and never delays a customer by more than a bounded budget (120 s). On the first failing image of a round it asks the judge for a rewritten prompt (no letters except at most one short printed heading) and re-rolls through `generate-evidence-images`, up to 2 re-rolls per round (the standing yes), keeps the best-scoring candidate, and restores it if a later re-roll is worse. A round that still fails after 2 re-rolls ships the best candidate and sends Jonathan one alert (a package is never held for an image).
- Cost is logged in `auto_remediation_log` (`defect_class = evidence_image`). Kill switch: `pipeline_settings.image_judge = off`. Modes `judge_images` (dry run by default) allow checking a delivered package by hand.
- Prevention, free: `generate-evidence-images` v16 appends a fixed suffix to every prompt (no readable handwriting, no watermark; writing as abstract scribble or at most one short printed heading), so fewer images need the judge at all. No Make import.

**2. `+fact` findings are applied automatically, behind a setting, with extra guards.** New `pipeline_settings.review_apply_fact_findings` (default `off` in code; recommended `on` below). When `on`, the second pass applies open `+fact` findings through the same `autoApply` path as the main review, which already requires the quoted span exactly once in the named field, a sane replacement, no customer-typed wording, a language allowed for auto-apply, and a revert if the change introduces a blocking defect. Added: only `+fact` (never `+leak`, whose replacements can delete content and whose "debatable" shape is a character who legitimately knows), a replacement must be non-empty, at most 8 per package, and findings are marked `applied` so the passive check in CLAUDE.md changes from "applied must be 0" to "applied count and verdicts are read on every sweep". Addendum 10's allowlist stays the default; the setting only widens it.

**3. Culprit-position rule in the leak probe.** `LeakCandidates` carries the owner's role (`character_role`); for a murderer or accomplice owner the instructions say: a sentence in a Round 1 field (`introduction`, `rumors`) or a Round 2 field (`round2_*`) that places the owner at or near the crime scene or away from their stated alibi is a leak, even as a plain observation; the same sentence in a Round 3 or 4 field is allowed. No extra model calls (same retrieval, same call per owner, a longer instruction). Validated by replaying the original Till Death sheets through `leak_probe` with `overrides` (about 0.15 USD, once).

**4. Child68 (Make, Jonathan imports).** Two sentences appended to the existing "POSITIONS AT THE KEY MOMENT" bullet of the three detective Call 1 modules (401, 405, 409): a character knows where only the characters in its own `keyMomentPositions` were and says nothing about anyone else's location, and where other people were is a Round 4 topic (never in the introduction, the rumors or the Round 2 and Round 3 questions). Built as `temp-files/build-child-v68.py` on top of Child67; rollback is re-importing Child67. *(The first draft of this decision, "give every innocent everyone's public position", was dropped: the redaction deliberately limits each character to what it could see, so the wrong claims are a character writing about someone outside its map, not missing data; and the Child cannot be told "the culprit's position" because redaction hides who the culprit is.)*

## Rationale

- Judging an image is a narrow, cheap, objective question, so a model can do it and the cost is about 0.01 to 0.03 USD per package plus 0.04 per re-roll that is actually needed. The manual loop already works; this removes the human.
- Re-use over new machinery: the image step sits where the pointform resync already sits (pre-release, logged, capped); the fact apply path is the main review's, not a new one.
- `+fact` precision: 18 cross-sheet probe findings judged so far, 12 real, 5 debatable, 1 false. A debatable finding applied is a harmless re-wording toward the other sheets; a false one is caught by the revert guard only if it creates a blocking defect, which is why the setting exists and the guards were added.
- Cost per mystery: image judge about 0.01 to 0.03 USD, re-rolls about 0.04 each and not every package, `+fact` apply 0 USD (no model call; at most one existing 0.05 USD pointform resync per touched character), leak-probe rule 0 USD. One-off validation about 0.2 USD (3 image judges plus 1 re-roll plus 1 leak replay). Compare: typical paid remediation per package since 2026-10-06 is about 1.0 USD median (max 2.4 USD on the 23-character package); orders are 19.99 to 24.99 USD.

## Alternatives considered

- **Wait for more sweeps** to measure before building: rejected for images (the failure is deterministic and the fix is cheap) and for the leak rule (zero marginal cost). Kept for `+fact` as a switch rather than a code change: the default stays `off` until Jonathan says `on`.
- **Judge images after release** (like `+p2`): rejected, the customer would already have seen the bad image ("right on the first try when customer sees it").
- **Image judge in Make or in `generate-evidence-images`**: rejected, it would put re-rolls (30 to 60 s each) inside Make's HTTP call, which has timed out before (ADR-0016).
- **Apply `+leak` findings too**: rejected for now; their replacements often remove content and the probe's own false-positive shape is a character who may legitimately know.
- **Roll back Child66**: rejected, see Addendum 104: redaction prevents spoilers, which cost the customer the game; the cost (wrong positions) is medium and the reviewer catches about two thirds of it. Child68 attacks the cost at its source instead.

## Consequences

- A new paid call per package (vision judge), inside the existing 10 USD daily cap and the same log.
- Images: the customer should not see pseudo-handwriting on a document card unless 2 re-rolls fail, in which case Jonathan is alerted.
- If `review_apply_fact_findings = on`, a `+fact` replacement can edit a delivered package after release, as `+p2` already does; every edit is a row in `package_review_findings` (status `applied`, the quote and replacement are stored) and can be reverted by hand.
- The sweep's culprit-position hand check (CLAUDE.md step 6 (d)) stays until the leak rule and Child68 have each produced 3 clean packages.

## Key files

`supabase/functions/review-package-quality/image-judge.ts` (+ test), `index.ts` (hook in `releaseQueue`, `judge_images` mode, `+fact` apply), `review-core.ts` (`isAutoApplyReview`), `leak-probe.ts` (+ test), `supabase/functions/generate-evidence-images/index.ts` (v16 suffix), `temp-files/build-child-v68.py` (not committed, gitignored), `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addendum 104).

## Update 1 (2026-10-16, same day): what was built, what the validation showed, what changed from the plan

**Built and deployed** (`review-package-quality` v36 to v42 as iterated, `generate-evidence-images` v22 and v23; both `verify_jwt` true; `npm run test:reviewer` passes, 7 new tests): the image judge and re-roll in the release queue (`mode: judge_images` for manual runs, kill switch `pipeline_settings.image_judge`), the `+fact` apply switch (`review_apply_fact_findings`, default `off`, no row written), the culprit-position rule in the leak probe with culprit owners served first, and `overrides` replay on the leak probe. Child68 built, not imported.

**Image judge, what the validation changed.**
- Haiku 4.5 with a plain "is there gibberish text" question passed both bad images (it read pseudo-handwriting as real words). Forcing a literal transcription before the verdict fixed it: 5 of 5 known images judged correctly, about 0.004 USD per image, 0.012 USD per package.
- Flux has no negative prompt, so any mention of writing in a re-roll prompt (even "no words", "ink bars", "ruled lines") invites pseudo-words: 5 of 5 such re-rolls failed. A prompt that describes only what is visible (a crumpled page from its blank reverse side, stains, a pen) was clean. The re-roll prompt is therefore the judge's description with every sentence that mentions writing dropped in code, plus "Every surface is plain, unmarked and blank." A document card now comes out as a clean prop photo, not a readable list; that trade is deliberate. A chart or plan is drawn as circles and outlines.
- The word "lipstick" is rejected by Flux as NSFW twice; replaced by "red ink" in code, and a false NSFW rejection is retried once at safety tolerance 4.
- **Stale reads:** after a re-roll overwrote the file at the same path, a download through the storage client returned the old bytes (identical hashes), so the judge re-judged the old image three times. Downloads now use the authenticated storage endpoint with a unique query string, and each attempt's short hash is stored in the report. A re-rolled image also gets `?v=<time>` on its URL in `evidence_card_images` so no CDN copy of the old file is served.
- End to end on the real Till Death round 2 (original gibberish image restored first): original fail, re-roll 1 fail (the judge's own verdict: subject not matching), re-roll 2 pass; the image kept is a clean crumpled stained page. Cost 0.10 USD per run with two re-rolls (4 runs during development, about 0.4 USD).

**Leak probe, culprit-position rule.** Replaying the original (pre-edit) Till Death sheets through the paid probe (0.16 USD, in memory only): first attempt 0 findings; the model followed the rule when given Zoya's candidates directly, so the cause was the 120-sentence total cap served alphabetically (a murderer named Zoya came last). After serving culprit owners first, the replay returns 3 findings: Baron's introduction and Lulu's Round 2 question (both high, the replacement removes only the observation) and the baby leak. It still misses Lulu's Round 1 rumor (the sentence does not name Zoya, so retrieval never offers it): 2 of the 3 spoilers caught, which is why Child68 stays the primary fix.

**Auto-apply of `+fact`: why it was turned off, and the recommendation.** Addendum 10 turned it off because (a) the first 3-package probe showed about half precision (6 real of 11, 10 of 11 real or debatable, 1 false), (b) a replacement can target another sheet, (c) "never auto-applied" held only by call order. Since then: 6 more `+fact` findings, 5 real and 1 debatable, 0 false (pooled with the `+leak` ones: 18 findings, 12 real, 5 debatable, 1 false). (c) is fixed by the allowlist; (a) and (b) are bounded by the new guards (`+fact` only, non-empty replacement, at most 8, same exact-quote and revert guard as the main review). Recommendation: switch it on. It stays `off` until Jonathan says so (`insert into pipeline_settings (key,value) values ('review_apply_fact_findings','on') on conflict (key) do update set value='on'`; off again the same with `off`). The sweep reads every applied `+fact` finding in context and records the verdict, so the precision of the applied set is measured from the first package.

**Cost per mystery (new, on top of today).** Image judge 0.012 USD, plus 0.04 USD per re-roll actually needed (0 to 0.08 per package); `+fact` apply 0 USD of model calls (at most the existing 0.05 USD pointform resync per touched character); leak rule 0 USD (same call, a longer instruction, the culprit-first order changes which sentences are sent, not how many). So about 0.01 to 0.1 USD per package; the 1.2 to 1.5 USD in the first proposal was the one-off cost of validating a reviewer prompt change on three packages, not a running cost, and was not what happened: the validation actually cost about 1.1 USD in all, once, during development (4 image-loop runs 0.4, 3 paid leak replays 0.46, judge tests 0.04, direct image tests about 0.12, one single-owner model call 0.02), and none of it recurs per package. Baseline for comparison: paid remediation since 2026-10-06 is median 1.06 USD per package (mean 0.96, p90 1.73, max 2.40 on the 23-character package), almost all of it the reviewer and its probes.

**Not done.** `+leak` auto-apply (decided against, above); a no-redaction comparison for the Child66 cost; the Child68 measurement (two detective purchases: count wrong position claims and early pointers against the Addendum 104 baseline of 17 and 3).

## Update 2 (2026-10-16, later the same day): switched on

Jonathan: "turn on auto apply, child 68 imported". `pipeline_settings.review_apply_fact_findings = 'on'` (written 08:09:50 UTC, verified in the table) and Child68 logged in `prompt_version_history` (version 68, `effective_from` 08:09:49 UTC, `approximate = false`). Off switch for the apply: set the value to `off`. Rollback for Child68: re-import Child67. First measurements: applied `+fact` findings and their verdicts on the next 5 packages (a wrong applied edit, or two debatable ones in one package, means `off`); wrong position claims and early pointers on the next 2 detective packages created after 08:09 UTC against the baseline of 17 and 3.
