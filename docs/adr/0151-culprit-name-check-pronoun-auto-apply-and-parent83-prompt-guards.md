# ADR-0151: Full-name culprit check on printed evidence cards, pronoun fixes auto-applied, and two Parent prompt guards (Parent83)

**Status:** Accepted (the check, the digest line and the setting are live 2026-10-12; **Parent83 imported by Jonathan 2026-10-12 and verified through the Make API**: live scenario 9106101 is named Parent83 and carries the 4 overview edits and the 1 card edit, none of the old wording; not yet exercised by a real purchase)
**Date:** 2026-10-12
**Related:** ADR-0035 (evidence cards must not name the culprit), ADR-0042 and ADR-0053 (why the surname detector stayed advisory), ADR-0149, ADR-0150, ADR-0103 Addendum 89

## Context

Jonathan asked, after the Dutch "Tijdcapsule Klas '96" sweep: should these defects have been caught already, and what catches them automatically in future (stronger prompts or detectors)? Each class was traced to the layer that should have stopped it:

| Defect | Should it have been caught? | What existed | Gap |
|---|---|---|---|
| Round 4 evidence card named the murderer | Yes | A prompt rule ("must NEVER name the murderer", in Parent since Parent45) and an SQL detector (`evidence_culprit_spoiler`) | The model copied the name out of a master_context clue line ("Bas asked Daan ...") into a quoted note. The detector matches the SURNAME only: 3 of its 4 hits since August were a victim's family or business, so it stayed advisory and nothing read it |
| Overview read aloud revealed hidden secrets (Swedish package) | Yes | The reviewer found it (secret_leak) | The Game Overview prompt asks paragraph 2 for "a few notable characters and their compelling motives" with no rule against hidden motives; `secret_leak` is not auto-applied |
| French victim called "un homme" / "il" though gender-neutral | Yes | Child54's victim-pronoun rule (supposedly fixed at source); the reviewer found 7 of 7 | `pronoun_drift` was not in the auto-apply classes |
| Customer's climax and quirks missing from every sheet | No layer could see an absence | none | Fixed by ADR-0150 |
| Round 2 and 3 script-vs-card cue mismatch | Partly (reviewer caught 1 of 2) | Reviewer documents item | Semantic; second pass (ADR-0150) improves recall; no detector is reliable |
| Danish garbled header | Yes (reviewer caught it) | Reviewer, empty replacement | Languages outside the language pack (da, sv, fi, ko, ja, zh) have no canonical headers, so a corrupted label has nothing to be restored from |
| English scaffolding, arrest line naming the victim | No: by design, and generated before Parent77 | n/a | none |
| Fact slips, a stray combining accent, one formal "u" | Low value | second pass, reviewer | not worth a detector (cosmetic or semantic) |

## Decision

1. **Culprit-name check (deterministic).** `culpritNameHits` (review-core.ts) matches the FULL name of every murderer and accomplice, in every spelling of a dual name, against the printed evidence text only (host-only sections stripped), detective style only. It runs inside the daily open-findings email (ADR-0149) and adds a high line "A printed evidence card names the culprit". It never edits or holds anything. Over the 81 detective packages since 2026-08-01 it reports exactly 2 hits, both genuine ("a vehicle registered to Marina Splash", "recovered from Jasper Gold's device"), with no false positive (the surname detector would have fired on Whitfield and Ashworth, family names). The Dutch card is already fixed so it no longer appears. The two old hits are packages delivered in August and are left as they are unless Jonathan wants them neutralised.
2. **`pronoun_drift` added to the auto-apply classes** (`review_auto_apply_classes`). Evidence: 7 of 7 French replacements read and correct (applied via `apply_open` and verdicted), 11 of 12 earlier on Boogie Nights; every replacement is a minimal edit of the quoted span. Revert-on-new-defect and customer-wording guards still apply.
3. **Parent83 (imported 2026-10-12)** from Parent81, two exact-substring prompt edits (`temp-files/build-parent83-overview-secrets-and-card-names.py`, path-by-path diff verified: 4 overview modules, 1 evidence-card module): (a) the Game Overview's paragraph 2 may describe characters only by public role, public relationships and visible tension and must never state or hint at a hidden secret, motive, wrongdoing or secret love; (b) the evidence-card rule now says master_context clue lines may name the culprit and that name must never be copied, even inside a quoted note, label, signature or document line. Parent82 was proposed and declined in ADR-0148 and never built, so the number is 83.

## Rationale

- Every item that the machinery should have caught was already seen by something; what was missing was an action or a precise enough check. Fixing the check (full name instead of surname) and wiring it to the email removes the false positives that kept it advisory without gating a customer.
- The two prompt guards are cheap and aimed at the proven cause; they cannot be tested without a purchase, so they ship as an import Jonathan controls, with the post-import watch below.

## Alternatives considered

- **Promote the existing surname detector into the gate.** Rejected: 50 percent false positives (ADR-0042).
- **Auto-neutralise the culprit name in the card.** Rejected for now: the replacement ("someone", "one guest") is language-specific and sometimes needs the sentence rewritten; a finding plus the existing hand fix is safer.
- **A detector for secrets in the overview.** Rejected: semantic. The prompt guard plus the reviewer is the layer.
- **Extend the language pack to Danish and Swedish.** Not built; it is a Child blueprint change with native-speaker review needed (the Dutch pack has had none). Listed as the next structural item.

## Consequences

- **Post-import watch for Parent83 (after Jonathan imports it):** on the next detective purchase confirm (a) no printed evidence card names the culprit, including inside quoted notes (the digest check will say); (b) the Game Overview paragraph 2 names no hidden secret, motive or wrongdoing; if either recurs the prompt change did not hold. Kill switch: re-import Parent81.
- Not built: carrying the customer's requirements into every Child call at generation (ADR-0150 follow-up), a Danish/Swedish language pack, auto-neutralising card names.

## Key files

`supabase/functions/review-package-quality/review-core.ts` (`culpritNameHits`, `nameVariants`, `printedEvidenceText`), `index.ts` (`openDigest`), `review-core.test.mjs`, `temp-files/build-parent83-overview-secrets-and-card-names.py` and `temp-files/MM Live - Parent83 (Overview No Secrets, Card No Culprit Name).blueprint.json` (gitignored local copies).

## Decisions on the leftovers (Jonathan, 2026-10-12, taking the recommendation)

- **The two older packages that name a culprit on a printed card (Aug 1 "The Case Of The Stolen Golden Flamingo", Aug 14 "Sunset Songs: The Stolen Spotlight") are left as delivered.** Reason: the parties were most likely played two months ago, an unsolicited edit to old deliveries adds risk for no clear gain, and the daily check now stops this for new packages. Revisit only if a customer comes back.
- **Tom's "jawuhl meine Führer" line is not added to the Dutch package.** Reason: a Nazi-parody quip in a printed script; the other five filler sayings carry the customer's intent. Add it with one edit if the customer asks.
