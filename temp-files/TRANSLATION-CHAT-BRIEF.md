# Blog Post Translation Brief — [LANGUAGE] Translation Chat

## Your Task

Translate all 319 English draft blog posts from the `blog_posts` table in Supabase into **[LANGUAGE_NAME]** (language code: `[LANG_CODE]`). Work in batches of 5 posts, translating directly from Supabase EN content and INSERTing translated rows back.

---

## Supabase Access

- **Project ID**: `mhfikaomkmqcndqfohbp`
- **Table**: `blog_posts`
- Use the Supabase MCP tools (`execute_sql`, `list_tables`, etc.) — no API keys needed.

---

## Table Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Auto-generated, do NOT specify |
| `title` | text | **Translate** |
| `content` | text | **Translate** (the main blog body, markdown) |
| `slug` | text | **Translate** to target language (URL-safe, lowercase, hyphens) |
| `meta_description` | text | **Translate** (~150-160 chars) |
| `meta_keywords` | text | **Translate** (comma-separated keywords in target language) |
| `language` | varchar | Set to `'[LANG_CODE]'` |
| `theme` | varchar | **Keep in English** (copy from EN post exactly) |
| `status` | varchar | Set to `'draft'` |
| `featured_image_url` | text | Copy from EN post (or NULL) |
| `reading_time` | integer | Copy from EN post (usually 7) |
| `author` | varchar | Set to `'Mystery Maker Party Team'` |
| `tags` | text[] | **Translate** the tag values |
| `published_at` | timestamptz | NULL for drafts |
| `created_at` | timestamptz | Auto-generated |
| `updated_at` | timestamptz | Set to `NOW()` |
| `post_date` | date | Copy from EN post (or NULL) |

---

## Step-by-Step Workflow

### 1. Find EN posts that need translation

```sql
-- Get next batch of 5 EN draft posts without a [LANG_CODE] translation
SELECT e.id, e.slug, e.title, e.theme, e.content, e.meta_description,
       e.meta_keywords, e.tags, e.featured_image_url, e.reading_time, e.post_date,
       LENGTH(e.content)/5 as word_count
FROM blog_posts e
WHERE e.language = 'en'
  AND e.status = 'draft'
  AND NOT EXISTS (
    SELECT 1 FROM blog_posts t
    WHERE t.language = '[LANG_CODE]'
    AND t.theme = e.theme
    AND t.status = 'draft'
    AND LENGTH(t.content)/5 BETWEEN 1500 AND 3000
  )
ORDER BY LENGTH(e.content) DESC
LIMIT 5;
```

> **Note on matching**: Posts are matched by `theme` field (kept in English across all languages). This works for most posts but some themes have multiple EN posts (e.g., "Problem-Solving" has 46, "Mystery Themes" has 34, "Character Development" has 23). For these shared-theme posts, after the first translation matches, the NOT EXISTS check won't find more. To handle this, after all unique-theme posts are done, switch to a slug-based check or sequential processing for the remaining multi-theme posts.

### 2. Read the EN content

For each post in the batch, read the full `content` field. The posts are 2,000-2,500 words, already optimized with this structure:
- Published/Updated metadata header
- "Based on analyzing 10,000+" expertise line
- Stats table (market data with sources)
- Expert blockquote
- Quick Start Checklist
- Core content sections (varies by post type)
- Common Mistakes to Avoid
- "What 10,000+ Mystery Parties Have Taught Us" social proof section
- FAQ section (5 questions)
- Sources & References
- Reading time

### 3. Translate the content

