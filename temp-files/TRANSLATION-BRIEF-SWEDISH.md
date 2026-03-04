# Translation Brief: Swedish (sv) - 47 Posts

## Database
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Translations
**E-E-A-T**: `*Publicerad: 16 februari 2026 | Uppdaterad: 20 februari 2026 | Författare: Mystery Maker Party Team | Nästa granskning: 20 maj 2026*`
**Research**: `*Baserat på analys av över 10 000 mordmysteriefester och [theme] forskning*`
**Headers**: "Marknadstrender och Popularitet", "Vad Mer än 10 000 Mysteriefester Har Lärt Oss", "Källor och Referenser", "Vanliga Frågor"
**Table**: `| Statistik | Värde | Källa |`
**Reading**: "Lästid: X minuter"
**Bullets**: "Perfekt Tematisk Integration", "Karaktärsautenticitet", "Utredningsklarhet", "Atmosfärisk Balans", "Anpassat Engagemang"

## Insert
```javascript
const swedishPost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'sv', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'sv').single();
if (!existing) { await supabase.from('blog_posts').insert(swedishPost); }
```

**Quality**: Formal "ni", proper å, ä, ö usage, compound words (sammansatta ord)

**Code**: sv | **Target**: 47
