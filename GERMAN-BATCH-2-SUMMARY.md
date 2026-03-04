# German Batch 2 Translation - Posts 11-20

## Summary
Successfully fetched 10 English blog posts (posts 11-20) from Supabase for German translation.

**Output File:** `german-batch-2-source-posts.json`
**File Size:** 147KB
**Date:** February 27, 2026

---

## Posts in This Batch

| # | Title | Slug | Reading Time | Content Length |
|---|-------|------|--------------|----------------|
| 11 | Unique Pirate Murder Mystery Plot Ideas | `unique-pirate-murder-mystery-plot-ideas` | 7 min | 10,055 chars |
| 12 | How to Fix Confusing Murder Mystery Clues | `how-to-fix-confusing-murder-mystery-clues` | N/A | 17,266 chars |
| 13 | 5 Renaissance Murder Mystery Party Themes | `5-renaissance-murder-mystery-party-themes` | 9 min | 13,512 chars |
| 14 | How to Host a Space Station Murder Mystery | `how-to-host-a-space-station-murder-mystery` | N/A | 18,138 chars |
| 15 | Innocent Bystander Murder Mystery Themes: Wrong Place, Wrong Time Scenarios | `innocent-bystander-murder-mystery-themes-wrong-place-wrong-time` | N/A | 17,071 chars |
| 16 | Ancient Egypt Murder Mystery Party Guide | `ancient-egypt-murder-mystery-party-guide` | 7 min | 9,755 chars |
| 17 | Murder Mystery Party for Corporate Events | `murder-mystery-party-for-corporate-events` | 14 min | 20,589 chars |
| 18 | Unique Circus Murder Mystery Plot Ideas | `unique-circus-murder-mystery-plot-ideas` | 8 min | 10,594 chars |
| 19 | How to Fix Overly Complex Murder Mysteries | `how-to-fix-overly-complex-murder-mysteries` | N/A | 17,841 chars |
| 20 | 5 Masquerade Ball Murder Mystery Themes That Will Leave Your Guests Speechless | `5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless` | 8 min | 11,063 chars |

**Total Content:** ~146,000 characters across 10 posts

---

## Content Categories

### Theme Guides (5 posts)
- Pirate themes (#11)
- Renaissance themes (#13)
- Space station (#14)
- Ancient Egypt (#16)
- Circus themes (#18)
- Masquerade ball (#20)

### Problem-Solving Guides (2 posts)
- Confusing clues (#12)
- Overly complex mysteries (#19)

### Special Scenarios (2 posts)
- Innocent bystander themes (#15)
- Corporate events (#17)

---

## Data Structure

Each post includes:
- `id`: UUID
- `title`: Full title
- `slug`: URL slug
- `content`: Full markdown content
- `reading_time`: Estimated reading time (some null)
- `created_at`: Creation timestamp

---

## Next Steps

1. **Translation Phase**
   - Translate all 10 posts to German
   - Maintain markdown formatting
   - Adapt cultural references appropriately
   - Generate German slugs

2. **Quality Assurance**
   - Verify translations maintain SEO quality
   - Check all internal links
   - Validate markdown structure

3. **Insertion**
   - Insert into Supabase `blog_posts` table
   - Set `language='de'`, `status='published'`
   - Link to English originals via `translated_from_id`

---

## Query Used

```sql
SELECT id, title, slug, content, reading_time, created_at
FROM blog_posts
WHERE language = 'en' 
  AND status = 'published'
ORDER BY created_at ASC
OFFSET 10
LIMIT 10;
```

**Supabase Project:** `mhfikaomkmqcndqfohbp` (EU Central)
