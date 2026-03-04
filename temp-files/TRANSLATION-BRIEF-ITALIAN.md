# Translation Brief: Italian (it) - 47 Posts

## Database
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Translations
**E-E-A-T**: `*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*`
**Research**: `*Basato sull'analisi di oltre 10.000 feste misteriose e ricerca su [theme]*`
**Headers**: "Tendenze di Mercato e Popolarità", "Cosa Ci Hanno Insegnato Oltre 10.000 Feste Misteriose", "Fonti e Riferimenti", "Domande Frequenti"
**Table**: `| Statistica | Valore | Fonte |`
**Reading**: "Tempo di lettura: X minuti"
**Bullets**: "Perfetta Integrazione Tematica", "Autenticità dei Personaggi", "Chiarezza dell'Indagine", "Equilibrio Atmosferico", "Coinvolgimento Personalizzato"

## Insert
```javascript
const italianPost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'it', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'it').single();
if (!existing) { await supabase.from('blog_posts').insert(italianPost); }
```

**Quality**: Formal "Lei", proper accents (à, è, é, ì, ò, ù), gender agreement

**Code**: it | **Target**: 47
