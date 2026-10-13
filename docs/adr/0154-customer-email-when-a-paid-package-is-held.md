# ADR-0154: Tell the customer by email when a paid package is held in `needs_review` (PROPOSED)

**Status:** Proposed (nothing built; waits on Jonathan's yes on the threshold and the wording)
**Date:** 2026-10-13
**Related:** ADR-0077 (hard quality guarantee, hold behind the building screen), ADR-0103 Addendum 92 (the trigger), ADR-0138 (review-before-release), ADR-0106 (single ready email), ADR-0123 (notify-generation-issue quiet period)

## Context

"Blackthorn Manor" (paid 2026-10-09 18:03 UTC) was held in `needs_review` at 18:10 UTC because the gate found two characters with the role `accomplice` (Addendum 92). It stayed held for four days, until Jonathan pasted the alert on 2026-10-13. The customer, Amy, wrote to Jonathan on 2026-10-12 asking what was wrong with the content and for corrected pages. Two facts from reading the code:

1. **The customer is never emailed when a package is held.** `notify-generation-issue` sends one email, to support@mysterymaker.party. The line "The user has been shown a message that the team has been notified" in that email refers to an on-screen message only.
2. **A held package is not hidden for long.** `MysteryView.tsx` keeps a `needs_review` package behind the building screen for `NEEDS_REVIEW_SILENT_WINDOW_MS` = 10 minutes (self-heal window, ADR-0077). After that it reveals the content with the banner "Your mystery was generated but some character content needs attention" (`en.json` L1246). So the customer sees, and can download, the unfixed package with a warning and no explanation or timeline. Amy downloaded it, noticed the banner, and had no way to know whether to print.

Only the `reviewing` phase (a few minutes) has a customer promise ("we'll also email you the moment it's ready"). The longer `needs_review` hold has none.

## Decision

Add one customer email, and nothing else:

1. When a **paid, non-test** package has been in `needs_review` for **N minutes** (proposed N = 60, to leave the free self-heal and the daily sweep time to work first), send the customer one email: we are doing an extra check on your mystery, please do not print yet, you will get a second email when it is ready, and it will be ready well before your event date if the brief gave one. It does not describe the defect.
2. Send it **once** per package (claim a new column or reuse a `notified` marker, the same way `ready_email_sent_at` claims the ready email).
3. Write it in the customer's language, reusing the package-language detector and the 13-locale email strings from the localized ready email (ADR-0152 Update 4).
4. Follow the existing customer email rules: professional and short, no em dashes, no attempt counts, signed "Jonathan" then "Mystery Maker".
5. Run it from the existing cron path (a new small function or a branch of `notify-generation-issue`), with `pipeline_settings` kill switch `held_customer_email` (`off` default until Jonathan turns it on).

**Declined (Jonathan, 2026-10-13):** a second internal alert to Jonathan when a paid package has been held for six hours. Not built.

## Rationale

The hold itself is correct for blocking defects: a host who prints and distributes booklets from a package with two accomplices hands a player the culprit's identity, and recalling printed kits is worse than a late package. What failed was the silence around the hold. A short email turns "the site shows a warning and nobody explains it" into "we know, we are on it".

## Alternatives considered

- **Hide the package until released (extend the silent window to infinity).** Rejected for now: ADR-0077 deliberately fails open so a package can never be hidden forever, and a package with a cosmetic gate hit would block the customer entirely.
- **Make the on-screen banner say what to do ("do not print yet").** Cheap and complementary, but a customer who closes the tab never sees it. Not part of this decision; can be added with the same change.
- **Second internal alert at six hours.** Declined by Jonathan.
- **Release and fix after (reviewer `+p2` style) for every gate hit.** Rejected for blocking classes (duplicate accomplice, missing core content): the harm is a printed wrong kit. Remains the right model for small slips, which already work that way.

## Consequences

- One more outbound email path to test, localize and keep behind a kill switch.
- The 60-minute threshold means a package held for a few minutes while the free heal runs sends nothing.
- It does not shorten a hold; it only informs. Whether holds should have a deadline is a separate question and is not decided here.

## Key files

`supabase/functions/notify-generation-issue/index.ts`, `supabase/functions/send-mystery-ready-email/index.ts` (strings and language detection to reuse), `src/pages/MysteryView.tsx` (silent window and banner), `src/i18n/locales/en.json` (banner text).

## Discussion

Jonathan asked whether the customer is told about a hold and whether holding beats releasing and fixing. The answers were no, and yes for blocking defects but not for small ones. Two follow-ups were offered: a customer email at about one hour, and a six-hour internal alert. Jonathan chose the first and not the second. During the same exchange the 10-minute reveal window was found (above), which corrects an earlier statement in the session that the customer saw only a building screen for the whole hold.
