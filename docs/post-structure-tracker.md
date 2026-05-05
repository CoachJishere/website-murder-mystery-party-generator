# #9 Structural Improvements Tracker

Cell-by-cell content edits for SEO/AEO/GEO. **No regex against multiple rows. No bulk operations. One slug + one language per UPDATE.**

## Workflow per post

1. Pull the EN content for one slug
2. Identify the specific structural improvement (numbered TOC, table, bullet list, H3 split, etc.)
3. Propose the exact edit (before/after snippet)
4. Apply via `UPDATE blog_posts SET content = ... WHERE id = X` — single row scoped
5. Verify
6. Translate the SAME structural change to each of the 12 non-EN versions of that slug, one row at a time
7. Mark slug done below
8. Move to next

## Status legend

- 🔲 todo
- 🟡 EN done, translations pending
- ✅ all 13 langs done

## Priority 1: Listicle posts (29) — numbered TOC of the 5 themes at top

GEO value: massive. AI engines love numbered lists for "what are 5 X themes?" queries.

| # | Slug | Status |
|---|------|--------|
| 1 | 5-haunted-library-murder-mystery-themes-... | ✅ all 13 langs |
| 2 | 5-haunted-mansion-murder-mystery-themes | ✅ all 13 langs |
| 3 | 5-ancient-egyptian-temple-murder-themes | 🟡 12/13 — KO skipped (themes 3-5 missing in body, needs content rewrite first) |
| 4 | 5-ancient-greece-murder-mystery-themes-... | ✅ all 13 langs |
| 5 | 5-ancient-rome-murder-mystery-themes-... | ✅ all 13 langs |
| 6 | 5-beach-resort-murder-mystery-themes-... | ✅ all 13 langs |
| 7 | 5-casino-murder-mystery-party-themes-... | 🟡 EN only — non-EN needs full content restructure (no theme H2s present) |
| 8 | 5-enchanted-forest-murder-mystery-themes-... | ✅ all 13 langs |
| 9 | 5-gothic-romance-murder-mystery-themes-... | 🟡 EN only — non-EN needs full content restructure (only ~2 theme H2s present) |
| 10 | 5-masquerade-ball-murder-mystery-themes-... | ✅ all 13 langs |
| 11 | 5-medieval-tournament-murder-mystery-themes-... | ✅ all 13 langs |
| 12 | 5-mountain-lodge-murder-mystery-themes-... | ✅ all 13 langs |
| 13 | 5-noir-detective-murder-mystery-themes-... | ✅ all 13 langs |
| 14 | 5-old-hollywood-murder-mystery-themes-... | ✅ all 13 langs |
| 15 | 5-pirate-ship-murder-mystery-themes-... | ✅ all 13 langs |
| 16 | 5-prohibition-speakeasy-murder-mystery-themes | ✅ all 13 langs |
| 17 | 5-renaissance-fair-murder-mystery-themes-... | ✅ all 13 langs |
| 18 | 5-renaissance-murder-mystery-party-themes | ✅ all 13 langs |
| 19 | 5-roaring-twenties-murder-mystery-themes-... | ✅ all 13 langs |
| 20 | 5-royal-palace-murder-mystery-themes-... | ✅ all 13 langs |
| 21 | 5-secret-agent-murder-mystery-themes-... | ✅ all 13 langs |
| 22 | 5-secret-society-murder-mystery-themes-... | ✅ all 13 langs |
| 23 | 5-spy-thriller-murder-mystery-themes-... | 🟡 EN only — non-EN needs full content restructure (bold-text headings instead of H2s) |
| 24 | 5-university-campus-murder-mystery-themes-... | ✅ all 13 langs |
| 25 | 5-vampire-ball-murder-mystery-themes-... | ✅ all 13 langs |
| 26 | 5-victorian-london-murder-mystery-themes-... | ✅ all 13 langs |
| 27 | 5-viking-longship-murder-mystery-themes-... | ✅ all 13 langs |
| 28 | 5-vintage-circus-murder-mystery-themes-... | ✅ all 13 langs |
| 29 | 5-wild-west-ghost-town-murder-mystery-themes-... | ✅ all 13 langs |

## Priority 2: Comparison/review posts (~7)

Tables already added to:
- ✅ best-murder-mystery-party-games-review (EN only — translations pending)

Other comparison posts (mostly drafts, will publish over coming year):
| Slug | Status |
|------|--------|
| best-murder-mystery-party-games-review | 🟡 EN table done |
| ai-generated-murder-mystery-vs-prewritten-kits (draft) | 🔲 |
| best-dinner-party-games-for-adults (draft) | 🔲 |
| best-icebreaker-games-for-adult-parties (draft) | 🔲 |
| best-murder-mystery-board-games-review (draft) | 🔲 |
| best-murder-mystery-books-for-party-inspiration (draft) | 🔲 |
| best-murder-mystery-generators-online-review (draft) | 🔲 |
| best-murder-mystery-kits-buying-guide (draft) | 🔲 |
| best-murder-mystery-party-apps-tools (draft) | 🔲 |
| best-murder-mystery-podcasts-for-inspiration (draft) | 🔲 |
| best-murder-mystery-tv-shows-movies-inspiration (draft) | 🔲 |
| best-party-games-for-groups-of-10 (draft) | 🔲 |
| diy-murder-mystery-vs-store-bought-kits (draft) | 🔲 |
| free-vs-paid-murder-mystery-games-comparison (draft) | 🔲 |
| murder-mystery-escape-room-kits-comparison (draft) | 🔲 |
| murder-mystery-in-a-box-review-guide (draft) | 🔲 |
| murder-mystery-subscription-boxes-review (draft) | 🔲 |
| murder-mystery-vs-escape-room-which-is-better (draft) | 🔲 |
| whodunit-vs-murder-mystery-differences (draft) | 🔲 |

## Priority 3: how-to-fix-X posts (12)

Numbered fix steps near the top.

## Priority 4: how-to-host-X guides (10)

Setup checklist near the top.

## Priority 5: Remaining theme/setting/character posts

Lower leverage; save for last.

## Notes

- Each EN-side change must be propagated to the 12 corresponding non-EN rows (same slug)
- Use `UPDATE blog_posts SET content = ... WHERE id = X` — never WHERE matching multiple rows
- Verify each row's `content` after each UPDATE
