# 0028 — Capture the AI-recommended mystery title reliably (punctuation-safe extraction)

**Status:** Accepted
**Date:** 2026-07-02

## Context

A customer's purchased mystery (`conversation 9990ba2a-…`) displayed the title
`1980s British country manor be money media mogul - 10 Players`. That string is the
customer's own free-text **theme** typed at creation (a typo of "new money" → "be
money" and all), *not* the title the AI proposed during the design chat, which was
`Blood, Blackmail & Bollinger: A Media Mogul Murder`.

The AI's title only ever exists as a markdown H1 (`# TITLE`) inside the assistant's
concept message. Three code paths are supposed to lift it into `conversations.title`:

1. **On conversation creation** ([MysteryCreation.tsx](../../src/pages/MysteryCreation.tsx)) the title is seeded as `"<theme> - N Players"`.
2. **On each AI message** ([MysteryChat.tsx](../../src/pages/MysteryChat.tsx)) it re-extracts a title and overwrites — but only if the current title is blank/`untitled`/`new mystery`.
3. **Just before Stripe checkout** ([MysteryPurchase.tsx](../../src/pages/MysteryPurchase.tsx)) it extracts and overwrites if the current title matches `'% Players'`.

`mystery_packages.title` is later copied from whatever Make.com returns via
[api/generation-complete.js](../../api/generation-complete.js) (`data?.title`).

Two independent bugs meant the AI title was never captured:

- **Punctuation whitelist (root cause).** The extractor
  ([titleExtraction.ts](../../src/utils/titleExtraction.ts)) matched the H1 with
  `^#\s+(?:\*\*)?[""]?([A-Z][A-Za-z0-9\s:'\-']+?)[""]?(?:\*\*)?$`. The character
  class allows only letters, digits, whitespace, colon, hyphen, apostrophe — it
  **excludes commas, ampersands, `?`, `.`, `!`, parens**. "Blood, Blackmail &
  Bollinger" has a comma *and* an ampersand, so the regex failed on the whole line
  and returned `null`. Direct testing confirmed the same failure for e.g. "Death,
  Lies & Champagne" and "Whodunit? The Manor Mystery".
- **Dead mid-chat guard (aggravating).** MysteryChat's overwrite only fired for
  blank/`untitled`/`new mystery` titles, but the seeded title is *always*
  `"<theme> - N Players"` — so that path never ran for any real conversation,
  leaving the pre-purchase update (which itself depended on the broken regex) as the
  sole fallback. When the regex failed, nothing captured the title at all.

A sweep found **20** paid conversations still holding a raw `Theme - N Players`
title.

## Decision

1. **Extract the H1 by capturing the whole line, not a character whitelist.**
   Replace the pattern with `^#\s+(.+?)\s*$` (multiline), then strip markdown bold
   and surrounding quotes, and keep the existing `isLikelySectionHeader` guard to
   reject `# Questions` / `# Character List` / etc. `## Premise` still doesn't match
   because `\s+` requires a space immediately after a single `#`.
2. **Treat the raw `… - N Players` format as a placeholder** in MysteryChat's
   overwrite guard, so the AI title lands in the DB during the chat rather than only
   at purchase. Extracted titles never end in `Players`, so a real title, once set,
   is never clobbered by later AI messages (help text, recaps).
3. **Backfill existing paid rows.** Re-derive each title from the approved concept
   (latest assistant message containing a "Character List"; first H1 = title),
   updating both `conversations.title` and `mystery_packages.title`. **16** of 20
   recovered; the other **4** never generated a concept, so there is no title to
   recover.
4. **Guard the Make.com callback** (added 2026-07-02). The post-generation callback
   in `api/generation-complete.js` set `mystery_packages.title = data.title` (as sent
   by Make). It now prefers a good Make title but falls back to the corrected
   `conversations.title` when Make's value looks raw (`… - N Players`, `Mystery`,
   `untitled`, `new mystery`), so generation can no longer re-dirty a title.

