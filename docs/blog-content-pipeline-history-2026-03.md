# SEO/GEO Changelog — mysterymaker.party

Tracks all SEO and GEO optimization work on the blog. EN is the source of truth; translations follow.

---

## March 9-12, 2026 — Voice Rewrite (All 58 Published EN Posts)

**What:** Complete rewrite of all published posts using the Jonathan Miller Voice System v2.

**Changes per post:**
- Rewrote in Jonathan's voice: "so" transitions, thinking-out-loud style, broken parallel structures
- Removed buzzwords and throat-clearing ("unlock", "elevate", "dive into", "buckle up")
- Added answer-first formatting (40-60 word answer nuggets at top)
- Added/improved FAQ sections
- Added CTAs to mysterymaker.party
- Removed author notes and template artifacts
- Cleaned up overly formal/academic tone

**Result:** All 58 posts passed voice quality checks. Old translations invalidated → all stale translations deleted.

**Reference:** `temp-files/jonathan_miller_voice_system_v2.md`, `temp-files/mystermaker_blog_audit_pipeline.md`

---

## March 12, 2026 — Merge Non-Survivor Archival

**What:** Archived 3 EN posts that were duplicates from the merge process.

**Posts archived:**
| Post | ID (prefix) | Reason |
|------|-------------|--------|
| Zombie "Running for Their Lives" | (merge non-survivor) | Duplicate of surviving Zombie post |
| Medical Examiner "Solving the Case" | (merge non-survivor) | Duplicate of surviving Medical Examiner post |
| Art Gallery "Whodunits" | (merge non-survivor) | Duplicate of surviving Art Gallery post |

**Also done:** Added 301 redirects in netlify.toml for archived slugs.

**Result:** EN published count: 61 → 58.

---

## March 12-14, 2026 — Phase B: Full Re-translation (12 Languages × 58 Posts)

**What:** Fresh translation of all 58 published EN posts into 12 target languages.

**Languages:** ES, IT, KO, FR, DE, DA, FI, NL, PT, SV, JA, ZH-CN

**Quality standard:**
- 100% target language (zero English except brand names)
- Natural sentence structure, localized dates/labels
- Full meta_description and meta_keywords translation
- All CTAs preserved with translated text, original URLs
- translation_of UUID linkage to EN source

**Result:** 58 × 13 = 754 published posts, all passing 10-point integrity validation.

---

## March 14, 2026 — Database Cleanup

**What:** Fixed several integrity issues discovered during Phase D validation.

| Issue | Fix |
|-------|-----|
| Stray `zh` row (should be `zh-cn`) | Deleted |
| 3 orphaned JA translations of archived posts | Deleted |
| 3 orphaned SV translations of archived posts | Deleted |
| 3 missing NL translations (had translated non-survivors instead of survivors) | Created |
| 3 missing PT translations (same issue) | Created |
| 5 SV theme values translated to Swedish instead of keeping EN | Fixed via UPDATE |

**Result:** All 13 languages × 58 posts, all integrity checks green.

---

## March 14, 2026 — SEO/GEO Audit of 58 Published EN Posts

**What:** Structured audit against `seo-geo-playbook.md` checking: content length, meta descriptions, updated dates, stats/citations, CTAs, FAQ sections, H2 counts.

**Findings:**

| Check | Result |
|-------|--------|
| Content length (>2000 words target) | ✅ All 58 pass |
| Meta descriptions | ✅ All 58 have them |
| H2 structure (3+ per post) | ✅ All 58 pass |
| FAQ sections | ✅ All 58 have them |
| CTAs to mysterymaker.party | ⚠️ 4 missing → fixed (see below) |
| "Last updated" dates | ⚠️ 16 missing → fixed (see below) |
| Stats/citations/expert quotes | ❌ 34/58 missing → GEO enrichment needed |

---

## March 14, 2026 — Quick Fixes (Dates + CTAs)

### "Last Updated" Dates Added to 16 Posts

**What:** Added `*Last updated: March 14, 2026*` to the top of 16 EN posts that were missing date stamps.

**SQL:** `UPDATE blog_posts SET content = '*Last updated: March 14, 2026*' || E'\n\n' || content WHERE language = 'en' AND status = 'published' AND content NOT LIKE '%Last updated%' AND content NOT LIKE '%Updated:%';`

