# 0035 — Player-facing evidence cards must not name the culprit

## Status
Accepted — 2026-07-18

## Context
Printed evidence cards are shown to **all** players, one per round, during a game. Each generated evidence card has a player-facing portion (the `#### DESCRIPTION` prose, plus a paired forensic image) and a host-only portion (`#### SIGNIFICANCE (Host Only)`). The print pipeline ([src/utils/evidenceCardUtils.ts](../../src/utils/evidenceCardUtils.ts) → `parseEvidenceCards` → `stripSectionsForPrint`) is supposed to strip the host-only material so only the description reaches the card.

Two defects were found while reviewing *Whispers From The Void*:

1. **Content defect (generation):** the generator frequently writes the **culprit's name into the player-facing DESCRIPTION** — e.g. "the poison was found in *Silas/Sylvia's* quarters", "the only suspect unaccounted for that window: *Victoria Ashworth*". Reading a round-3 card then hands players the answer, collapsing the deduction two rounds early. An audit of 35 completed `detective` (predetermined-culprit) packages found the culprit named in player-facing evidence text in **~8 live cases** (packages with evidence images that actually print) plus ~5 latent (named, but no images generated yet so nothing prints).

2. **Code defect (strip regex):** `PRINT_STRIP` only matched **4-hash** headings (`#### Significance`). Older "blueprint" evidence formats use **3-hash** headings (`### IMPLICATIONS`, `### VISUAL DESCRIPTION (FOR IMAGE GENERATION)`). Those sections — including the AI-image prompt and text that spelled out the deduction ("Only one person with those initials has no alibi") — leaked straight onto the printed card.

Random-slip (`character`) mysteries are unaffected: the culprit is drawn secretly at the table, and their evidence works differently. This concerns predetermined (`detective`) mysteries.

## Decision
1. **Contract:** the player-facing evidence DESCRIPTION must never name (or uniquely pinpoint) the culprit or accomplice. It may carry *deductive breadcrumbs* — shared initials ("S.C."), matching handwriting, a timeline gap, an unnamed "one suspect" — but the name lives only in the host-only SIGNIFICANCE.
2. **Code fix:** broaden `PRINT_STRIP` from `^####` to `^#{2,4}` so 3-hash host-only/interpretation headings (Implications, Visual Description, What This Reveals, Who It Implicates, Discovered, Significance) are stripped on every format.
3. **Data fix:** neutralise the ~8 live existing packages (and Whispers) by editing only the printed DESCRIPTION prose in `mystery_packages.evidence_cards`, replacing culprit names with neutral descriptors while preserving the breadcrumbs; host-only SIGNIFICANCE left untouched.
4. **Generation guardrail:** add an explicit rule to the Make.com evidence-card prompt (see `docs/evidence-card-generation-guardrail.md`) so new mysteries never write the culprit's name into the player-facing description.

## Rationale
- The bug directly defeats the product's core loop (deduction across rounds). It is high-impact and was invisible because the name sat in prose that *looks* like neutral description.
- Fixing in the **frontend strip + data** is retroactive and cheap; the **prompt guardrail** stops recurrence at the source. All three are needed — code alone doesn't fix prose that names the culprit in a *kept* DESCRIPTION; prose edits alone don't fix future generations or the 3-hash leak.
- Neutralising in place (vs regenerating) preserves the rest of each hand-tuned package and costs no LLM spend.

## Alternatives considered
- **Regenerate the affected packages.** Rejected: expensive, non-deterministic, and would churn otherwise-good content; the offending text is a small, surgical span.
- **Hide evidence cards from players entirely / host-only.** Rejected: the shared reveal each round is a core game mechanic.
- **Only fix the generation prompt, leave existing packages.** Rejected: existing predetermined mysteries would keep spoiling themselves.
- **Strip the inline `**What it reveals:**` bold label too.** Deferred: it's not a heading, stripping inline labels is fragile, and observed instances describe the victim, not the culprit. Revisit if a case names the culprit there.

## Consequences
- Printed cards for predetermined mysteries now withhold the culprit's identity; the host still gets it via the SIGNIFICANCE block and the host guide.
- Every blueprint-B mystery's printed card also loses its leaked AI-image prompt and implications text (a latent quality win beyond the spoiler fix).
- New risk surface: the audit is heuristic (surname/first-token matching with host-only stripped); it can miss a culprit referred to only obliquely, or over-flag shared surnames. The generation guardrail is the durable guarantee; the audit is a backstop.
- Follow-up: the ~5 latent (no-image) packages are left as-is for now — they don't print. If evidence images are ever generated for them, re-run the neutralisation first.

## Discussion
The key trade-off debated was **how much breadcrumb to leave**. Stripping every pointer makes the mystery unsolvable; leaving the name makes it trivial. We landed on "gettable, not obvious": keep cross-round links a sharp player can chain (initials + matching handwriting + a lone timeline gap) but never state the name on a card. The *Whispers* round-4 note originally read "S.C. repositioned the crystal ball" — initials *on the murder action* — which we softened to an unattributed "crystal ball repositioned", keeping the subtler "S.C." only in the round-2 journal. That calibration is the template for the contract above.

## Key files
- `src/utils/evidenceCardUtils.ts` — `PRINT_STRIP` (strip contract), `parseEvidenceCards`
- `mystery_packages.evidence_cards` (jsonb) — per-package printed evidence content
- `docs/evidence-card-generation-guardrail.md` — the prompt rule for Make.com
- `src/components/HostGuideTemplate.tsx` — predetermined vs random-slip framing
