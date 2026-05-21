# ADR-0012: Brand-Leak Sanitization at the xlsx → Supabase Boundary, Not Downstream

- **Status:** Accepted
- **Date:** 2026-05-21 (decision made May 2026, captured retroactively)

## Context

The blog content pipeline has this rough shape:

```
LLM authoring → blog_map.xlsx → sync-blog-map.mjs → blog_posts (Supabase)
                                                    → blog.mysterymaker.party (live site)
```

`blog_map.xlsx` is a wide spreadsheet with one row per slug and language-specific columns for title, content, meta, and keywords across 13 locales. It's the human-editable working file; `sync-blog-map.mjs` syncs it into the `blog_posts` table on each run.

In May 2026 we discovered systematic **brand-leak rot** in the LLM-authored content that landed in the xlsx and propagated to live blog posts. Four shapes:

- **A. Bare-phrase brand-as-URL.** `mysterymaker.party` appearing as bare prose ("visit mysterymaker.party for…") with no protocol prefix. Looked like a URL in context but rendered as plain text — broken link, broken UX. Caused by the LLM mistakenly treating the brand string as a URL token.
- **B. Translated-brand + `.party`.** JA/ZH/KO translations of the brand name with `.party` still attached as if part of the URL — `ミステリーメーカー.party`, `미스터리메이커.party`, `神秘制造者.party`. Brand name was translated; the URL fragment wasn't.
- **C. Path B parenthetical redundancy.** Earlier cleanup produced `MysteryMaker (MysteryMaker)` patterns — the cleanup's own residue.
- **D. Path B preposition/particle redundancy.** Triple-brand mentions like `MysteryMaker with MysteryMaker` or `MysteryMakerはMysteryMaker` from MT making the brand string a translation target.
- **E.** Separately: a `**Last updated: <month> <year>**` header that the LLM filled with stale dates and that drifted away from the actual freshness signal we want to send Google.

We initially fixed these via **one-shot SQL `UPDATE` statements** against `blog_posts` on 2026-05-10 and 2026-05-11. That cleaned the existing rot but did nothing to stop the next sync from re-introducing it — `blog_map.xlsx` still contained the source patterns.

The question: **where in the pipeline should the cleanup live so it's not a treadmill?**

Three rough options:

1. **Clean at every downstream consumer.** Sanitize during render (in the React blog component, in RSS, in llms.txt, etc.). Many places, each fragile.
2. **Clean at the source.** A separate `clean-blog-map.mjs` that mutates `blog_map.xlsx` in place. Authoritative, but only runs when invoked, and the xlsx is also human-edited.
3. **Clean at the xlsx → Supabase write boundary.** Sanitize once, at the single chokepoint where xlsx becomes the live data source. `blog_map.xlsx` may still contain rot; `blog_posts` never does.

The 2026-05-10/11 SQL cleanup gave us the working regex patterns; the question was where they should live going forward.

## Decision

**Sanitize at the xlsx → Supabase write boundary inside `sync-blog-map.mjs`, via a shared `_brand-sanitizer.mjs` module. Mirror the regex blocks from the historical SQL cleanup; share them between the boundary sanitizer and the one-shot xlsx cleaner.**

Concrete shape:

- **`scripts/_brand-sanitizer.mjs`** exports `sanitizeBrandLeakRot(content, lang)` and `bumpLastUpdated(content, lang)`. Contains the four regex blocks (A–D) plus the per-language last-updated header bumper (E).
- **`sync-blog-map.mjs`** imports both and runs them on every cell's content during the xlsx → Supabase write. Every published-row upsert and every draft-row insert flows through sanitization.
- **`scripts/clean-blog-map.mjs`** (one-shot) imports the same module and writes the cleaned content back to `blog_map.xlsx` — for when we want the source-of-truth file to also be clean (e.g. before a human review pass).
- **Mirroring the SQL patterns is intentional and load-bearing.** The 2026-05-10/11 SQL cleanup is the historical record of what the rot looked like; the regex blocks here are the same patterns expressed in JS. If new rot shapes emerge they get added as block F, G, etc. in both places.
- **Last-updated bumper auto-bumps to the current month/year per language on every sync.** Turns a manual periodic freshness update into a continuous signal — the date is current as of the last sync, not as of whenever a human last edited the cell. Reads to Google and to users as continuous maintenance.

**The xlsx itself is not the source of truth for cleanliness.** It can contain rot indefinitely; cleanup happens at the boundary. This is the point of choosing this layer.

## Consequences

