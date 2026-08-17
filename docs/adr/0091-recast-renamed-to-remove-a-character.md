# ADR-0091: "Recast" Renamed to "Remove a Character"

- **Status:** Accepted — supersedes ADR-0088 §"Naming and tab framing" only. Everything else in ADR-0088 (multi-character batching, murderer/accomplice reassignment, flat $5 pricing, chain-dispatch, non-blocking processing) is unchanged and still governs this feature.
- **Date:** 2026-08-17
- **Related:** `docs/adr/0036-guest-dropout-adaptation-feature.md`, `docs/adr/0082-guest-dropout-phase-b-implementation.md`, `docs/adr/0088-guest-dropout-multi-character-and-reassignment.md` (introduced the "Recast" name)

## Context

ADR-0088 deliberately renamed this feature from the bare scenario description ("a guest can't make it") to **"Recast"** — casting/theater vocabulary chosen to fit a murder-mystery game and to cover both plain removal and murderer/accomplice reassignment under one name, while giving the "Extras" tab a real product name instead of reading as one sparse utility.

Live review of the actual UI surfaced the cost of that choice: every supporting string already had to describe the feature in plain language anyway — the card teaser ("Remove or replace them in the story"), the explainer subtitle ("Remove a character from your mystery with the click of a button."), the entry-point notice on the Characters tab. "Recast" sat as an unexplained label above copy that immediately re-explained it in plain English. For a paid, irreversible, once-a-party-emergency action, that's an extra translation step for a host who is often mid-crisis (a guest just cancelled) — exactly the wrong moment to make them pause on unfamiliar branding. Jonathan's call: the theater metaphor wasn't earning its confusion cost.

## Decision

Renamed the feature to **"Remove a Character"** everywhere it's user-facing or referenced by name in code:

- `adaptation.card.title` / `adaptation.explainer.title` (both were "Recast") → "Remove a Character", translated per-locale rather than left as an English loanword (e.g. "Fjern en karakter" / "Einen Charakter entfernen" / "キャラクターを削除").
- `adaptation.card.inProgressTitle` ("Recast in progress") → "Update in progress" — a literal "Remove a Character in progress" isn't grammatical (the new name is an imperative phrase, not a noun), and the in-progress card already lists the specific characters below the label, so the generic status label doesn't need to re-carry the feature name.
- `adaptation.toasts.createdNoCheckout` / `adaptation.toasts.alreadyInProgress` — dropped the branded name from these confirmation/conflict toasts entirely ("Request created for..." / "...already has a request in progress") rather than force-fitting the new imperative phrase into a noun slot.
- `adaptation.entryPoint.notice` (the pointer shown on the Characters tab) — reworded from "Use Recast (see the Extras tab)" to "See Remove a Character in the Extras tab".
- All 6 of the above translated across all 13 locales — assertion-verified against each locale's exact prior string before writing, so no silent mismatch could overwrite something unexpected.
- Code comments in `GuestDropoutPanel.tsx`, `adaptationService.ts`, `AdaptationSuccess.tsx` updated to reference the new name (or dropped the name where the comment didn't need it — e.g. "Recast batch" → "adaptation batch").
- `GuestDropoutPreview.tsx` (the `/guest-dropout-preview` marketing mock, hardcoded English, no i18n) updated to match.

**Not renamed:** the underlying `mystery_adaptations` table, `adapt-mystery-create`/`adapt-mystery-apply` edge functions, `adaptationService.ts`'s exports, and ADR-0036/0082/0088's own text. Renaming a shipped, paid feature's customer-facing name is a copy change; renaming its database schema and function names for a label that might change again is churn with no user-visible benefit and real risk (Stripe webhook routing, Make.com references) for no reason tied to this decision.

**ADR-0088 left as-is** per this project's ADR immutability rule (`docs/adr/0001-record-architecture-decisions.md`) — its "Naming and tab framing" section remains an accurate historical record of why "Recast" was chosen at the time; only its Status line is updated to point here.

## Rationale

- The name only ever needed to answer "what does this button do," and "Remove a Character" answers that with zero translation step — which is what every other string in the flow was already doing around it.
- Dropping the branded name from toasts and the in-progress label, rather than contorting "Remove a Character" into every grammatical slot "Recast" used to fill, keeps each string natural instead of introducing new copy debt to preserve a single unified label everywhere.
- Minimal-diff scope: only strings that literally said "Recast" (or its per-locale translation) were touched. Adjacent copy that already described the feature in plain language (e.g. the explainer subtitle) was left untouched even though it's now slightly redundant with the new title — rewriting it wasn't part of what broke.

## Alternatives Considered

- **Keep "Recast," fix nothing.** Rejected — the confusion was the direct trigger for this ADR.
- **A different brand name** (e.g. "Swap," "Character Change"). Not pursued — the point was to remove the translation step entirely, not find a less-confusing brand.
- **Rewrite ADR-0088's naming section in place.** Rejected — violates this project's ADR immutability rule; a new ADR is the documented mechanism for reversing a prior decision.

## Consequences

**Positive:** the feature's name now matches its own description everywhere it appears; no more branded-term translation step for a time-pressured host.

**Negative:** none of the underlying identifiers (table name, function names, `adaptationService.ts`) reflect the current customer-facing name — a future reader grepping for "remove a character" in the backend will find nothing; they need to know the `adaptation`/`mystery_adaptations` naming to locate the code. Documented here specifically so that lookup isn't a mystery in itself.

**Verification:** all 13 locale JSON files valid; each locale's diff isolated to exactly the 6 changed keys (`git diff` confirmed, no incidental reformatting); `tsc --noEmit` clean. Not verified: live browser walkthrough of the real (non-preview) `GuestDropoutPanel.tsx` flow post-rename — requires an authenticated session with a real package, unavailable in this environment. The preview page was screenshotted and confirmed rendering correctly; the real component's change is the same string substitution.

## Key files

- `src/i18n/locales/*.json` (`adaptation.card.title`, `adaptation.card.inProgressTitle`, `adaptation.entryPoint.notice`, `adaptation.explainer.title`, `adaptation.toasts.createdNoCheckout`, `adaptation.toasts.alreadyInProgress`) — all 13 locales
- `src/components/GuestDropoutPanel.tsx`, `src/services/adaptationService.ts`, `src/pages/AdaptationSuccess.tsx` (comments only)
- `src/pages/GuestDropoutPreview.tsx` (hardcoded mock strings)
