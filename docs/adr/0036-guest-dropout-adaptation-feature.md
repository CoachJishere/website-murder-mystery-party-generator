# 0036 — Guest-Dropout Adaptation ("A guest can't make it") as a Paid Feature

**Status:** Proposed
**Date:** 2026-07-19
**Updated:** 2026-07-21 — added murderer-swap audit findings; reclassified
murderer-dropout from "reassign-only" to "reassign **or** paid re-solve" (Phase D);
added a preventative host-guide casting tip (Phase 0).

## Context

Guests dropping out of a booked murder-mystery party is one of the most common
real-world failure points for a host — someone cancels the day before and the
host is left with a package built for N players and only N-1 seats. Today the
only recourse is a manual support edit (we did exactly one by hand on
2026-07-18 for "Whispers From The Void" — removed the red-herring character
Reginald/Regina Pemberton and reworked every reference so the game played as a
native 9-hander; see `00_INBOX` vault note of that date).

That manual run is the proof-of-concept for a self-serve, paid feature:
*"A guest can't make it — adapt my mystery."* This ADR scopes it and records
**why the difficulty is a step function of the removed character's role**.

Enabling facts that make this viable at all:
- **Guest links are dynamic.** Character sheets render live from the DB, so an
  edit is delivered invisibly — no re-sending links, no new tokens. This is what
  makes *post-purchase* editing possible.
- **`master_context`** is a machine-readable solution map (roles, relationship
  matrix, alibis, evidence, misdirection targets, accomplice pairing). Automation
  reads this instead of re-parsing prose.
- **`character_role`** on every row gives an instant safe/unsafe classification.
- Stripe checkout + `stripe-webhook` + the Make generation pipeline are existing,
  reusable plumbing.

## Decision

Build the feature as a **role-aware triage**, not a single "remove" button. When a
guest drops, the flow identifies the character and routes to the cheapest tool
that produces a *valid, playable* mystery:

1. **Reassign / double up** (free, no LLM, no content change) — a remaining guest
   or a couple takes the role. A good default for anyone; the fallback for the
   murderer.
2. **Host voices the absent character** (cheap, no DB mutation) — generate a
   one-page Host Adaptation Sheet; the character stays "present" and the host
   reads their few key lines. For minor characters a host wants to keep.
3. **Remove / write-out** (paid, surgical edit) — for **non-essential** characters
   (red herring / spare suspect) when nobody wants to double up. Strips all
   direct-address beats (interrogation questions, rumors, alibi name-drops → swap
   to a present guest), syncs point-form twins, patches the detective script,
   deletes the character + assignment.
4. **Re-solve** (paid, LLM) — for the **accomplice** or the **murderer**: remove
   the dropped character *and* re-establish a valid single-solution mystery
   (details + audit below).