**Result:** 58/58 EN posts now have "Last updated" dates.

### CTAs Added to 3 Posts

| Post | ID (prefix) | CTA Added |
|------|-------------|-----------|
| Space Station Murder Mystery | 3cb1b819 | "Ready to launch your own space station mystery? Head over to [MysteryMaker](https://mysterymaker.party) and generate one in minutes." |
| Guests Breaking Character | 4662e124 | "Want a mystery that's built to keep everyone in character from the start? Try [MysteryMaker](https://mysterymaker.party)..." |
| Medieval Castle Murder Mystery | e74da71a | "Ready to build your own castle intrigue? Head over to [MysteryMaker](https://mysterymaker.party)..." |

**Note:** Jazz Club (42a2278c) already had a CTA with relative URL `/mystery-generator`. Vintage Circus (dd7e012f) confirmed to already have CTA.

**Result:** 58/58 EN posts now have CTAs.

---

## March 14-15, 2026 — GEO Enrichment Completed (34 EN Posts)

**What:** Added 2-3 statistics, expert quotes, and/or sourced citations to 34 EN posts that were missing GEO signals.

**Status:** All 6 batches executed and verified. 58/58 EN posts now have stats/citations.

---

## March 15, 2026 — Translation Propagation (12 Languages × 37 Posts)

**What:** Re-translated ~37 updated EN posts across all 12 languages to sync GEO-enriched content.

**Languages completed:** ES, IT, KO, FR, DE, DA, FI, NL, PT, SV, JA, ZH-CN

---

## March 15, 2026 — CRITICAL: Finnish Content Corruption Discovered

**What:** The Finnish propagation session (or possibly earlier sessions) overwrote content across nearly every language — including 21 EN source posts — with the Finnish Cruise Ship article (33,468 chars of Finnish text pasted into unrelated posts).

**Root cause:** Unknown. A propagation session wrote the same Finnish content into random rows across all languages.

**Damage assessment:**
| Language | Corrupted | Clean |
|----------|-----------|-------|
| EN | 21 | 37 |
| DA | 58 | 0 |
| DE | 57 | 1 |
| ES | 58 | 0 |
| FI | 56 | 2 |
| FR | 58 | 0 |
| IT | 58 | 0 |
| JA | 43 | 15 |
| KO | 58 | 0 |
| NL | 55 | 3 |
| PT | 21 | 37 |
| SV | 21 | 37 |
| ZH-CN | 48 | 10 |

**Total corrupted rows:** ~573 out of 754 published posts

**Additionally found:** 2 EN posts (Date Night, Cruise Ship) were truncated during GEO enrichment (separate issue, not Finnish corruption).

**Recovery source:** `temp-files/Blog Database - Master.csv` contains original pre-voice-rewrite content for all 21 corrupted EN posts (13K-27K chars each) plus translations in all 12 languages.

**Recovery plan:**
1. Restore 21 + 2 EN posts from CSV → voice rewrite + GEO enrich (3 batch prompts in `EN_RECOVERY_BATCH_PROMPTS.md`)
2. Re-translate all corrupted translations from corrected EN source
3. Verify all 754 published posts are clean

---

## March 15, 2026 — EN Recovery COMPLETE (23 Posts)

**What:** Restored 21 corrupted + 2 truncated EN posts. Each post: CSV source → voice rewrite (Jonathan Miller v2) → GEO enrichment (stats/citations) → Supabase.

**Method:** 21 parallel agents (1 post per agent, 3 waves of 7). Each agent independently read CSV, voice system, research packs, and SEO playbook.

**Results:** 23/23 CLEAN, all 12,049–28,691 chars (min requirement: 10,000). All have Last Updated date, FAQ sections. Minor: 7 posts missing exact CTA URL pattern, 6 missing exact stats keyword pattern (content present but phrasing differs from LIKE check).

**Verification query run:** All 23 posts confirmed CLEAN with no Finnish content markers.

---

## March 16-17, 2026 — Full Recovery: New Approach (Excel-First)