**Translation rules:**
- Translate ALL text naturally into [LANGUAGE_NAME] — this is not a mechanical word-for-word translation, it should read like native [LANGUAGE_NAME] content
- **Keep markdown formatting intact** (headers, tables, bullet points, bold, blockquotes)
- **Keep the E-E-A-T structure** — translate every section, don't skip or reorganize
- **Stats tables**: Translate column headers and source descriptions, keep numbers/values as-is
- **Expert quotes**: Translate the quote text, keep the attribution name and source in the original language
- **Sources & References section**: Translate the bold labels, keep source names in English
- **Metadata line**: Translate the format. Example for ES: `*Publicado: 27 de febrero de 2026 | Actualizado: 27 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 27 de mayo de 2026*`
- **"Based on analyzing 10,000+"**: Translate naturally
- **URLs in content**: Keep as-is (don't translate URLs)
- **Reading time**: Translate the label (e.g., "Tiempo de lectura: 7 minutos")
- **Single quotes in SQL**: Escape as `''` (double apostrophe) for PostgreSQL

### 4. INSERT the translated post

```sql
INSERT INTO blog_posts (title, content, slug, meta_description, meta_keywords, language, theme, status, featured_image_url, reading_time, author, tags, updated_at, post_date)
VALUES (
  'Translated Title Here',
  'Full translated content here with '' escaped single quotes',
  'translated-slug-here',
  'Translated meta description',
  'translated, keyword, list',
  '[LANG_CODE]',
  'Original English Theme',  -- KEEP IN ENGLISH
  'draft',
  NULL,  -- or copy featured_image_url from EN
  7,
  'Mystery Maker Party Team',
  ARRAY['Translated Tag 1', 'Translated Tag 2'],
  NOW(),
  NULL  -- or copy post_date from EN
);
```

### 5. Verify each batch

```sql
-- After each batch, verify word counts
SELECT slug, LENGTH(content)/5 as words
FROM blog_posts
WHERE language = '[LANG_CODE]' AND status = 'draft'
ORDER BY created_at DESC
LIMIT 5;
```

### 6. Track progress

```sql
-- Check how many are done vs remaining
SELECT
  (SELECT COUNT(*) FROM blog_posts WHERE language = '[LANG_CODE]' AND status = 'draft') as translated,
  (SELECT COUNT(*) FROM blog_posts WHERE language = 'en' AND status = 'draft') as en_total;
```

---

## Batch Processing Guidelines

- **Batch size**: 5 posts per batch
- **Process**: Fetch 5 EN posts → translate all 5 → INSERT all 5 → verify → next batch
- **Order**: Start with longest posts first (ORDER BY LENGTH DESC) — they have the most unique themes
- **Speed**: Don't stop between batches. Keep going continuously.
- **Quality**: Each translation should read naturally, not like machine translation. Adapt idioms, cultural references, and phrasing to be natural in [LANGUAGE_NAME].

---

## Slug Format Rules

Slugs should be translated and URL-friendly:
- All lowercase
- Hyphens instead of spaces
- No special characters (convert accented chars: é→e, ñ→n, ü→u, etc.)
- Keep it concise but descriptive
- Example EN→ES: `mountain-resort-murder-mystery-party-guide` → `guia-fiesta-misterio-asesinato-resort-montana`

---

## Existing Translations Warning

There are already some [LANG_CODE] translations in the database (from older, unoptimized EN content — 4,000+ words). These are **outdated** and do NOT match the current optimized EN content. The `NOT EXISTS` check in the fetch query should skip themes that already have translations. Focus only on untranslated posts.

If you run into theme-matching issues (because multiple EN posts share a theme), you can use this alternative approach:

```sql
-- For multi-theme posts, fetch by checking slug keywords
SELECT e.id, e.slug, e.title, e.theme, e.content, e.meta_description,
       e.meta_keywords, e.tags, LENGTH(e.content)/5 as word_count
FROM blog_posts e
WHERE e.language = 'en' AND e.status = 'draft'
  AND e.theme IN ('Problem-Solving', 'Mystery Themes', 'Character Development')
ORDER BY e.theme, LENGTH(e.content) DESC;
```

Then translate and INSERT each, ensuring the slug is unique.

---

## Current Translation Status

| Language | Code | Existing (draft+published) | Missing (approx) |
|----------|------|---------------------------|-------------------|
| Finnish | fi | 83 | ~369 |
| Danish | da | 87 | ~363 |
| Swedish | sv | 109 | ~358 |
| Korean | ko | 111 | ~354 |
| Portuguese | pt | 113 | ~346 |
| Spanish | es | 111 | ~342 |
| Italian | it | 110 | ~342 |
| French | fr | 108 | ~341 |
| Japanese | ja | 108 | ~338 |
| Dutch | nl | 109 | ~333 |
| German | de | 110 | ~330 |

---

## Quality Checklist Per Post

- [ ] Title translated naturally (not literal)
- [ ] Slug is URL-safe, translated, lowercase with hyphens
- [ ] Meta description translated (~150-160 chars)
- [ ] Meta keywords translated (relevant terms in target language)
- [ ] Full content translated with markdown preserved
- [ ] Stats table: numbers kept, labels translated
- [ ] Expert quote translated, attribution kept
- [ ] E-E-A-T sections all present (stats, social proof, sources)
- [ ] FAQ questions and answers translated
- [ ] Sources section: labels translated, source names kept
- [ ] Theme field kept in English
- [ ] Language set to correct code
- [ ] Single quotes properly escaped as ''
- [ ] Word count reasonable (typically 1,800-2,800 for translations)

---

## How to Use This Brief

1. Open a new Claude Code chat in the same project directory
2. Paste this brief (customized with the target language)
3. Say: "Follow this brief. Start translating batch 1 now. Work continuously through all batches without stopping."
4. The chat will use Supabase MCP tools to read EN posts and INSERT translations directly.

---

## Language-Specific Customizations

### For Spanish (es)
- Use Latin American neutral Spanish (understood across all Spanish-speaking countries)
- Metadata: `*Publicado: ... | Actualizado: ... | Autor: Equipo de Mystery Maker Party | Próxima revisión: ...*`
- "Based on analyzing 10,000+": `*Basado en el análisis de más de 10,000 fiestas de misterio...*`
- "Reading time: 7 minutes": `*Tiempo de lectura: 7 minutos*`

### For French (fr)
- Use standard international French
- Metadata: `*Publié : ... | Mis à jour : ... | Auteur : Équipe Mystery Maker Party | Prochaine révision : ...*`
- "Based on analyzing 10,000+": `*Basé sur l'analyse de plus de 10 000 soirées mystère...*`
- "Reading time: 7 minutes": `*Temps de lecture : 7 minutes*`

### For German (de)
- Use standard Hochdeutsch
- Metadata: `*Veröffentlicht: ... | Aktualisiert: ... | Autor: Mystery Maker Party Team | Nächste Überprüfung: ...*`
- "Based on analyzing 10,000+": `*Basierend auf der Analyse von über 10.000 Krimi-Dinner-Partys...*`
- "Reading time: 7 minutes": `*Lesezeit: 7 Minuten*`

### For Italian (it)
- Use standard Italian
- Metadata: `*Pubblicato: ... | Aggiornato: ... | Autore: Team Mystery Maker Party | Prossima revisione: ...*`
- "Reading time: 7 minutes": `*Tempo di lettura: 7 minuti*`

### For Portuguese (pt)
- Use Brazilian Portuguese (larger market)
- Metadata: `*Publicado: ... | Atualizado: ... | Autor: Equipe Mystery Maker Party | Próxima revisão: ...*`
- "Reading time: 7 minutes": `*Tempo de leitura: 7 minutos*`

### For Dutch (nl)
- Metadata: `*Gepubliceerd: ... | Bijgewerkt: ... | Auteur: Mystery Maker Party Team | Volgende revisie: ...*`
- "Reading time: 7 minutes": `*Leestijd: 7 minuten*`

### For Swedish (sv)
- Metadata: `*Publicerad: ... | Uppdaterad: ... | Författare: Mystery Maker Party Team | Nästa granskning: ...*`
- "Reading time: 7 minutes": `*Lästid: 7 minuter*`

### For Danish (da)
- Metadata: `*Udgivet: ... | Opdateret: ... | Forfatter: Mystery Maker Party Team | Næste gennemgang: ...*`
- "Reading time: 7 minutes": `*Læsetid: 7 minutter*`

### For Finnish (fi)
- Metadata: `*Julkaistu: ... | Päivitetty: ... | Kirjoittaja: Mystery Maker Party Team | Seuraava tarkistus: ...*`
- "Reading time: 7 minutes": `*Lukuaika: 7 minuuttia*`

### For Japanese (ja)
- Use polite/standard Japanese (です/ます form)
- Metadata: `*公開日: ... | 更新日: ... | 著者: Mystery Maker Party チーム | 次回レビュー: ...*`
- "Reading time: 7 minutes": `*読了時間：7分*`

### For Korean (ko)
- Use polite/standard Korean (합니다 form)
- Metadata: `*게시일: ... | 업데이트: ... | 저자: Mystery Maker Party 팀 | 다음 검토: ...*`
- "Reading time: 7 minutes": `*읽기 시간: 7분*`
