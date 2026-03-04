# Translation Brief: Portuguese (pt) - 47 Posts

## Database
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');
const { data: posts } = await supabase.from('blog_posts').select('*').eq('language', 'en').gte('updated_at', '2026-02-20T00:00:00');
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
```

## Key Translations
**E-E-A-T**: `*Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*`
**Research**: `*Baseado na análise de mais de 10.000 festas de mistério e pesquisa sobre [theme]*`
**Headers**: "Tendências do Mercado e Popularidade", "O que Mais de 10.000 Festas de Mistério Nos Ensinaram", "Fontes e Referências", "Perguntas Frequentes"
**Table**: `| Estatística | Valor | Fonte |`
**Reading**: "Tempo de leitura: X minutos"
**Bullets**: "Integração Temática Perfeita", "Autenticidade de Personagem", "Clareza de Investigação", "Equilíbrio Atmosférico", "Engajamento Personalizado"

## Insert
```javascript
const portuguesePost = { slug: englishPost.slug, title: translatedTitle, content: translatedContent, meta_description: translatedMetaDescription, language: 'pt', reading_time: englishPost.reading_time, created_at: englishPost.created_at, updated_at: new Date().toISOString() };
const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', englishPost.slug).eq('language', 'pt').single();
if (!existing) { await supabase.from('blog_posts').insert(portuguesePost); }
```

**Quality**: Brazilian Portuguese preferred, formal "você", proper accents (ã, õ, ç)

**Code**: pt | **Target**: 47
