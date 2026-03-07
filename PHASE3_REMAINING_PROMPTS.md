# Phase 3 — Published Post Translation Prompts (Remaining 9 Languages)

ES, IT, and KO are complete. Below are prompts for the remaining 9 languages. Run each in a **separate conversation using Opus**.

---

## 1. French (FR)

I need you to translate 61 published English blog posts into French for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a French translation

Each INSERT must include:
- `language = 'fr'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [French translated/romanized slug, must be globally unique]`
- `title` = fully translated to French
- `content` = fully translated to French (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to French
- `meta_keywords` = fully translated to French (SEO keywords a French speaker would search)
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to French

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% French** — the ENTIRE post must be in French. ZERO English words except proper nouns and brand names ("Murder Mystery Party Generator").
2. **No Franglais** — do NOT leave English sentence structure with French words dropped in. Every sentence must be natural French.
3. **Localize dates** — "February 16, 2026" → "16 février 2026"
4. **Localize labels** — "Published:" → "Publié :", "Last Updated:" → "Dernière mise à jour :", "Reading Time:" → "Temps de lecture :", "minutes" → "minutes"
5. **Translate table headers** — "Theme" → "Thème", "Players" → "Joueurs", "Difficulty" → "Difficulté", etc.
6. **Fully translate meta_description** — must be natural French, not English with random French words.
7. **Fully translate meta_keywords** — must be what a French speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content. If the EN post is 8,000+ characters, the French version must be comparable in length. Never insert stub text like "Contenu traduit complet."
9. **Preserve markdown formatting** — keep all markdown (bold, headers, lists, links) but translate ALL text within it.
10. **Natural fluency** — the translation should read as if originally written in French by a native speaker.

### Process

1. Work in batches of ~10 posts.
2. After each batch, verify the count:
   ```sql
   SELECT COUNT(*) FROM blog_posts WHERE language = 'fr' AND status = 'published';
   ```
3. After all 61 are done, run validation:
   ```sql
   SELECT COUNT(*) as total,
     COUNT(translation_of) as has_link,
     COUNT(DISTINCT translation_of) as unique_en_sources
   FROM blog_posts
   WHERE language = 'fr' AND status = 'published';
   ```
   Expected: total=61, has_link=61, unique_en_sources=61

4. Check for stubs:
   ```sql
   SELECT id, title, LENGTH(content) as content_length
   FROM blog_posts
   WHERE language = 'fr' AND status = 'published' AND LENGTH(content) < 500;
   ```
   Expected: 0 rows.

5. Check post_date alignment:
   ```sql
   SELECT COUNT(*) as mismatched
   FROM blog_posts fr
   JOIN blog_posts en ON en.id = fr.translation_of
   WHERE fr.language = 'fr' AND fr.post_date != en.post_date;
   ```
   Expected: 0.

6. Random quality spot-check — pick 2-3 posts and compare them side-by-side with the EN source. Verify the content is fully French, dates are localized, labels are localized, and content length is comparable.

---

## 2. German (DE)

I need you to translate 61 published English blog posts into German for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a German translation

Each INSERT must include:
- `language = 'de'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [German translated slug, must be globally unique]`
- `title` = fully translated to German
- `content` = fully translated to German (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to German
- `meta_keywords` = fully translated to German
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to German

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% German** — the ENTIRE post must be in German. ZERO English words except proper nouns and brand names.
2. **No Denglisch** — do NOT leave English sentence structure with German words. Every sentence must be natural German.
3. **Localize dates** — "February 16, 2026" → "16. Februar 2026"
4. **Localize labels** — "Published:" → "Veröffentlicht:", "Last Updated:" → "Zuletzt aktualisiert:", "Reading Time:" → "Lesezeit:", "minutes" → "Minuten"
5. **Translate table headers** — "Theme" → "Thema", "Players" → "Spieler", "Difficulty" → "Schwierigkeitsgrad", etc.
6. **Fully translate meta_description** — natural German for search results.
7. **Fully translate meta_keywords** — what a German speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content comparable in length to EN.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native German speaker.

### Process

Same as FR above — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 3. Danish (DA)

I need you to translate 61 published English blog posts into Danish for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Danish translation

Each INSERT must include:
- `language = 'da'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [Danish translated slug, must be globally unique]`
- `title` = fully translated to Danish
- `content` = fully translated to Danish (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Danish
- `meta_keywords` = fully translated to Danish
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Danish

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Danish** — the ENTIRE post must be in Danish. ZERO English words except proper nouns and brand names.
2. **No mixed language** — every sentence must be natural Danish.
3. **Localize dates** — "February 16, 2026" → "16. februar 2026"
4. **Localize labels** — "Published:" → "Udgivet:", "Last Updated:" → "Sidst opdateret:", "Reading Time:" → "Læsetid:", "minutes" → "minutter"
5. **Translate table headers** — "Theme" → "Tema", "Players" → "Spillere", "Difficulty" → "Sværhedsgrad", etc.
6. **Fully translate meta_description** — natural Danish for search results.
7. **Fully translate meta_keywords** — what a Danish speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content comparable in length to EN.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Danish speaker.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 4. Finnish (FI)

I need you to translate 61 published English blog posts into Finnish for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Finnish translation

Each INSERT must include:
- `language = 'fi'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [Finnish translated slug, must be globally unique]`
- `title` = fully translated to Finnish
- `content` = fully translated to Finnish (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Finnish
- `meta_keywords` = fully translated to Finnish
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Finnish

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Finnish** — the ENTIRE post must be in Finnish. ZERO English words except proper nouns and brand names.
2. **No mixed language** — every sentence must be natural Finnish.
3. **Localize dates** — "February 16, 2026" → "16. helmikuuta 2026"
4. **Localize labels** — "Published:" → "Julkaistu:", "Last Updated:" → "Viimeksi päivitetty:", "Reading Time:" → "Lukuaika:", "minutes" → "minuuttia"
5. **Translate table headers** — "Theme" → "Teema", "Players" → "Pelaajat", "Difficulty" → "Vaikeustaso", etc.
6. **Fully translate meta_description** — natural Finnish for search results.
7. **Fully translate meta_keywords** — what a Finnish speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content comparable in length to EN.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Finnish speaker.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 5. Dutch (NL)

I need you to translate 61 published English blog posts into Dutch for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Dutch translation

Each INSERT must include:
- `language = 'nl'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [Dutch translated slug, must be globally unique]`
- `title` = fully translated to Dutch
- `content` = fully translated to Dutch (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Dutch
- `meta_keywords` = fully translated to Dutch
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Dutch

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Dutch** — the ENTIRE post must be in Dutch. ZERO English words except proper nouns and brand names.
2. **No Dunglish** — do NOT leave English sentence structure with Dutch words. Every sentence must be natural Dutch.
3. **Localize dates** — "February 16, 2026" → "16 februari 2026"
4. **Localize labels** — "Published:" → "Gepubliceerd:", "Last Updated:" → "Laatst bijgewerkt:", "Reading Time:" → "Leestijd:", "minutes" → "minuten"
5. **Translate table headers** — "Theme" → "Thema", "Players" → "Spelers", "Difficulty" → "Moeilijkheidsgraad", etc.
6. **Fully translate meta_description** — natural Dutch for search results.
7. **Fully translate meta_keywords** — what a Dutch speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content comparable in length to EN.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Dutch speaker.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 6. Portuguese (PT)

I need you to translate 61 published English blog posts into Portuguese (Brazilian) for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Portuguese translation

Each INSERT must include:
- `language = 'pt'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [Portuguese translated slug, must be globally unique]`
- `title` = fully translated to Portuguese
- `content` = fully translated to Portuguese (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Portuguese
- `meta_keywords` = fully translated to Portuguese
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Portuguese

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Portuguese** — the ENTIRE post must be in Portuguese. ZERO English words except proper nouns and brand names.
2. **No Portunglês** — every sentence must be natural Portuguese (Brazilian variant preferred).
3. **Localize dates** — "February 16, 2026" → "16 de fevereiro de 2026"
4. **Localize labels** — "Published:" → "Publicado:", "Last Updated:" → "Última atualização:", "Reading Time:" → "Tempo de leitura:", "minutes" → "minutos"
5. **Translate table headers** — "Theme" → "Tema", "Players" → "Jogadores", "Difficulty" → "Dificuldade", etc.
6. **Fully translate meta_description** — natural Portuguese for search results.
7. **Fully translate meta_keywords** — what a Portuguese speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content comparable in length to EN.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Portuguese speaker.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 7. Swedish (SV)

I need you to translate 61 published English blog posts into Swedish for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Swedish translation

Each INSERT must include:
- `language = 'sv'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [Swedish translated slug, must be globally unique]`
- `title` = fully translated to Swedish
- `content` = fully translated to Swedish (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Swedish
- `meta_keywords` = fully translated to Swedish
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Swedish

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Swedish** — the ENTIRE post must be in Swedish. ZERO English words except proper nouns and brand names.
2. **No Swenglish** — every sentence must be natural Swedish.
3. **Localize dates** — "February 16, 2026" → "16 februari 2026"
4. **Localize labels** — "Published:" → "Publicerad:", "Last Updated:" → "Senast uppdaterad:", "Reading Time:" → "Lästid:", "minutes" → "minuter"
5. **Translate table headers** — "Theme" → "Tema", "Players" → "Spelare", "Difficulty" → "Svårighetsgrad", etc.
6. **Fully translate meta_description** — natural Swedish for search results.
7. **Fully translate meta_keywords** — what a Swedish speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content comparable in length to EN.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Swedish speaker.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 8. Japanese (JA)

I need you to translate 61 published English blog posts into Japanese for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

**Note:** JA drafts (319) already exist with `translation_of` set. This conversation is ONLY for the 61 published posts.

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Japanese translation

Each INSERT must include:
- `language = 'ja'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [romanized Japanese slug, must be globally unique]`
- `title` = fully translated to Japanese
- `content` = fully translated to Japanese (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Japanese
- `meta_keywords` = fully translated to Japanese
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Japanese

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Japanese** — the ENTIRE post must be in Japanese. ZERO English words except proper nouns and brand names.
2. **No mixed language** — every sentence must be natural Japanese. Use appropriate kanji, hiragana, and katakana.
3. **Localize dates** — "February 16, 2026" → "2026年2月16日"
4. **Localize labels** — "Published:" → "公開日:", "Last Updated:" → "最終更新:", "Reading Time:" → "読了時間:", "minutes" → "分"
5. **Translate table headers** — "Theme" → "テーマ", "Players" → "プレイヤー数", "Difficulty" → "難易度", etc.
6. **Fully translate meta_description** — natural Japanese for search results.
7. **Fully translate meta_keywords** — what a Japanese speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content. Japanese may be shorter than EN due to character density, but should be complete.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Japanese speaker. Use appropriate honorific level (です/ます form for blog posts).
11. **Slug format** — use romanized slugs (e.g., `satsujin-mystery-party-guide`) since URLs don't support Japanese characters well.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## 9. Chinese Simplified (ZH-CN)

I need you to translate 61 published English blog posts into Simplified Chinese for my Murder Mystery Party Generator blog.

Supabase project: `mhfikaomkmqcndqfohbp`
Table: `public.blog_posts`

### Step 1: Read the EN published posts

```sql
SELECT id, title, slug, content, theme, post_date, meta_description, meta_keywords, featured_image_url, reading_time, author, tags
FROM blog_posts
WHERE language = 'en' AND status = 'published'
ORDER BY post_date;
```

### Step 2: For each EN post, INSERT a Chinese translation

Each INSERT must include:
- `language = 'zh-cn'`
- `translation_of = [the EN post's id UUID]` — **MANDATORY, never NULL**
- `status = 'published'`
- `published_at = NOW()`
- `post_date = [same as EN source post_date]`
- `theme = [same as EN source theme]`
- `slug = [pinyin-based slug, must be globally unique]`
- `title` = fully translated to Simplified Chinese
- `content` = fully translated to Simplified Chinese (FULL content, not a summary or placeholder)
- `meta_description` = fully translated to Simplified Chinese
- `meta_keywords` = fully translated to Simplified Chinese
- `featured_image_url` = copy from EN source
- `reading_time` = copy from EN source
- `author` = copy from EN source
- `tags` = translate each tag to Simplified Chinese

### TRANSLATION QUALITY RULES (CRITICAL)

1. **100% Simplified Chinese** — the ENTIRE post must be in Simplified Chinese (简体中文). ZERO English words except proper nouns and brand names.
2. **No mixed language** — every sentence must be natural Chinese. Do not mix English phrases into Chinese sentences.
3. **Localize dates** — "February 16, 2026" → "2026年2月16日"
4. **Localize labels** — "Published:" → "发布日期:", "Last Updated:" → "最后更新:", "Reading Time:" → "阅读时间:", "minutes" → "分钟"
5. **Translate table headers** — "Theme" → "主题", "Players" → "玩家人数", "Difficulty" → "难度", etc.
6. **Fully translate meta_description** — natural Chinese for search results.
7. **Fully translate meta_keywords** — what a Chinese speaker would search for.
8. **NO placeholders or stubs** — every post must have FULL translated content. Chinese may be shorter than EN due to character density, but should be complete.
9. **Preserve markdown formatting** — translate ALL text within markdown structure.
10. **Natural fluency** — should read as if written by a native Chinese speaker. Use mainland China conventions (Simplified characters, not Traditional).
11. **Slug format** — use pinyin-based slugs (e.g., `mousha-xuanyi-juhui-zhinan`) since URLs don't support Chinese characters well.

### Process

Same as FR — batches of ~10, count verification, final validation (61/61/61), stub check (LENGTH < 500 = 0 rows), post_date alignment (0 mismatches), random spot-check.

---

## Running Order Suggestion

You can run multiple languages in parallel. Suggested grouping:

**Batch A (run together):** FR, DE, DA
**Batch B (run together):** FI, NL, PT
**Batch C (run together):** SV, JA, ZH-CN

After each batch completes, I can verify counts, quality, and post_date alignment before moving to the next batch.
