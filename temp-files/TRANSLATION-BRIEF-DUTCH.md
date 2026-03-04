# Translation Brief: Dutch (nl) - 47 Posts

## Database
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Translations
**E-E-A-T**: `*Gepubliceerd: 16 februari 2026 | Bijgewerkt: 20 februari 2026 | Auteur: Mystery Maker Party Team | Volgende beoordeling: 20 mei 2026*`
**Research**: `*Gebaseerd op analyse van meer dan 10.000 moordmysterieparty's en [theme] onderzoek*`
**Headers**: "Markttrends en Populariteit", "Wat Meer dan 10.000 Mysterieparty's Ons Hebben Geleerd", "Bronnen en Referenties", "Veelgestelde Vragen"
**Table**: `| Statistiek | Waarde | Bron |`
**Reading**: "Leestijd: X minuten"
**Bullets**: "Perfecte Thematische Integratie", "Karakterauthenticiteit", "Onderzoeksduidelijkheid", "Atmosferisch Evenwicht", "Gepersonaliseerde Betrokkenheid"

## Insert
```javascript
const dutchPost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'nl', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'nl').single();
if (!existing) { await supabase.from('blog_posts').insert(dutchPost); }
```

**Quality**: Formal "u", compound words (samenstellingen), proper Dutch capitalization

**Code**: nl | **Target**: 47
