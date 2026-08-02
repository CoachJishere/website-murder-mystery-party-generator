# ADR-0056: Align the question retargeter with the self-directed-question detector

- **Status:** Accepted
- **Date:** 2026-08-02
- **Related:** ADR-0047 (auto-remediation worker), ADR-0055 (detector RPC visibility)

## Context

ADR-0055 made gate-held (`needs_review`) packages visible to the ADR-0047 auto-remediation worker. The very next cron run proved it worked — `auto-remediate: 0 fixed, 1 escalated` where every previous run had logged `0 escalated`. But the worker still could not repair the package it had just been given:

```
retarget_questions:round4_questions|redetect_still_flagged|reverted
```

Root cause: a **third** instance of this codebase's recurring failure — two predicates that must describe the same concept, drifting apart because only one was ever updated.

| | Pattern | `**To Captain Kei:**` | `**To Polly Paradise (self):**` |
|---|---|---|---|
| Detector (`list_packages_with_self_directed_questions`, and the same test inside `package_completion_blocking_defects`) | `'\*\*to ' \|\| name \|\| '\M'` | matches | **matches** |
| Retargeter (`retargetQuestions`, `auto-remediate-packages/index.ts`) | `(\*\*\s*To\s+)<name>(?=\s*:?\s*\*\*)` | matches | **no match** |

`\M` is a word-END boundary, so a trailing ` (self)` annotation does not stop the detector. The retargeter's lookahead `(?=\s*:?\s*\*\*)` cannot cross that annotation. So the model's occasional `(self)` habit produced a defect that was detectable but unrepairable.

The consequence was worse than a stall, because **revert is all-or-nothing per package**. The worker successfully retargeted Captain Kei, re-ran the detector, found Polly still flagged, and rolled back *both* edits — discarding a valid repair for one character because a different character in the same package was unfixable.

Observed live on package `33671764-71f9-488a-bed7-9afc712b0051` (paid), 2026-08-02.

## Decision

Extract the annotation into one named constant and use it in both places `retargetQuestions` reasons about a target name:

```ts
const TARGET_ANNOTATION_RX = String.raw`\s*(?:\([^)]*\))?`;
```

1. **The retarget matcher** now consumes the annotation rather than looking past it:
   `(\*\*\s*To\s+)<name>${TARGET_ANNOTATION_RX}(?=\s*:?\s*\*\*)`.
   Consuming matters — a lookahead would leave the annotation attached to the *new* target, turning `**To Polly Paradise (self):**` into `**To Captain Kei (self):**`, which is both a false claim about Captain Kei and still reads as self-directed.
2. **The already-targeted scan** stops its capture before `(` so an annotated target registers as "this person is already questioned this round" under their real name, instead of as a distinct person called `X (self)` — otherwise the candidate pool could hand back someone the round already asks about.

Add `scripts/__tests__/retargetQuestions.test.mjs`, which reads `TARGET_ANNOTATION_RX` **out of the live source** (rather than restating it) and asserts the one-directional invariant that actually matters:

> whatever the detector flags, the retargeter must be able to repair

A retargeter matching *more* than the detector is harmless — those shapes never reach the worker. Matching *less* is the deadlock. The script exits non-zero on a violation.

## Rationale

- **The invariant, not the instance.** Patching the `(self)` case alone would have left the next annotation variant to rediscover the same way — via an escalation on a paying customer's package. The check encodes the property.
- **Read the pattern from source.** A verification script that restates the regex passes happily while the source drifts; that is precisely how these three bugs survived. Extraction makes drift a failure.
- **One-directional invariant, deliberately.** Asserting strict equality would have failed on a harmless asymmetry (see Known gaps) and pressured a future maintainer to loosen the detector to make a test go green — the wrong direction for a predicate that gates completion.

## Alternatives Considered

