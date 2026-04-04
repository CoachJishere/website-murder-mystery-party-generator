# Cross-Linking Plan for Blog Posts

## Status: Phase 1 ready to execute

## Overview
421 blog posts across 13 languages currently have zero blog-to-blog cross-links. The SEO playbook identifies internal linking as the highest-priority technical fix, citing an 80% increase in organic revenue from proper hub-and-spoke linking.

## Current State
- 24 posts link to homepage (mysterymaker.party), 397 have no internal links at all
- 0 posts link to other blog posts
- 72 posts already published in Supabase, 349 queued as drafts (1/day auto-publish)

## Architecture
- Each post gets 3-5 contextual in-content links to other posts
- Links are bidirectional (new post links to old, old posts updated to link to new)
- Links only activate when both source and target posts are published (no 404s)
- All posts can link to any other post (no artificial grouping)
- Hub-and-spoke model: cluster posts funnel to pillar pages, which funnel to the generator

## Phase 1 — Build Post Index & Link Relationship Map (this chat)
**Input:** blog_map.xlsx metadata (slug, title, meta_keywords)
**Output:** `cross_link_map.json` with link targets for each slug

Steps:
1. Extract slug, title, keywords for all 421 posts
2. Categorize into thematic clusters (themes, audiences, how-to, logistics, etc.)
3. Define hub-spoke relationships (pillar pages vs cluster posts)
4. For each post, identify 3-5 best cross-link targets based on relevance
5. Output as JSON: `{ "slug": { "links_to": ["slug-a", "slug-b", ...] } }`

## Phase 2 — Find Insertion Points (4 parallel Cowork convos)
**Input:** `cross_link_map.json` + blog_map.xlsx EN content
**Output:** Updated `cross_link_map.json` with insertion data

Each convo handles ~100 posts:
- Convo A: R2-R110 (posts 1-109)
- Convo B: R111-R215 (posts 110-214)
- Convo C: R216-R320 (posts 215-319)
- Convo D: R321-R422 (posts 320-421)

For each post, read EN content and for each link target:
- Find the best paragraph to insert the link
- Write natural anchor text that flows with the prose
- Record a unique text snippet to match against + the replacement with link

JSON format per link:
```json
{
  "source_slug": "murder-mystery-party-for-bachelorette-parties",
  "target_slug": "murder-mystery-party-for-date-night-ideas",
  "match_text": "planning a romantic evening with your partner",
  "replacement": "planning a [romantic evening with your partner](/blog/murder-mystery-party-for-date-night-ideas)",
  "language": "en"
}
```

## Phase 3 — Extend to 13 Languages (4 parallel Cowork convos)
For each non-EN language, find the equivalent paragraph in the translated content and generate translated anchor text. Can potentially be combined with Phase 2 if convos have capacity.

Same parallel split as Phase 2. Each convo processes its ~100 posts across all 13 languages.

## Phase 4 — Update Daily Publish Action
Modify `publish-daily-blog.yml` (or create a companion action) to:
1. After publishing a slug, read `cross_link_map.json`
2. Insert pre-computed links into the newly published post (all languages)
3. Update older published posts that should link to the new post
4. Only activate links where both source and target are published

No AI calls at runtime — just string matching and Supabase updates.

## Phase 5 — Backfill Already-Published Posts
One-time script/action to apply cross-links to the 72 already-published posts. Only links to other already-published posts (no broken links).

## Confirmed Technical Details
- **URL pattern:** `/blog/{slug}` (EN), `/{lang}/blog/{slug}` (other languages)
- **Markdown link format:** `[anchor text](/blog/slug)` — rendered by react-markdown
- **Generator CTAs:** 420/421 posts already have them — no action needed
- **Pillar pages:** None exist yet. We will designate 5 existing broad posts as pillars.

## Pillar Pages (Hub Posts)
These 5 existing posts cover the broadest topics and will serve as hubs that cluster posts link to:

