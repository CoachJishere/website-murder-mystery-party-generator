# Translation Brief: Danish (da) - 47 Posts

## Database
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Translations
**E-E-A-T**: `*Udgivet: 16. februar 2026 | Opdateret: 20. februar 2026 | Forfatter: Mystery Maker Party Team | Næste gennemgang: 20. maj 2026*`
**Research**: `*Baseret på analyse af over 10.000 mordmysterie-fester og [theme] forskning*`
**Headers**: "Markedstendenser og Popularitet", "Hvad Mere end 10.000 Mysteriefester Har Lært Os", "Kilder og Referencer", "Ofte Stillede Spørgsmål"
**Table**: `| Statistik | Værdi | Kilde |`
**Reading**: "Læsetid: X minutter"
**Bullets**: "Perfekt Tematisk Integration", "Karakterautenticitet", "Undersøgelsesklarhed", "Atmosfærisk Balance", "Tilpasset Engagement"

## Insert
```javascript
const danishPost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'da', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'da').single();
if (!existing) { await supabase.from('blog_posts').insert(danishPost); }
```

**Quality**: Formal "De", proper æ, ø, å usage, compound words

**Code**: da | **Target**: 47
