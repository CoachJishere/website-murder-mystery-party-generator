# 0038 — Cast size is fixed at generation; surplus guests join as co-investigators

**Status:** Accepted
**Date:** 2026-07-19

## Context

A paying customer (detective-style mystery, 20-character cast) emailed asking to "update the number of characters" so she could invite more guests. The product cannot add or remove characters after generation — the cast is authored into the plot (motives, alibis, evidence, the predetermined culprit/accomplice). Editing is content-only.

An audit of the whole product surface found that **this constraint is communicated nowhere**:

- The purchase-page "Important Notes" list said nothing about cast size being fixed.
- The FAQ actively cut the other way — *"Every part of your mystery is fully editable after generation"* — which a buyer reasonably reads as including cast size.
- The post-generation editing UI has no add/remove-character affordance but never explains why.
- The Host Guide had no guidance for when the guest count doesn't match the character count.

The only pre-existing "extra guests" guidance was two lines of marketing copy (homepage + support FAQ) promising *"you can host extra guests as detectives if your group grows"* — aspirational, absent from the operational guide, and (as written) dangerous.

**The spoiler trap:** the first-drafted fix told hosts to hand extra guests "the detective materials." The **detective script contains the solution — it names the culprit at the end**, because the detective role knows who did it. Handing it to a guest spoils the game. This is the same class of bug as ADR-0035 (evidence cards must not name the culprit): host-facing material must never leak into player hands.

## Decision

1. **Cast size is a fixed property of a generated mystery.** Characters are editable; the count is not. Changing the count requires regenerating the mystery. This is now stated, not implied.

2. **Surplus guests join as "co-investigators" on the lead detective's team** — the sanctioned, in-fiction way to host more guests than characters. Chosen over "amateur investigators / sleuths": co-investigators is story-coherent (a lead detective with a team), flattering rather than second-tier, and it *explains in-world* why they don't hold the full case file (need-to-know), so the spoiler protection is part of the fiction rather than an out-of-character warning.

3. **Co-investigators receive investigation materials only** — clues and evidence, the ability to question suspects, and a vote at the reveal. They receive **neither the detective script nor the host guide**. The lead detective (usually the host in detective-style; the host or a character in character-based) keeps the case file. This is a hard rule.

4. **Fewer guests than characters:** never cut the culprit/accomplice; drop only purely-innocent suspects (fold their facts into another guest or have the detective mark them "unavailable"); regenerate if many drop out. (Complements the guest-dropout feature in ADR-0036.)

5. **Communicate the constraint at every touchpoint:** purchase-page notes, the "can I edit" FAQ, the Host Guide (new "Managing Last-Minute Guest Changes" section), and an inline note in the character-editing tab.

## Rationale

The customer was never told the count was fixed, so the fair response is (a) deliver the workaround we already advertise, and (b) offer a one-time free regeneration if they genuinely need a different suspect count. Making the constraint explicit everywhere prevents the same support ticket recurring and removes the misleading "fully editable" promise. The co-investigator framing turns a "no" into delivering a feature.

## Alternatives Considered

- **"Amateur investigators / sleuths"** — rejected: diminishing, and doesn't fit the story. The founder flagged it as not making narrative sense.
- **Let hosts add characters in-app** — rejected: a character isn't a form row; it must be woven into every other character's motive/alibi/evidence and the predetermined solution. Post-hoc insertion would produce incoherent mysteries.
- **Regenerate-only (no co-investigator route)** — rejected: forces rework and downloads on the customer for the common "a couple more guests showed up" case that needs no story change.
- **Say nothing, handle per-ticket** — rejected: the audit shows the silence *is* the problem; "fully editable" was setting the wrong expectation at scale.

## Consequences

- English copy updated in 4 places; **12-language translation is a follow-up batch** (per the i18n workflow) — until then non-English users see the pre-existing copy.
- Support gains a canonical answer; the reply template lives with this decision.
- Any future "surplus guest" or "role" copy must obey rule 3 (never route host-only/solution material to guests) — see [[feedback_detective_script_spoils_solution]] and ADR-0035.

## Key files

- `src/i18n/locales/en.json` — purchase "Important Notes" (`purchase.notes.items`), `canIEdit` FAQ answer
- `src/components/HostGuideTemplate.tsx` — new "Managing Last-Minute Guest Changes" section
- `src/components/MysteryPackageTabView.tsx` — inline note in the characters tab
- Related: ADR-0035 (evidence cards must not name the culprit), ADR-0036 (guest-dropout adaptation)

## Discussion

The debate turned on two things. First, *label*: "sleuth/amateur" vs "co-investigator" — settled on co-investigator because it fixes both the tone problem and the spoiler problem at once (the fiction justifies withholding the case file). Second, *how far to go for the customer*: since immutability was never communicated, we lead with the free advertised workaround and hold regeneration as a goodwill backstop rather than the default — the customer's actual need (more guests, not a different plot) is fully met by co-investigators, and her mystery is detective-style so she is already the lead detective holding the script.