**What:** After a second corruption (Dutch mass-overwrite replacing all 754 rows), pivoted to an Excel-first recovery strategy. All work done locally in Excel, with a single bulk push to Supabase at the end.

**Architecture:** Excel (.xlsx) = source of truth. Supabase = production DB, written to ONLY via bulk import from validated Excel. No agents ever write to Supabase directly.

### Phase 1 — Excel Created ✅
- Created `mysterymaker_blog_master.xlsx` with Master (58 rows wide format), Import (754 rows long format), Status Tracker, README
- All 58 slugs × 13 languages with Supabase UUIDs populated

### Phase 2 — Skipped
- Decided not to restore corrupted CSV content to Supabase; will do single push at end

### Phase 3a — Voice Rewrite (58 EN Posts) ✅
- All 58 EN posts rewritten using Jonathan Miller Voice System v2
- Two-pass approach: voice-only first, GEO second
- Buzzword cleanup pass: removed genuinely, honestly, straightforward, leverage, landscape, innovative, etc.
- Fixed 9 missing FAQ sections, 9 missing CTAs
- All 58 posts validated: 2000+ words, FAQ present, CTA present, no buzzwords

### Phase 3b — GEO Enrichment (58 EN Posts) ✅
- Added real statistics with actual numbers ($, %, billion, million) from research packs
- Added expert quotes and sourced citations
- Used 22 theme-specific research packs + general_market_stats.md fallback
- Final validation: 58/58 have detectable stats, FAQ, CTA, no buzzwords
- All content loaded back into Excel Master + Import sheets

### Phase 4 — Translation (58 Posts × 12 Languages) — IN PROGRESS

**Method:** Claude agents translate 3 posts per batch, 3 agents in parallel, one language at a time. All output written to local files, then bulk-loaded into Excel.

**Progress:**
| Language | Total | Completed | Status |
|----------|-------|-----------|--------|
| ES | 58 | 58 | ✅ DONE |
| FR | 58 | 58 | ✅ DONE |
| DE | 58 | 58 | ✅ DONE |
| IT | 58 | 1 | 🔄 IN PROGRESS |
| DA | 58 | 0 | QUEUED |
| FI | 58 | 0 | QUEUED |
| NL | 58 | 0 | QUEUED |
| SV | 58 | 0 | QUEUED |
| PT | 58 | 0 | QUEUED |
| KO | 58 | 0 | QUEUED |
| JA | 58 | 0 | QUEUED |
| ZH-CN | 58 | 0 | QUEUED |

### Phase 5 — Bulk Push to Supabase — PENDING
- Single bulk import: Excel Import sheet (754 rows) → Supabase UPDATE statements
- One UPDATE per row using supabase_id

---

## ~~Completed: GEO Enrichment (34 EN Posts)~~ — Partially Lost to Corruption

**What was done:** All 6 batches of GEO enrichment were executed and verified on March 14-15. 58/58 EN posts had stats/citations.

**Current state:** 37 of those EN posts survived the corruption. The 21 corrupted EN posts lost their GEO enrichment and are being re-done as part of the EN Recovery above (CSV → voice rewrite → GEO signals all in one pass).

**Reference:** `temp-files/GEO_ENRICHMENT_BATCH_PROMPTS.md` (6 batches), `temp-files/GEO_ENRICHMENT_PLAN.md`

---

## ~~Completed: Translation Propagation (~37 Posts × 12 Languages)~~ — Lost to Corruption

**What was done:** All 12 languages were re-translated for the 37 GEO-enriched posts on March 15.

**Current state:** This propagation session caused (or coincided with) the Finnish corruption. All translation work from this session is invalid and must be redone after EN recovery.

---

## Pending: 319 Draft Posts — Full Pipeline

**What:** Voice rewrite → SEO/GEO optimization → translation for 319 draft EN posts.

**Pipeline:**
1. Triage (EDIT/MERGE/CUT/KEEP) using `temp-files/mystermaker_blog_audit_pipeline.md`
2. Voice rewrite using Jonathan Miller Voice System v2
3. SEO/GEO optimization (answer-first, FAQs, CTAs, stats/citations)
4. Translate into 12 languages

**Estimated effort:** 30+ conversations for voice rewrite, 12 for translation
