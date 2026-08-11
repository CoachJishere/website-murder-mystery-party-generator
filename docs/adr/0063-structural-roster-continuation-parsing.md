# ADR-0063: Detect roster continuation structurally, not by subheading text

- **Status:** Accepted
- **Date:** 2026-08-05
- **Related:** ADR-0057 (select concept snapshot by parse, not header)

## Context

A customer (Raleigh, "Murder At Camp Pine Shadow" / "Camp Purgatory Pines", conversation `fa8ba43a-d8e4-41ae-8d66-1239cb739ae6`) emailed: *"the AI created optional characters for me and said they would be included. Those characters were then not included."*

Her approved concept snapshot (the exact message she paid against) read:

```
## Character List (15 players)

1. **Blaze/Blaire Kingston** – ...
...
15. **Ridge/Reagan Foster** – ...

### Optional Characters (for 16-18 players)

16. **Nitro/Nova Patel** – ...
17. **Crash/Crystal Yamamoto** – ...
18. **Timber/Tessa Wolfe** – ...

## Murder Method
...
```

Confirmed in the database: her package (`mystery_packages.id = bd82acd8-...`) has exactly the 15 core characters. `player_count` silently synced to 15. No error, no `needs_review`, nothing for any detector to catch — the extraction "succeeded," just at the wrong roster size.

`extractRosterFromMessage` (ADR-0057) reads numbered character lines after the `## Character List` header and, per its own comment, "tolerates subheadings/dividers between entries; stops only at a new section header that isn't itself another character-list header":

```ts
} else if (started) {
  if (/^#{2,3}\s+/.test(trimmed) && !sectionHeaderRegex.test(trimmed)) break;
}
```

`### Optional Characters (for 16-18 players)` is a `###` line that doesn't match `sectionHeaderRegex` (built from the `CHARACTER_LIST_HEADERS` allow-list — "Character List", "Characters", "Cast of Characters", etc.), so it broke the loop. Characters 16-18, correctly formatted, numbered, bold, were never read.

This is the same shape ADR-0057 already named: the model's wording for "here is more of the roster" is being tested against a hardcoded allow-list, and the allow-list doesn't (and can't) anticipate every phrasing a generation might use for "here are more characters, optional this time." ADR-0057 fixed *which message* gets chosen by switching from header-matching to structural parsing. This is the same fix applied one level down, inside the parse itself: *where the roster ends* was still decided by header text.

## Decision

Change the loop's stop condition from text-based to structural. On hitting an unrecognized `##`/`###` heading, peek at the next non-blank line: if it matches the character-line pattern, the heading is a divider (continue); if it doesn't, it's a real new section (stop).

```ts
if (/^#{2,3}\s+/.test(trimmed) && !sectionHeaderRegex.test(trimmed)) {
  let nextContentLine = '';
  for (let j = i + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (t) { nextContentLine = t; break; }
  }
  if (!characterLineRegex.test(nextContentLine)) break;
}
```

No new entry is added to `CHARACTER_LIST_HEADERS` or to any "these subheadings are OK to skip" allow-list. The question the parser asks is no longer "have I seen this exact subheading wording before" but "does the roster keep going after this line" — answerable from the message's own shape, not from a list a maintainer has to keep current.

## Rationale

- **Same root cause as ADR-0057, one layer deeper.** That ADR removed a header-text gate on *which message* is the roster. This removes a header-text gate on *where the roster ends within* that message. Leaving the second one in place would have reproduced the exact failure mode ADR-0057 already diagnosed, just past the point that fix covers.
- **The model's phrasing for "more characters, optional" will keep drifting**, the same argument ADR-0057 made for section titles: "Optional Characters," "Additional Players," "Bonus Cast," "Extra Suspects (for larger groups)" are all plausible model output for the same underlying situation dropping any one of them into an allow-list. A one-line lookahead check makes the wording irrelevant.
- **Structural, not exhaustive.** The fix doesn't need to know every way "here are more characters" could be phrased — it only needs to know what a character line looks like, which the parser already tracks for the main list.

## Alternatives Considered

- **Add "Optional Characters" to `CHARACTER_LIST_HEADERS` (or a second, "continuation-only" allow-list).** The literal one-line fix for this case. Rejected as the primary fix for the same reason ADR-0057 rejected it: it fixes the reported wording and leaves the next synonym to reproduce the bug on another customer. (The mechanism *is* still valuable as documentation — see Discussion.)
- **Stop treating any subheading as a divider; require the roster to be one unbroken run of numbered lines.** Rejected: this is what the code did *before* the "tolerate subheadings/dividers" behavior was added (per the existing comment), presumably because real rosters do get interrupted by dividers/notes. Removing that tolerance would trade this bug for the one it was added to prevent.
- **Ask the model to never split the roster across subheadings (prompt-level fix).** Doesn't help packages already affected, and the generation-side prompt is not the layer that should have to know about the extractor's parsing limitations — the parser should be robust to reasonable formatting choices, not the other way around.

## Consequences

- Roster parsing now follows the message's structure (do character lines keep appearing) instead of a maintained list of acceptable subheading text. Any wording — "Optional Characters," "Bonus Cast for Larger Groups," a translated equivalent — works as long as numbered/bold character entries actually follow it.
- Verified against the customer's real message (`messages.id = b5551341-...`): now extracts all 18 characters (was 15), and still correctly stops at `## Murder Method` immediately after — the lookahead does not overrun into unrelated prose.
- Scope check: queried all paid conversations whose approved concept snapshot mentions "Optional Characters." Only this customer's was affected; the one other match (`f106ef2c-...`, 20 players) had `player_count` already matching its actual character count.
- Regression coverage added to `scripts/__tests__/conceptSnapshot.test.mjs` (2 new checks): the optional-subheading continuation case, and a check that a genuine new section (prose, no character lines) still terminates parsing.
- **Not addressed by this fix:** the rename-doesn't-propagate bug the same customer reported (character name changes only update `mystery_characters.character_name`, not round scripts/clues/host guide text). Different subsystem, tracked separately.
- **Not addressed by this fix:** no customer-facing self-service way to regenerate a package once `generation_status.status = 'completed'`. This customer's fix requires a manual service-role re-trigger; there is no in-app path for her (or a future customer hitting a similar issue) to correct it herself before the package is finalized.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `extractRosterFromMessage`, header-path loop
- `scripts/__tests__/conceptSnapshot.test.mjs` — regression checks

## Discussion

The instinct, same as in ADR-0057, was to add the one string that would fix this exact ticket. It was rejected for the same reason: the underlying object being matched (a model's wording choice) is not a fixed vocabulary, and every fix scoped to specific text is a fix scoped to today's model output.

What made the structural fix cheap here is that the information needed — "does a character line follow" — was already available; the loop already knows how to recognize a character line, it just wasn't asking that question at the point where it needed to decide whether to stop. This mirrors ADR-0057's own observation: "the parsing capability was there all along; only the [decision point] lacked it."

Worth flagging honestly: this is a narrower, more local instance of the ADR-0057 pattern-recognition ("one concept, two predicates, expressed differently, updated independently") than the three-bugs-in-a-day cluster ADR-0057 was written against. This is one predicate (the stop condition) drifting against one implicit assumption (that unrecognized headings mean "new section"), not two independently-maintained predicates. It's recorded as an ADR anyway because the fix changes the parsing *policy* documented in ADR-0057's own comment block ("stop only at a new section header that isn't itself another character-list header") to something categorically different (peek at content, not header identity) — exactly the kind of tradeoff-bearing decision that should survive a rewrite, per ADR-0001's bar.