1. **R169** — "50+ Murder Mystery Party Ideas: Themes, Formats & Group Sizes" (27K chars)
   - Hub for: ALL theme posts, group size posts, format posts
2. **R148** — "Murder Mystery Party for Adults: How to Host a Night People Actually Remember" (23K chars)
   - Hub for: hosting guides, how-to posts, logistics posts
3. **R225** — "First-Time Hosting a Murder Mystery Party: Complete Step-by-Step Guide" (14K chars)
   - Hub for: beginner content, planning posts, rules posts
4. **R195** — "AI Murder Mystery Generator: The Complete Guide" (15K chars)
   - Hub for: generator-related posts, AI posts, kit comparison posts
5. **R172** — "Murder Mystery Party Planning Checklist: 4 Weeks to Go" (16K chars)
   - Hub for: logistics posts, food/decor/costume posts, timeline posts

Every cluster post should link to at least 1 pillar page. Pillar pages should link to 10-15 cluster posts each.

## Thematic Clusters
Posts will be grouped into clusters for link targeting:

1. **Theme-based** (speakeasy, victorian, pirate, gothic, etc.) — ~80 posts
2. **Audience-based** (corporate, teens, couples, bachelorette, kids, etc.) — ~60 posts
3. **How-to-host** (specific theme hosting guides) — ~50 posts
4. **How-to-fix** (troubleshooting guides) — ~20 posts
5. **Group size** (2-player, 4-player, 8-player, 20+, 50+, etc.) — ~15 posts
6. **Logistics** (food, costumes, decorations, music, props, etc.) — ~30 posts
7. **Format** (dinner party, cocktail, brunch, camping, pub crawl, etc.) — ~25 posts
8. **Comparison/review** (kits, AI tools, free vs paid, etc.) — ~15 posts
9. **Character/role** (butler, detective, journalist, etc.) — ~15 posts
10. **Adjacent** (escape room, game night, trivia, team building, etc.) — ~20 posts

## Link Rules
- Each post gets 3-5 outbound cross-links
- At least 1 link should go to a pillar page
- Remaining links go to thematically related posts
- Links should be contextual within prose (not a "Related Posts" block at the bottom)
- Anchor text should be descriptive (not "click here")
- For non-EN languages: links use `/{lang}/blog/{slug}` format

## Column Mapping Reference (blog_map.xlsx)
- Col 1: Slug
- Col 3: Status (published/draft)
- Col 4-7: EN (Title, Content, Meta, Keywords)
- Col 8-11: ES | Col 12-15: FR | Col 16-19: DE | Col 20-23: IT
- Col 24-27: DA | Col 28-31: FI | Col 32-35: NL | Col 36-39: SV
- Col 40-43: PT | Col 44-47: KO | Col 48-51: JA | Col 52-55: ZH-CN

## Known Issues
- **R122** (how-to-fix-venue-decoration-disasters-transform): Duplicate of R121 (...-change). Has 12 language translations but no EN content. Will never publish via daily action (requires EN row). Exclude from cross-linking. Clean up later.
- **R121**: Status is "unknown" — treat as draft for cross-linking purposes.

## Quality Standards
- Every link must be contextually relevant — not just keyword-matching
- Anchor text must read naturally within the paragraph (no "click here" or forced phrasing)
- Each post gets exactly 3-5 outbound cross-links (not more, not fewer)
- At least 1 link must go to a pillar page
- Links should be distributed throughout the post, not clustered in one section
- No post should link to itself
- Bidirectional links preferred (if A links to B, B should link back to A where relevant)

## Considerations
- Adding links over time is fine for SEO — Google recrawls and re-evaluates regularly
- No penalty for adding internal links later
- 404 links DO hurt — only link to published posts
- Descriptive anchor text matters more than generic "related posts" blocks
- The SEO playbook recommends every page reachable within 3 clicks from homepage
- Anchor text distribution: ~40% descriptive, ~30% partial match, ~20% branded, ~10% exact match
- All link scanning done in Cowork chats (no API cost)
- cross_link_map.json is stored in repo and read by the daily publish action at runtime