**Preventative layer (Phase 0 — do this first, it's nearly free):** add a fixed,
host-only casting tip to the generated host guide (static text in the Make
template, no LLM). It advises assigning the two **essential** roles — the murderer
**and** the accomplice — to the guests least likely to cancel, since those are the
only dropouts that are hard/costly to adapt. Bundle both roles (never single out
"the murderer") so the advice can't become a tell. Emphasise it for **detective
style**, where the scripted reveal and arrest depend on the murderer being present.
Suggested copy (paste into the Make host-guide/prep template):

> **Assigning roles — a quick tip.** A few characters are pivotal to how the
> mystery resolves. When you hand out roles, give the most plot-critical parts to
> the guests you're most confident will show up — a last-minute cancellation of a
> key character is the hardest thing to work around on the night. (Life happens
> and people get sick; if it does, you can adapt — but a little care here saves a
> lot later.)

**Gating by role:**

| Removed role | Handling |
|---|---|
| Red herring / spare suspect | **Paid surgical removal** (tier ships first) |
| Accomplice | **Paid re-solve** — "demote to solo murder"; bounded, guardrailed |
| Murderer | **Reassign (default) OR paid re-solve** by promoting a new killer — see audit |
| Victim | **Blocked** — the mystery is about them |
| Detective | N/A (host/NPC, not a guest seat) |

**Orchestration:** the trigger may be Make or the Stripe webhook, but the
**analyze → edit → verify → repair** logic lives in an **edge function**, not a
Make module chain. Make is fine for linear "call LLM, save" flows and bad at the
iterative verification loop this needs.

**Mandatory guardrails for any paid edit:**
- Snapshot the full package pre-edit (rollback safety) before any mutation.
- Verify post-edit: zero leftover references to the removed character; headcount
  ≥ mystery minimum; **exactly one** character retains means + motive + opportunity;
  no new alibi contradictions. Roll back on failure.
- For re-solves specifically, run an **adversarial solvability pass**: an LLM
  attempts to solve the mystery from the *player-facing materials only*; it must
  land on the new murderer and find no one else with means+motive+opportunity.
- No metered LLM calls wired into a deployed flow without explicit owner sign-off
  on per-request cost; the price must cover a worst-case multi-call re-solve.

## Murderer-swap audit (2026-07-21)

Audited on "Whispers From The Void" the concrete case: drop the murderer
(Silas/Sylvia) and crown a new killer. Findings:

- **Cost is not the constraint.** A re-solve is ~**$1–3 worst case, often <$1**
  with tight prompting. A **$5 fix price covers it** comfortably.
- **The edit surface has two parts:**
  1. *Remove the old murderer* — ~**8 characters reference them across ~30 fields**.
     This is the same scrub already executed for Pemberton (proven, cheap).
  2. *Make someone else guilty* — the hard part, and it depends on **who** you promote:
     - Promoting an **innocent** (e.g. a red herring): rewrite ~**15–20 fields on
       that one character** (description, background, intro, all round scripts +
       point-form twins, rumors, final statement, accusations) **and break their
       alibi** (from "witnessed the whole time" to "had the unwitnessed window").
     - Promoting the **accomplice** (**recommended default**): far less work — they
       are already guilty-coded (motive tied to the crime, guilty-path scripts,
       insider knowledge). It also **resolves the orphaned-accomplice cascade for
       free** (removing the murderer otherwise leaves the accomplice's ~9
       murderer-referencing fields dangling). Net result: a clean solo murder.
- Plus: rewrite the **detective reveal** (1 section — currently names the killer +
  their specific motive), re-solve the **`master_context`** alibi timeline so
  exactly one person has opportunity, and fix any cross-references that *clear* the
  new killer.
- **Evidence cards:** in this (pre-**ADR-0035**) package the culprit is named in 2
  **host-only** "SIGNIFICANCE" notes — text-only edits, **no image regeneration**.
  Packages generated after ADR-0035 are culprit-agnostic, shrinking this further.

**Verdict:** the murderer swap is the hardest tier but is **buildable and cheap to
run** — *if* the flow defaults to **promoting the accomplice** and invests in the
solvability verification. The risk is correctness (a subtly unsolvable mystery
shipped mid-party), not API spend.

## Rationale

- Difficulty is dominated by the **solution constraint web**, not the plumbing. A
  whodunit needs exactly one means+motive+opportunity holder and airtight alibis
  elsewhere; changing the answer forces the whole web to re-close.
- Removing a **non-essential** character leaves the solution untouched — a
  reduction, safely automatable (the Pemberton run demonstrated it).
- Removing the **accomplice** keeps the answer fixed — a "demote to solo murder"
  reduction.
- Removing the **murderer** deletes the answer, but the audit shows a bounded path:
  scrub the old killer (known work) + **promote the accomplice** (already
  guilty-coded) + rewrite the reveal + re-solve alibis + verify. Reassignment
  remains the zero-cost default; the paid re-solve is the upsell.
- **Prevention beats cure:** a static casting tip costs nothing per request and
  removes the most expensive dropout before it happens.
- "Absent NPC" only works when paired with stripping direct-address beats;
  otherwise players interrogate an empty chair. Once stripped, managed-absent and
  surgical-removal converge — so we treat them as one paid tool, not two.

## Alternatives Considered

- **Single "mark absent" button (naive absent).** Rejected — leaves every other
  sheet addressing the missing person; produces the unplayable game.
- **Full regeneration on any dropout.** Rejected — rewrites all remaining guests'
  sheets, which they already hold; defeats the purpose of a post-purchase fix.
- **Murderer swap by promoting an innocent.** Allowed but not the default — ~15–20
  field rewrite on that character plus the orphaned-accomplice cleanup. Promote the
  accomplice instead when one exists.
- **All logic in Make.** Rejected for the re-solve tiers — no clean verify/repair
  loop; correctness failures ship silently.

## Consequences

- New paid surface (per-request pricing fits: charge ~$5, comfortably above LLM
  cost; self-funding). Needs a Stripe price/product + webhook branch + job row.
- New edge function(s): classify, edit, re-solve, verify, snapshot/rollback.
- Frontend: "A guest can't make it" entry point + character picker + triage UI.
- Make template: add the Phase 0 host-guide casting tip (static, no code change
  here — Make-side edit).
- Phasing: **(0)** preventative casting tip → **(A)** free reassignment +
  host-adaptation sheet → **(B)** paid non-essential removal → **(C)** paid
  accomplice re-solve → **(D)** paid murderer swap (accomplice-promotion default).
- Ongoing metered-API cost per paid request; must stay under the price.

## Discussion

The load-bearing debate was whether "absent NPC" rescued the *essential*-character
cases. It does not: you cannot run a game with the murderer absent (no one to
unmask) or the victim absent (no murder). Absent-NPC and surgical-removal cover
the *same* non-essential tier; the true tool for an essential dropout is
reassignment or a re-solve.

The 2026-07-21 audit revised the earlier "murderer = don't build it" stance. With
the **accomplice-promotion** shortcut, a removed murderer is closer to *"scrub the
old killer (already done for Pemberton) + flip one already-guilty character +
rewrite the reveal + verify"* than to a full regeneration — and at ~$1–3 it fits a
$5 fix. It stays the last phase because it carries the most correctness risk, which
is why the adversarial solvability pass is mandatory, not optional. Prevention
(Phase 0) is cheap insurance that makes the whole hardest tier rarer.

## Key files (anticipated)

- `supabase/functions/adapt-mystery-*` — classify / edit / re-solve / verify edge functions (new)
- `supabase/functions/stripe-webhook/index.ts` — add adaptation checkout branch
- `src/pages/MysteryView.tsx` — "A guest can't make it" entry point
- Make host-guide/prep template — Phase 0 casting tip (Make-side)
- `mystery_characters`, `mystery_packages.master_context`, `mystery_packages.evidence_cards` — read/edit for re-solve
- Related: `docs/adr/0035-evidence-cards-must-not-name-the-culprit.md`
- Worked precedent: `00_INBOX/whispers-from-the-void-remove-pemberton-2026-07-18-mystery-maker.md`
