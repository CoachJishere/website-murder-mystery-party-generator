# Brief: Rewrite shallow "Quick answer" intros across the blog corpus

## Context

- **Product**: mysterymaker.party — AI-powered custom murder mystery party generator ($24.99/mystery, 13 languages, 5,400+ blog posts)
- **Tech**: React + Vite + Supabase. Project ID `mhfikaomkmqcndqfohbp` (EU Central). All blog content in `public.blog_posts.content` as markdown.
- **AEO/GEO strategy**: each blog post starts with a `> **Quick answer:** ...` markdown blockquote intended to give ChatGPT search, Perplexity, Google AI Overview, and similar engines a clean extractable snippet at the top of the page.

## Problem

The current Quick answers across the corpus are shallow keyword-stuffing. They tick the structural box (an answer-first blockquote at the top of the post) but fail the actual extraction job — they don't answer the question implied by the post title.

### Real example from `1920s-speakeasy-murder-mystery-party-guide` (EN)

```
> **Quick answer:** Plan the ultimate 1920s murder mystery with prohibition-era themes, jazz-age characters, and authentic speakeasy atmosphere.
```

This doesn't tell anyone *how* to do anything. A Perplexity user asking "how do I host a 1920s speakeasy murder mystery?" gets a noise snippet, not value. Saves and trust signals don't fire.

## Goal

Rewrite the `> **Quick answer:** ...` line in every published post (EN first, then translations) to a high-quality, action-oriented, AI-extractable answer that:

- **Directly answers the implied question** in the post title
- **Includes 2-4 concrete actions** (verbs: pick, set, run, give, decide, choose)
- **Uses specific numbers where possible** (group size, time blocks, round count)
- **50-90 words** (fits the AI Overview snippet slot well; under 100 words for full extraction)
- **Self-contained** — extractable without prior context
- **Plain language, not keyword-stuffed**
- **Same markdown format**: `> **Quick answer:** ...` (one blockquote line, bolded label)

## Bad vs good

### Bad (current state)

```
> **Quick answer:** Plan the ultimate 1920s murder mystery with prohibition-era themes, jazz-age characters, and authentic speakeasy atmosphere.
```

Three theme keywords stacked. No action. No specifics. No answer.

### Good (rewrite target)

```
> **Quick answer:** To host a 1920s speakeasy murder mystery, gather 6-10 friends, give each a Prohibition-era character with a hidden secret, and set the scene with dim lighting, jazz, and cocktail coupes. Run the night across three rounds — cocktails (introductions), dinner (clue drops), accusations. Custom characters built around your guests' real personalities outperform generic kits every time.
```

Answers the implied question. Three concrete actions (gather → assign → set scene → run). Specific numbers (6-10, three rounds). Closes with an actual insight.

## Process

### 1. Scope first

Before any rewrites, run these queries to understand the corpus state:

```sql
-- How many EN published posts have a Quick answer line at all?
select count(*) from public.blog_posts
where language = 'en' and status = 'published'
  and content ilike '%quick answer:%';

-- Sample 20 random EN published Quick answers to assess variance
select slug, substring(content from 'Quick answer:[^\n]+') as current_answer
from public.blog_posts
where language = 'en' and status = 'published'
  and content ilike '%quick answer:%'
order by random() limit 20;

-- Per-language breakdown
select language, count(*) from public.blog_posts
where status = 'published' and content ilike '%quick answer:%'
group by language order by count(*) desc;
```

Estimate: ~105 EN published posts, with translation variants likely yielding 1,000-1,300 total cells in scope. Some Quick answers may already be good — don't rewrite those. Triage: keyword-stuffed shallow answers vs answers that already give actions.

### 2. Per-post rewrite

For each post needing a rewrite:

1. Read the post **title** (it's the implied question)
2. Read the **first 1-2 paragraphs after the Quick answer** (gives voice/specificity)
3. Skim the **H2 structure** (gives the action steps the post teaches — your Quick answer should mirror these)
4. Generate the new Quick answer following the format above
5. UPDATE the `content` field, replacing **only** the Quick answer line — preserve everything else verbatim

**Critical**: Do not invent content. If the post doesn't cover "three rounds" or "6-10 friends", don't put those in the answer. Base each answer on what the post actually teaches.

### 3. Translations

Each EN post has up to 12 translation variants linked via `translation_of` (uuid → EN parent post id). Languages: DA, DE, ES, FI, FR, IT, JA, KO, NL, PT, SV, ZH-CN.

After EN is rewritten:

1. Pull the translation variants:
   ```sql
   select id, language, slug, substring(content from 1 for 300) as opening
   from public.blog_posts
   where translation_of = '<en-post-uuid>';
   ```
2. Rewrite each variant's Quick answer in the **locale's native voice**, not via machine translation
3. Maintain **identical action structure** across languages — same number of steps, same specific numbers — so an AI engine extracting in any locale gets equivalent value
4. Use locale-canonical phrasing (e.g., German "Schnellantwort" or "Schnelle Antwort" — match the existing pattern in DE posts; Japanese 「すぐに答え」 etc.) — sample existing translations to find the canonical label per language before rewriting

### 4. Audit trail

Apply each rewrite via Supabase MCP `execute_sql` (it's a content UPDATE, not a schema change, so `apply_migration` is overkill). Group by slug — one UPDATE per row, scoped via `where id = '<uuid>'`.

For batch progress tracking, write completed slugs to a local triage file (e.g., `temp-files/quick-answer-rewrite-progress.jsonl`) with `{slug, language, before, after, timestamp}` so a re-run is idempotent.

## Constraints

- **One UPDATE per slug × language** — never bulk-regex-replace; each rewrite must be informed by reading the post
- **Preserve all other content verbatim** — only the `> **Quick answer:** ...` line changes
- **Native voice for translations** — no machine-translation residue. If the language already had a Quick answer with a non-canonical label, normalize the label to match other posts in that language
- **No content invention** — answers must be grounded in what the post actually covers
- **Length discipline** — 50-90 words. Reject any draft outside that range.

## Schema and rendering

No code or schema changes needed. The blog post page (`src/pages/BlogPost.tsx`) renders post content via ReactMarkdown; markdown blockquotes (`>`) render as `<blockquote>` automatically.

## Validation (sample 10 random rewrites)

For each:

- [ ] Title implies a question
- [ ] Quick answer answers that question (a non-domain-expert reader could act on it)
- [ ] 50-90 words
- [ ] 2-4 concrete actions present
- [ ] Specific numbers, named items, or named steps included
- [ ] Reads aloud as a useful 30-second summary, not a keyword salad
- [ ] No invented content (everything maps to something the post body covers)

## Out of scope

- Rewriting any other part of the post body (intro paragraphs, H2 sections, FAQ, etc.)
- Creating new posts
- Schema changes
- Other AEO/GEO concerns beyond the Quick answer specifically (e.g., FAQPage schema is already complete per recent CHANGELOG work — don't touch it)
- Pinterest pipeline (separate workstream, not affected by this work)
