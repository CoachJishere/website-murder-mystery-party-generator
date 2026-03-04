# Translation Brief: German (de) - 47 Posts

## Mission
Translate 47 optimized English murder mystery blog posts to German and insert them into the Supabase database.

## Database Connection
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);
```

## Find Posts
```javascript
const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00');

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key German Translations

**E-E-A-T Header**:
- `*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*`

**Research Statement**:
- `*Basierend auf der Analyse von über 10.000 Krimi-Partys und [theme]-Forschung*`

**Section Headers**:
- "Market Trends & Popularity" → "Markttrends und Popularität"
- "What 10,000+ Mystery Parties Have Taught Us" → "Was uns über 10.000 Krimi-Partys gelehrt haben"
- "Sources & References" → "Quellen und Referenzen"
- "Frequently Asked Questions" → "Häufig gestellte Fragen"

**Table Headers**:
- `| Statistik | Wert | Quelle |`

**Common Phrases**:
- "Reading time: X minutes" → "Lesezeit: X Minuten"

**Bullet Points**:
- "Perfect Thematic Integration" → "Perfekte Thematische Integration"
- "Character Authenticity" → "Charakterauthentizität"
- "Investigation Clarity" → "Ermittlungsklarheit"
- "Atmospheric Balance" → "Atmosphärisches Gleichgewicht"
- "Customized Engagement" → "Individuelles Engagement"

## Insert German Version
```javascript
const germanPost = {
  slug: englishPost.slug,
  title: translatedTitle,
  content: translatedContent,
  meta_description: translatedMetaDescription,
  language: 'de',
  reading_time: englishPost.reading_time,
  created_at: englishPost.created_at,
  updated_at: new Date().toISOString()
};

const { data: existing } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('slug', englishPost.slug)
  .eq('language', 'de')
  .single();

if (!existing) {
  await supabase.from('blog_posts').insert(germanPost);
}
```

## Quality Guidelines
1. **Compound Nouns**: Use proper German compound nouns (Krimidinner, Mordmysterium)
2. **Formality**: Use formal "Sie" form
3. **Capitalization**: Capitalize ALL nouns
4. **Umlauts**: Proper ä, ö, ü, ß usage
5. **Word Order**: Verb-second position in main clauses

**Language Code**: de | **Target**: 47 posts
