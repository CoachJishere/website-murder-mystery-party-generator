# Evidence-card generation guardrail (Make.com)

**Why:** the player-facing evidence DESCRIPTION is printed and shown to *all* players each round.
If it names the culprit, the mystery is spoiled. See [ADR-0035](adr/0035-evidence-cards-must-not-name-the-culprit.md).

**Where:** the Make.com evidence-card generation prompt (the module that produces the
`evidence_cards` markdown for predetermined / `detective` mysteries).

**Rule to add to that prompt (paste verbatim into the system/instruction block):**

> **Spoiler rule — evidence descriptions must not name the culprit.**
> Each evidence card has a player-facing `#### DESCRIPTION` and a `#### SIGNIFICANCE (Host Only)` section.
> - The **DESCRIPTION is shown to every player**. It must **never name, or uniquely single out, the culprit or the accomplice.** Do not write "found in <Name>'s room", "<Name> was the only one absent", "<Name> was positioned behind the victim", or a note/signature that resolves to the culprit's full name.
> - You **may** plant *deductive breadcrumbs* the players must connect: initials, matching handwriting across two cards, an unnamed "one suspect / one attendee" with a timeline gap, a document line-item among several names — **but see the clue-timing rule below for when each is allowed.** Aim for **gettable, not obvious** — a sharp player should be able to chain clues across rounds, but no single card should state who did it.
> - Put the explicit identification — the name, the "this proves X is the killer" reasoning — **only** in `#### SIGNIFICANCE (Host Only)`, which is stripped from the printed card.
> - Refer to suspects in the DESCRIPTION by role or neutral descriptor ("one guest", "a second attendee", "one card-holder"), not by name, whenever naming them would reveal guilt.

**Clue-timing and strength rule — the funnel (paste this too):**

> Evidence rounds are a funnel: **Round 2 = motive (broad), Round 3 = method/means (narrowing), Round 4 = opportunity (the subtle flaw).** Match clue strength to the round.
> - **Round 2 (motive) carries NO identity-narrowing clues.** No initials, monograms, signatures, handwriting tied to one person, or "only <person> was…" statements. Round 2 implicates **4–6 suspects by motive only** — it must not point at the culprit.
> - **Identity breadcrumbs (initials, monogram, matching handwriting, a lone timeline gap) appear only in Rounds 3–4**, and each is **one link in a chain** the player must combine with another card — never a standalone answer.
> - **A breadcrumb that resolves 1:1 to a single cast member is STRONG** (initials matching exactly one character are nearly a name). Use **at most one** such clue, in **Round 4**, never in Round 2. If two cards would each point 1:1 at the culprit, weaken one to a shared/ambiguous form.
> - Rationale: dropping the culprit's initials into the motive round lets a careful player shortcut the whole deduction on card one. Keep the reveal earned across all three rounds.

**Formatting rule (also add):**

> Use `####` (four-hash) headings for the host-only / non-printed sections: `#### SIGNIFICANCE (Host Only)`.
> Do not use `###` (three-hash) `IMPLICATIONS` / `VISUAL DESCRIPTION` sections in player output. The app strips
> `Significance / Implications / What This Reveals / Who It Implicates / Visual Description / Discovered`
> headings at 2–4 hashes, but keep the format consistent: player prose under `#### DESCRIPTION`, everything
> else under a clearly-labelled host-only heading.

**Verification after any prompt change:** generate one predetermined mystery, open the printed evidence
cards, and confirm no card names the culprit. Cross-check with the audit query pattern in
[ADR-0035](adr/0035-evidence-cards-must-not-name-the-culprit.md) (murderer name vs host-only-stripped
player text).