**Positive:**
- **Live data is permanently clean.** Whatever the xlsx contains, `blog_posts` only ever has sanitized content. The site, RSS, llms.txt, sitemap, and every other downstream consumer reads from `blog_posts` and inherit cleanliness for free.
- **One place to add new patterns.** When a new rot shape appears, add a block to `_brand-sanitizer.mjs`. The next sync cleans every row. No multi-consumer coordination.
- **Cleanup is idempotent.** Running sync twice produces the same output. The regexes are safe to re-apply.
- **Last-updated freshness is continuous.** Every sync stamps the current month/year. No human has to remember to bump it; no staleness signal to Google from drift.
- **Shared module = symmetric tooling.** `sync-blog-map.mjs` (boundary cleanup) and `clean-blog-map.mjs` (source cleanup) run the same predicates. Patterns can't drift between the two.
- **xlsx remains editable by humans.** We didn't have to put cleanup behavior into the editing surface — the xlsx is a working file, and humans can write whatever they want; the boundary fixes it.

**Negative:**
- **xlsx and DB disagree by design.** A future contributor opening `blog_map.xlsx` and grep'ing for `mysterymaker.party` will find matches and possibly assume that's what's live. Mitigated by the header comment in `_brand-sanitizer.mjs` documenting the relationship and by `clean-blog-map.mjs` existing as the optional xlsx-side cleaner.
- **Regex sanitization is a precision tool.** Each block has to be tested against real content; over-broad regexes risk damaging legitimate text. Documented per-block in the comments (e.g. block A's negative lookbehind exempts `https://`, `://`, `@`, `www.` forms). The risk is real but managed via narrow patterns.
- **The bumper is not aware of "actually edited" vs "synced." Every sync bumps the date** to current month/year regardless of whether the underlying content changed. Acceptable because (a) the cell's existence in the published queue *is* an editorial decision and (b) this is the freshness signal we want Google to see. If a human ever wants to "freeze" a date this approach prevents that; we have not needed it.
- **Couples the sync script to content cleanup.** Anyone running `sync-blog-map.mjs` has to deploy the sanitizer too. Acceptable because they're in the same repo and the script imports the module relative.

**When to revisit:**
- **If the LLM authoring upstream is changed** to one that doesn't produce these specific rot shapes, the blocks should stay as defense in depth, not be removed. Cost of running them is negligible; cost of being wrong about "we don't need them anymore" is broken live content.
- **If a new locale is added,** add it to the `MONTH_NAMES` table and the date bumpers list. The brand-leak blocks (A–D) are pattern-based and don't need per-locale entries unless the new locale produces a new translated-brand shape.
- **If we ever move to a CMS where humans edit live content directly** (not via xlsx → sync), the sanitizer needs to move into the CMS write path or into a pre-commit hook on whatever the new editing surface is. The principle — sanitize at the boundary, not at every consumer — should carry across.
- **If false positives are observed** (legitimate text accidentally rewritten), narrow the offending regex rather than disabling the block.

## Rejected alternatives

- **Sanitize at every downstream consumer.** Rejected: O(consumers) places to keep in sync; each render path has different concerns; new consumers (llms.txt, RSS, sitemap) would all need to remember to call the sanitizer. The boundary is the natural chokepoint — past the boundary, content is "the truth," so cleaning there is cleaning once.
- **Sanitize at the source (`clean-blog-map.mjs` only, no boundary cleanup).** Rejected as the *only* mechanism: relies on someone remembering to run the cleaner before sync. The boundary cleanup means even an un-cleaned xlsx still ships clean content. We kept `clean-blog-map.mjs` as an optional cleanup pass for the source file but don't depend on it.
- **One-shot SQL cleanup only.** Rejected: cleans existing rot but doesn't prevent the next sync from re-introducing it. The SQL was the right move on 2026-05-10/11; the boundary cleanup is what makes the fix permanent.
- **Manual content review per cell.** Rejected at 350+ rows × 13 languages. Pattern-based cleanup catches all instances; human review catches only the ones a human noticed.
- **An ML or LLM-based content cleaner.** Rejected as over-engineered. The rot shapes are well-described by deterministic regexes; introducing model inference into the sync path adds latency, cost, and non-determinism for no precision gain over targeted regexes.
- **Sanitize at xlsx-read time but skip the date bumper.** Rejected: while you're already at the boundary, bumping the date is free and the freshness signal is real. Keeping them coupled makes the boundary "the place where xlsx becomes live data, including its temporal stamp."
