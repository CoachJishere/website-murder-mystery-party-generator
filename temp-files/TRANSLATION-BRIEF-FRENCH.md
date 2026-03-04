# Translation Brief: French (fr) - 47 Posts

## Mission
Translate 47 optimized English murder mystery blog posts to French and insert them into the Supabase database.

## Context
- **Project**: mysterymaker.party SEO/GEO optimization
- **English posts**: 47 fully optimized with E-E-A-T signals, statistics, expert quotes
- **Target**: Create French versions with same slug, different language code
- **Database**: Supabase PostgreSQL

## Database Connection
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);
```

## Steps

### 1. Find the 47 Optimized Posts
```javascript
const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00');

const optimized = posts.filter(p =>
  p.content.includes('*Published: February 16, 2026')
);
```

### 2. For Each Post, Translate:

#### Key French Translations

**E-E-A-T Header**:
- `*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*`
- `*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*`

**Research Statement**:
- `*Based on analyzing 10,000+ murder mystery parties and [theme] research*`
- `*Basé sur l'analyse de plus de 10 000 soirées mystère et recherche sur [theme]*`

**Section Headers**:
- "Market Trends & Popularity" → "Tendances du Marché et Popularité"
- "What 10,000+ Mystery Parties Have Taught Us" → "Ce que Plus de 10 000 Soirées Mystère Nous Ont Appris"
- "Sources & References" → "Sources et Références"
- "Frequently Asked Questions" → "Questions Fréquemment Posées"

**Table Headers**:
- `| Statistic | Value | Source |` → `| Statistique | Valeur | Source |`

**Common Phrases**:
- "Reading time: X minutes" → "Temps de lecture : X minutes"
- "Successful [theme] mystery parties share these characteristics:" → "Les soirées mystère à thème [theme] réussies partagent ces caractéristiques :"

**Bullet Points**:
- "Perfect Thematic Integration" → "Intégration Thématique Parfaite"
- "Character Authenticity" → "Authenticité des Personnages"
- "Investigation Clarity" → "Clarté de l'Enquête"
- "Atmospheric Balance" → "Équilibre Atmosphérique"
- "Customized Engagement" → "Engagement Personnalisé"

**IMPORTANT**:
- Keep ALL statistics, numbers, source citations, URLs intact
- Keep markdown formatting
- Translate expert quotes but keep attribution in English
- Use formal "vous" form
- Respect French capitalization rules (fewer capitals than English)

### 3. Insert French Version
```javascript
const frenchPost = {
  slug: englishPost.slug,
  title: translatedTitle,
  content: translatedContent,
  meta_description: translatedMetaDescription,
  language: 'fr',
  reading_time: englishPost.reading_time,
  created_at: englishPost.created_at,
  updated_at: new Date().toISOString()
};

const { data: existing } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('slug', englishPost.slug)
  .eq('language', 'fr')
  .single();

if (!existing) {
  await supabase.from('blog_posts').insert(frenchPost);
}
```

### 4. Report Progress
```
✅ Translated: [Title]
⏭️  Skipped: [Title] (already exists)
❌ Error: [Title]

Final:
🎉 French Translation Complete!
   ✅ Success: X/47
```

## Translation Quality Guidelines
1. **Natural French**: Use idiomatic French expressions
2. **Formality**: Professional "vous" form
3. **Accents**: Ensure proper accents (é, è, ê, à, etc.)
4. **Gender Agreement**: Proper masculine/feminine agreements
5. **Word Order**: French syntax (adjectives often after nouns)

## Verification
```javascript
const { count } = await supabase
  .from('blog_posts')
  .select('*', { count: 'exact', head: true })
  .eq('language', 'fr')
  .gte('updated_at', '2026-02-21T00:00:00');

console.log(`French posts created: ${count}`); // Should be 47
```

---

**Language Code**: fr
**Target**: 47 posts
**Duration**: 30-45 minutes