## Rationale

- The bug is a *classification* failure (valid title rejected), so the fix is to
  stop enumerating allowed characters and instead trust the strong structural signal
  (a lone `# ` H1) plus the negative filter we already maintain
  (`isLikelySectionHeader`). This is simpler and won't regress the next time a title
  uses punctuation we didn't foresee.
- Fixing the mid-chat guard restores defence-in-depth: the title is now captured at
  the earliest point it exists, so the DB `title` column (which feeds the purchase
  notification email and any column-reading consumer) is correct well before
  checkout, independent of the pre-purchase path.
- Backfilling from the concept message is safe because the concept is the
  ground-truth artifact; we prefer the *latest* concept (post-revision) and require
  a Character List to avoid grabbing character-packet or script-section H1s (an
  earlier "latest H1" heuristic wrongly picked "GROUP 2 CHARACTER PACKETS" and
  "…- SECTION 1", which is why the Character-List constraint was added).

## Alternatives Considered

- **Broaden the character class** (add `,&?.!()`). Rejected: whack-a-mole; the next
  unusual-but-valid title breaks it again. Full-line capture + negative filter is
  more robust and simpler.
- **Extract the title server-side / in the Make.com callback** and stop trusting the
  client. The Make.com scenario itself is outside this repo, but the callback
  endpoint is not — so rather than rely on Make sending the right value, the callback
  now defends against a raw `data.title` by falling back to the corrected
  `conversations.title` (Decision #4). Rewriting the Make scenario's own title
  mapping remains optional.
- **Backfill by title-casing / normalizing** foreign and all-caps titles. Rejected
  for the backfill: stored the AI's title verbatim (the display layer already
  re-extracts and formats via `formatTitle`), avoiding lossy transforms on
  Portuguese/German/French titles.
- **Leave the 4 concept-less conversations** with a synthesized title. Rejected:
  there is no AI title to recover; inventing one would misrepresent the record.

## Consequences

- All future mysteries capture the AI's title (including punctuated ones) into the
  DB during the chat and again before checkout.
- 16 historical paid records now show their real titles in the dashboard, package
  view, and any email/column consumer.
- The Make.com callback now guards against a raw/garbled `title`: it falls back to
  the corrected `conversations.title`, so generation can no longer overwrite
  `mystery_packages.title` with a raw theme. The only residual risk is if *both*
  Make's title and the DB title are raw (e.g. a concept-less generation), in which
  case there is no good title to use anyway.
- 4 paid records retain `Theme - N Players` titles because no concept was ever
  generated; these are data artifacts of incomplete generations, not display bugs.

## Discussion

The debate was scope: minimal (regex only) vs. robust (regex + capture path) vs.
robust + backfill. Minimal would have fixed forward via the pre-purchase path, but
left the dead mid-chat guard and a fragile single point of capture, and wouldn't
touch the 20 dirty records. We chose robust + backfill because the fix is low-risk
(a stricter negative filter already exists) and the customer-visible dirty data was
concrete and bounded (20 rows, hand-reviewed before writing). The Make.com callback
was explicitly kept out of scope: it lives in a different system and the repo-side
fix already guarantees `conversations.title` is correct at purchase time.

## Key files

- [src/utils/titleExtraction.ts](../../src/utils/titleExtraction.ts) — H1 extraction (regex fix)
- [src/pages/MysteryChat.tsx](../../src/pages/MysteryChat.tsx) — mid-chat capture guard (placeholder fix)
- [src/pages/MysteryCreation.tsx](../../src/pages/MysteryCreation.tsx) — seeds the raw `Theme - N Players` title
- [src/pages/MysteryPurchase.tsx](../../src/pages/MysteryPurchase.tsx) — pre-checkout capture (now backed by the fixed regex)
- [api/generation-complete.js](../../api/generation-complete.js) — Make.com callback; now falls back to `conversations.title` when Make's `data.title` looks raw (Decision #4)