- **Widen the retargeter to match anything the detector does.** Rejected: the detector currently over-matches in one case (prefix names, below). Blindly matching it would make the retargeter rewrite legitimate questions — corrupting paid content rather than stalling it.
- **Tighten the detector to exactly mirror the retargeter.** Deferred, not rejected — it is the natural fix for the prefix false positive, but it also *reduces detection* (e.g. `**To Captain Kei, the photographer:**` is caught today and would stop being caught). That is a real detection-vs-false-positive trade-off deserving its own decision, and it is not reachable in production today.
- **Make revert partial (keep the fixes that worked).** Rejected for now, and explicitly not bundled. It is arguably the deeper bug — one unfixable character discarded a valid sibling fix — but partial application means a package can end up half-repaired with no record of which half, and that needs its own design. Filed as open.

## Consequences

- The worker can now repair the annotated form, so packages carrying it self-heal instead of escalating.
- The all-or-nothing revert no longer discards sibling fixes *for this cause* — but the mechanism is unchanged and will do the same thing for any other unrepairable class in a mixed package.
- `scripts/__tests__/retargetQuestions.test.mjs` is a manual check, not CI-enforced (the repo has no test runner). It must be run when either predicate changes. Wiring it into CI is worthwhile and not done here.
- **Retargeting is label-only, and that limitation is now visible.** For Captain Kei the tool produces `**To Coconut Chris:** 'You were supposedly at the harbor photographing a sunset installation...'` — mechanically correct (no longer self-directed) but semantically wrong, since the harbor alibi is Kei's, not Chris's. ADR-0047 accepted this trade for determinism. It is why the live customer's package was hand-edited rather than left to the worker. Bodies that name their target's own facts are a candidate for ADR-0054's child-content regenerator.

### Known gaps — reproducible, reported by the script, deliberately not fixed

1. **Prefix names.** A character literally named `Polly` matches inside `**To Polly Paradise:**` because `\M` only anchors the end. That is a detector false positive *and* unrepairable (the retargeter correctly refuses to rewrite a legitimate question). Verified 2026-08-02: **zero** production packages have a character whose name is a prefix of another's, so this is latent. Fixing it means the deferred detector-tightening above.
2. **Multi-space.** The detector hardcodes a single space (`'\*\*to '`) while the retargeter uses `\s+`, so `**To   Marina Splash:**` is never detected at all. Undetected means no deadlock, but also no repair.

Both print as "known gaps" in the verification script so they are not rediscovered as incidents.

## Key files

- `supabase/functions/auto-remediate-packages/index.ts` — `TARGET_ANNOTATION_RX`, `retargetQuestions` (deployed v4)
- `scripts/__tests__/retargetQuestions.test.mjs` — the invariant check
- `public.list_packages_with_self_directed_questions()` — detector RPC (the other half of the pair)
- `public.package_completion_blocking_defects()` — carries the same `\M` test at the gate
- `docs/adr/0055-widen-detector-rpcs-to-gate-held-packages.md` — made this reachable

## Discussion

Three instances of one bug in a single day is the real finding. Concept-snapshot vs extractor, completion gate vs detector RPC, detector vs retargeter — each is a pair of predicates that must agree about one concept, written in different languages (TS regex vs Postgres regex), living in different files, updated one at a time. Every one failed silently and was caught by a customer or by chance rather than by a check.

The specific regex change here is trivial. The verification script is the actual deliverable, and the decision to have it read the pattern out of the source instead of restating it is what makes it more than decoration.

The judgement call was how strict to make the assertion. Equality was tempting and would have caught more — but it fails on the multi-space asymmetry, which is harmless, and the path of least resistance for a future maintainer facing a red check is to loosen whichever side is easier. Loosening the detector is exactly the wrong move for something that gates a paying customer's completion. The one-directional invariant is weaker on paper and much likelier to survive contact with a hurried afternoon.

Leaving the prefix gap open was deliberate rather than lazy: fixing it trades detection for fewer false positives, and ADR-0053 already established that the bar for "block on this" is higher than for "alert on this." That trade deserves an explicit decision with its own evidence, not a quiet ride-along on a regex fix.
