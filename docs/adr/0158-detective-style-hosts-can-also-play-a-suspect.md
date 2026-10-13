# ADR-0158: Hosts of detective-style games can also play a suspect, with the answer sealed in the app

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

ADR-0157 let the host of a slip-style game play a suspect, because slip-style narration never names the culprit. It deferred detective style ("large, touches generation, not requested"). This ADR re-measured that deferral and builds the cheapest part that is true by construction.

**Demand.** Real paid packages: 127 detective vs 105 slip overall, 63 vs 36 in the last 60 days, so detective is the larger audience. Nobody has asked: `contact_messages`, `mystery_feedback` and `guest_feedback` hold no mention of a host wanting to play in any style (Barbara's mails were email only, slip style).

**Where a detective-style package spells out the answer** (5 latest paid detective packages, 2026-10-06 to 10-12, plus a 102-package corpus check):
- `detective_script` reveal section: names the murderer in all 5 and the accomplice in the 2 that have one. Since about July 2026 the reveal is its own heading (`## THE REVEAL`, localized: LA REVELACIÓN, LA RIVELAZIONE, DE ONTHULLING, AVSLÖJANDET, LA RÉVÉLATION), sometimes followed by `## CLOSING` / `## CLOSING STATEMENT` / `## ACCOMPLICE CONFESSION`, so the reveal is NOT always the last heading (10 of 102). Packages from before about May 2026 (about 24 of 102) use `###` headings and have no reveal section; the resolution sits inside "ACCUSATIONS AND RESOLUTION".
- Evidence cards, "SIGNIFICANCE (Host Only)" (and "IMPLICATIONS" in older formats): names the murderer in 4 of the 5 (e.g. "which points to Morgan"); Round 3 notes narrow to a few named suspects. The Clues tab strips Visual Description, Discovered, What This Reveals and Who It Implicates, but NOT Significance or Implications, so the host sees them today. The printed guest card already strips them (`evidenceCardUtils.ts`).
- Game Overview: clean in the sample (it lists the cast only).
- Guide strings: `checklist.item4Predetermined`, `setupChoice.option1NoteDetective`, `runningGame.step4PredeterminedBody` all say to look in the Detective Guide for who it is.
- Detective Guide Copy/Download buttons export the whole script.
- Option 2 (audio) is today's only route to play as host in detective style, and it requires generating TTS from the whole script, so it can never be spoiler-free.
- Pre-reveal pointers exist: reading the snippets of every name hit before the reveal heading in all 125 paid detective packages (most hits are substrings or neutral mentions of several suspects), about 6 packages point at the culprit before the reveal (Round 3/4 narration dwelling on one suspect, an accusation addressed by name, a clue naming the culprit's company). Everything before the reveal is read aloud to the whole table, so the guests get the same pointer; it is a script-quality issue, not something the seal can or should hide.

## Decision

Option A (UI and docs only; Jonathan chose it at Gate 1): an opt-in "I'm also playing" switch that hides the places that spell out the answer, plus a guide block. No change to generation, prompts, Make.com, the database or delivered packages.

1. **Switch.** A per-package switch (default OFF, stored in `localStorage` with try/catch; a hidden answer is a convenience, never state) on the Detective Guide and Clues tabs of the owner view and on the host share page (`HostAccess`). Detective style only. Default off so a non-playing host sees no change.
2. **What it hides when on.**
   - `detective_script`: from the first heading (levels 2 to 4) that contains a reveal word (multilingual list) to the end of the script, which includes any CLOSING and ACCOMPLICE CONFESSION sections. Copy and Download output only the visible part.
   - Evidence cards: shown as the guests see them, using the same strip rules as the printed card (Significance, Implications and the other host-only sections removed).
   - **Fail closed:** if no reveal heading is found (older packages), the whole script is hidden and the switch explains that this older package cannot be separated safely and a helper should read the script.
   - While the switch is on, the script and evidence are read-only. Otherwise saving an edit would write the truncated text over the stored reveal.
3. **Guide block** (detective style only, 13 locales, murder and intrigue variants): "Playing a suspect yourself? (detective-style mysteries)": switch it on; take a character page like a guest and skip the others' pages; read the script aloud up to the final statements; for the reveal, the murderer (who already knows from their own page) or a helper who is not playing opens the Host link and reads it aloud; the Host Only hints are hidden. A one-line pointer to this block is appended to the five places that say "you will know who the murderer is" (checklist items 2 and 4, prep item 1, Option 1 note, step 4).
4. **Not changed:** Option 2 (audio) text, the slip-style block of ADR-0157, character sheets (the host takes one like a guest; the guide tells them to skip the others), `master_context` (never shown to the host).

## Rationale

The cheapest change that is true by construction about what the app displays: after the switch is on, the host sees only what the whole table hears or sees (the script before the reveal is read aloud to everyone; the evidence is the card the guests get), and when the app cannot find the boundary it hides more, not less. The claim made to the host is limited to that ("the Reveal and the Host Only hints are hidden"), not "no hint exists". The Characters tab and the Game Overview are not sealed: character pages are guide-only (as in ADR-0157), and the Game Overview is public information that lists every suspect, the culprit among them.

## Alternatives Considered

- **B. Generation change** (reveal as a separate field, Host Only notes that never name anyone, pre-reveal leaks fixed at the source). The only airtight fix for new packages, but it needs a Make Parent import, does not help the 127 existing packages, and rests on one slip-style request. Deferred, not rejected: revisit if detective hosts ask.
- **C. Do nothing and document Option 2's limits.** Free, but leaves detective-style hosts with the exact mismatch the slip-style guide just fixed.
- **Always hide by default (switch on).** Rejected: regresses the host who is not playing and uses the Host Only hints.
- **Split at the last `##` heading.** Rejected after measurement: wrong for the 10 packages that end in CLOSING and for the older format.
- **Redact only the murderer's name in text.** Rejected: names recur in prose with pronouns and nicknames; a name-scrubber would miss and also damage the script.

## Consequences

- A playing host in detective style sees the script up to the final statements and the evidence exactly as guests do; the reveal is read by the murderer or a helper from the Host link, which is a social step the guide has to explain.
- About a fifth of packages (older format) cannot be sealed; the switch fails closed for them with a clear message.
- Residual: the roughly 5% of packages whose pre-reveal narration points at the culprit are not helped by the seal (the guests hear the same pointer). Open follow-up: a corpus-validated detector for "narration before the reveal dwells on or names the culprit"; not built here because it needs its own false-positive study (title tokens like "Professor" and "Dr." and first names shared with other characters make a naive name check mostly noise, as the measurement below shows). Logged in the vault inbox.
- A regression in the reveal headings (a new localized word) fails closed, not open.
- The switch state lives in the browser; a new device starts with the answer visible. The guide tells the host to switch it on before opening the tab.

## Verification (2026-10-13)

- Unit test `scripts/__tests__/hostSeal.test.mjs` (8 checks: English and 8 localized reveal headings, closing sections sealed, fail-closed for an older package, level-1 title ignored, evidence notes stripped, storage never throws).
- Corpus, 125 paid non-test detective packages: reveal heading found in 103 (82%), fail closed in 22 (18%).
- The 5 latest paid detective packages, murderer and accomplice names (name parts, title words excluded) in what a sealed host still sees: script before the reveal 0 in all 5; player-facing evidence 0 in all 5 (the raw evidence carried 6, 3, 2, 4 and 0 hits); the Game Overview names the murderer in 3 of 5 as one roster blurb among all suspects (not sealed, see Rationale). A fixture check on the Portuguese package showed the only remaining hits are the victim's surname.
- Real components rendered with Playwright from real packages (English, Swedish, Portuguese detective; older-format detective; English slip) in en, de, ja, sv, pt and es: switch off shows the reveal and Host Only notes, switch on removes them, the state survives a reload, the copy/download buttons stay, the older package shows the fail-closed notice with no script, the host share page behaves the same on a 390 px viewport, and the slip package shows no switch, no detective block and keeps the ADR-0157 block.
- `npx tsc --noEmit -p tsconfig.app.json`: 959 errors, equal to the pre-existing baseline; the new strings go through one loosely typed hook (`useHostSealText`) so no call site adds an error.

## Discussion

Jonathan was shown three options after the measurement and chose A. The trade-offs debated: the brief assumed the reveal is the only leak; measurement found the evidence "Host Only" notes name the culprit too and the Clues tab shows them, and that "split at the last heading" is wrong for 10 packages and the older format. The fail-closed rule was chosen over guessing a boundary for older packages. The decision to leave generation alone (B) is a scope call: it is deferred because it needs a Make import and covers only future packages, with one slip-style customer as the only evidence of demand.

## Key files

- `src/utils/hostSeal.ts` (new: reveal split, multilingual heading list, storage helpers)
- `src/utils/evidenceCardUtils.ts` (`playerFacingEvidence`, next to the print strip it mirrors)
- `src/components/MysteryPackageTabView.tsx`, `src/pages/HostAccess.tsx`, `src/components/HostSealSwitch.tsx` (new), `src/hooks/useHostSealText.ts` (new)
- `src/components/HostGuideTemplate.tsx`, `src/i18n/locales/*.json` (`hostGuide.setupChoice.detectivePlays*` including `detectivePlaysPointer`, `mysteryPackage.hostSeal.*`)
- `.gitignore` (allow the new test, `*.mjs` is ignored by default)
- `scripts/__tests__/hostSeal.test.mjs` (new)

## Addendum 1 (2026-10-13): independent eval, fixes and open gaps

An independent re-derivation from git, the database (127 paid non-test detective packages) and a Playwright render of the real components confirmed the numbers above (103 reveal found, 22 fail closed, 2 with no script; the split never cut early or left a closing section open in the corpus; owner view and Host link behave as described in en, sv, es and an older-format package; slip package unchanged).

**Fixed in this addendum:** `playerFacingEvidence` only removed `##`-`####` headings named Significance/Implications/...; a bare `SIGNIFICANCE (Host Only)` line (one delivered Latvian package, 2026-08-02), a bold or `#####` label, or a localized label word with "(Host Only)" stayed visible. It now also drops any section labelled "(Host Only)" in any of those shapes (test added). The printed-card strip is unchanged.

**Closed in the follow-up (same day, Jonathan: "proceed however you recommend"):**
1. **Extras leak.** `GuestDropoutPanel` gets `hideRoles` (= the switch is on): no role badge, no role-specific reassign note or replacement picker, no "becomes the new murderer" line on the confirm step, and a one-paragraph note (`adaptation.picker.sealedNote`, 13 locales) says that removing the culprit or accomplice is still announced on the confirmation page and by email (server-side, cannot be hidden from browser state) and that a helper can do the removal. `AdaptationSuccess` omits "X is now the murderer" when the switch is on for that package (`package_id` added to the status select). The completion email still names the new culprit, which is why the note exists. Switch off: picker unchanged (checked).
2. **Host link and per-browser state.** New sixth bullet in the guide block (`detectivePlaysItem6`, 13 locales, interpolates that locale's "Send Host Kit" and "Share with guests" labels): the switch is remembered in this browser only, the Host link exists only after "Send Host Kit", it has its own switch (off by default), a playing host who opens it must switch it on there, the helper who reads the Reveal leaves it off.
3. **Tab names.** The new Item 1 murder variant now names the tab as it is called in fr, it, pt, fi. The older guide strings that say "Detective Guide" in those locales are unchanged.

**Tried and rejected:** adding `closing` / `accomplice confession` as seal triggers (for a closing section above the reveal). The corpus check showed one older-format package ("Murder At The Velvet Rose") whose `### CLOSING STATEMENT` comes after `ACCUSATIONS AND RESOLUTION`, so it would count as found and leave the answer open. Reverted; a test now pins that case as fail-closed, and a closing-above-reveal package (none delivered) stays a documented latent gap.

**Follow-up 2 (same day, Jonathan: "tackle all of the open items"):**
1. **Key Points.** `sealDetectiveScript` now drops every `Key Points` section from the open part (to the next heading), so Copy/Download and the view never show host-facing bullets that can name the culprit. Corpus: Key Points exist in 4 headings of 1 found package; after the change 0 culprit-name hits in them; found/fail-closed counts unchanged (103 / 22). Cost: a playing host in the few Script/Key Points-format packages loses the bullet summaries. The generation-side cause (the Parent writes culprit names into host bullets) is not fixed: needs a Make import and is 1 of 103 packages, so not worth one.
2. **Completion email.** `send-adaptation-complete-email` (deployed as v8, `verify_jwt` on, live source diffed equal to the repo) no longer says "X is now the murderer" for detective-style packages: it says a key story role was reassigned and the updated Detective Guide has the details. The server cannot know the switch state, so detective style is always silent; slip style is unchanged. This makes the picker note (`adaptation.picker.sealedNote`, 13 locales) say that a removal does not announce who takes over a guilty role instead of warning about the email. Trade-off: a non-playing host who removes the culprit no longer gets the new culprit's name in the email (it is on the success page and in the Detective Guide).
3. **Tab names.** The outliers were the tab labels, not the guide strings: fr, it, pt, fi called the murder tab Inspector while 28 to 52 other strings say Detective. `mysteryPackage.tabs.inspector` and `mobileTabs.inspector` now say Detective in those four locales (Italian murder and intrigue tabs were identical before); the new bullet was put back to the detective wording. Loading and placeholder strings still say inspector, as the English ones do.

**Still open:** only the generation-side Key Points cause (deliberately not fixed) and a closing section above the reveal heading (none delivered; adding "closing" as a trigger was tried and rejected, see above).

## Addendum 2 (2026-10-13): third independent eval

Re-derived from git, the database (127 paid non-test detective packages), the deployed edge function and a render of the real components. Counts reproduced exactly (103 found, 22 fail closed, 2 no script; 0 Key Points left in the open part; 0 Host Only labels left in the player-facing evidence of 300 labels). Real components rendered in en, fr, it, pt, fi, de, es with the switch on and off: script, copy, download, evidence, Extras picker and confirm step, guide item 6, host page at 1280 and 390 px, slip package unchanged; no console errors, no raw keys.

**Fixed:** (1) the success page and the completion email still carried the "reassigning who the culprit is ... read the Reveal" notice; a playing host was told a culprit had been removed and advised to read the sealed section. The page now hides it when the switch is on; the email (v9) says to read it only if not playing. (2) `dropKeyPoints` only matched `#`-heading Key Points; bold or bare label lines, a "(Host Only)" suffix and localized words leaked. Now covered, with a test (latent: only the `#### Key Points` shape exists in delivered packages).

**Found and not fixed (documented):**
- `hosting_tips` names the culprit in 7 older packages (Dec 2025 to Mar 2026) and `materials` in 1 (Apr 2026); the Host Guide tab shows both unsealed, so the guide's "the only places that spell out who is guilty" is false for about 6 percent of packages. None since 2026-04-22. A fix would hide `hosting_tips` for a sealed host, which also hides the harmless tips; not done.
- Evidence cards of one older format (e.g. "Murder At The Velvet Rose") carry an inline "**What it reveals:**" line that the guests' printed card also shows; parity with the table, not a seal defect.
- Latent gaps with no corpus instance: localized or reworded Host Only labels ("(Nur fuer den Gastgeber)"), a label over 60 characters, a Host Only label written as "Host Only:" in a colon form, a description line ending in "(Host Only)" (over-deletes), `Key Takeaways` headings.
- The Host link is emailed with the switch off by default (documented in guide item 6); a host who sends the kit to themselves opens it unsealed.
- The token behind the Host link exists from package creation (DB default); it is only shown via the email, so "exists only after Send Host Kit" is true for the host's purposes.
