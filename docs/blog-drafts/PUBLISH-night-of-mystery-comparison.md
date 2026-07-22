# Publish Runbook — night-of-mystery-vs-custom-ai-murder-mystery-kit

**Written:** 2026-07-22. Self-contained: assumes a cold Claude session with no memory of the prep work.
**Draft:** `docs/blog-drafts/night-of-mystery-vs-custom-ai-murder-mystery-kit.md` (frontmatter = DB metadata; everything below the HTML comment = exact `content` column value).
**Why this post:** GSC surfaced "night of mystery reviews" (21 impressions, pos 9, buyer/comparison intent) week of 2026-07-21. Goal: rank for the competitor-review query and intercept mid-comparison buyers.

## ⚠️ Pipeline facts that WILL bite you if forgotten

1. **`blog_map.xlsx` (repo root) is the source of truth, not Supabase.** `scripts/sync-blog-map.mjs` syncs xlsx → Supabase and **DELETES all Supabase draft rows and re-inserts them from the xlsx** on every run. Never stage this post by inserting directly into Supabase as a draft — it will be silently wiped.
2. **The xlsx is fragile** (36MB; transient corruption on exceljs round-trips; possible concurrent writers from parallel agent sessions). Write via: copy to tmp → edit → read back and verify → atomic rename over original. Verify no other session is mid-write.
3. **FAQ schema and the CTA are auto-generated** by `src/pages/BlogPost.tsx`. Do NOT paste JSON-LD or a CTA block into the content. FAQPage schema is parsed from `## Frequently Asked Questions` + `### Question?` headings (the draft already matches Pattern 1).
4. **Publishing is a gated workflow, not a status flip.** Use `.github/workflows/publish-specific-slugs.yml` — it handles status flip (all 13 langs), cross-link application with dead-link guard, TOC, rot-gate, IndexNow, GSC sitemap submit, llms.txt regeneration, and the prerender deploy. Flipping `status` by hand in SQL skips all of that.
5. **Deploy re-run hazard:** if the triggered Pages deploy fails and you re-run it, it errors with "Multiple artifacts named github-pages". Trigger a **fresh** run instead of re-running.

## Steps

### 1. Pre-publish content check (5 min)
- [ ] Pricing claims are written generically ("often per guest tier" / "flat price") — skim nightofmystery.com to confirm still accurate; adjust wording if their model changed.
- [ ] Confirm `/blog/best-murder-mystery-games-2026` is still live (draft links to it).
- [ ] Confirm tone still reads fair/non-disparaging (deliberate: competitor is credited as reputable throughout).

### 2. Add row to `blog_map.xlsx`
- Column layout (verify against header row before writing — from `scripts/sync-blog-map.mjs` LANGS map): col 1 = slug, col 3 = status, cols 4–7 = EN title/content/meta_description/meta_keywords, then per-language groups of 4 up to col 55 (es 8–11, fr 12–15, de 16–19, it 20–23, da 24–27, fi 28–31, nl 32–35, sv 36–39, pt 40–43, ko 44–47, ja 48–51, zh-cn 52–55).
- Copy title/content/meta/keywords from the draft file's frontmatter + body.
- Use the safe-write procedure from warning #2. Check col 2's header and fill if it carries data for other rows.

### 3. Translate into the 12 other languages
- Do translations **in-session** (Claude Code session tokens — NOT a metered API key; per global rule, no paid API without explicit permission).
- Follow conventions in `temp-files/BLOG_TRANSLATION_EXECUTION_PLAN.md`: translate title/content/meta/keywords per language into the xlsx columns; keep `theme` value in English; keep the FAQ heading translatable (BlogPost.tsx's regex recognizes all 13 languages' FAQ headings); keep internal link URLs unchanged (language prefix is handled by the router).
- Do NOT publish EN-only: the site's integrity checks and hreflang clusters assume 13-language parity, and the publish workflow flips all languages for the slug.

### 4. Sync to Supabase
- `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/sync-blog-map.mjs` (project `mhfikaomkmqcndqfohbp`).
- Verify: 13 new rows with `slug='night-of-mystery-vs-custom-ai-murder-mystery-kit'`, `status='draft'`.
- **Sync does not carry theme/tags/translation_of.** After sync, set via SQL on the 13 rows: `theme='formats-tools'`, `tags=array['formats-tools','comparisons']`, and `translation_of` = EN row's id on the 12 non-EN rows (match the pattern used by existing posts).

### 5. Register in the cross-link graph (`cross_link_map.json`, repo root)
- Add an entry for the new slug with `links_to`: `["best-murder-mystery-games-2026", "murder-mystery-party-ideas"]` (draft already links to games-2026 in-body).
- **Reciprocal link:** `best-murder-mystery-games-2026` (published) already discusses Night of Mystery — add an insertion so it links to this post (follow the `insertions` format: `target_slug` + `match_text` + `replacement`). This is the highest-value inbound link for the target query.
- Run `node scripts/audit-crosslinks.mjs` to validate.

### 6. Publish (expedited — don't wait for the daily queue)
- The daily workflow (`publish-daily-blog.yml`) picks drafts by link-graph in-degree; a new leaf post could sit for months. The target query is live **now**, so expedite:
- `gh workflow run publish-specific-slugs.yml -f slugs=night-of-mystery-vs-custom-ai-murder-mystery-kit`
- Watch the run; if the prerender deploy fails, trigger a fresh deploy run (see warning #5).

### 7. Post-publish verification
- [ ] `https://www.mysterymaker.party/blog/night-of-mystery-vs-custom-ai-murder-mystery-kit` renders; prerendered HTML (curl, not browser) contains the title + meta description.
- [ ] View-source shows `FAQPage` JSON-LD with both questions (auto-generated). Optionally run Google's Rich Results test.
- [ ] Spot-check 2–3 language variants + hreflang cluster (`node scripts/audit-hreflang.mjs`).
- [ ] The reciprocal link is live inside `best-murder-mystery-games-2026`.

### 8. Record + measure
- [ ] CHANGELOG.md entry (publish event) + vault changelog sync.
- [ ] Close the vault note `00_INBOX/night-of-mystery-comparison-publish-2026-07-22-mystery-maker.md` (status: open → resolved).
- [ ] Add "night of mystery reviews" to the weekly SEO digest watch list; re-measure position/CTR ~4 weeks after publish.
