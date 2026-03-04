import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const postIndex = parseInt(process.argv[2]) || 0;
const batch = JSON.parse(readFileSync('temp-files/italian_batch2.json', 'utf-8'));
const post = batch[postIndex];

if (!post) {
  console.error(`Post ${postIndex} not found in batch`);
  process.exit(1);
}

console.log(`\n=== Translating Post ${postIndex + 1}/10 ===`);
console.log(`Slug: ${post.slug}\n`);

// Translate with Claude
const message = await anthropic.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 16000,
  messages: [{
    role: 'user',
    content: `Translate this complete English blog post to Italian. Follow these requirements EXACTLY:

## Italian Format Requirements:
- **E-E-A-T dates**: "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*"
- **Research citations**: "*Basato sull'analisi di oltre 10.000 feste misteriose e ricerca su [theme]*"
- **Table headers**: "| Statistica | Valore | Fonte |"
- **Reading time**: "Tempo di lettura: X minuti"
- Use formal "Lei" form
- Use proper Italian accents (à, è, é, ì, ò, ù)
- Translate ALL content including titles, meta descriptions, sections, tables, lists
- Keep markdown formatting intact
- Maintain the same structure and tone

## English Post to Translate:

**Title**: ${post.title}
**Meta Description**: ${post.meta_description}
**Excerpt**: ${post.excerpt}

**Content**:
${post.content}

Return ONLY valid JSON in this exact format:
{
  "title": "translated title",
  "meta_description": "translated meta description",
  "excerpt": "translated excerpt",
  "content": "complete translated content with all markdown",
  "slug": "italian-slug-version"
}`
  }]
});

const translation = JSON.parse(message.content[0].text);

// Insert into database
const { data, error } = await supabase
  .from('blog_posts')
  .insert({
    title: translation.title,
    slug: translation.slug,
    content: translation.content,
    excerpt: translation.excerpt,
    meta_description: translation.meta_description,
    language: 'it',
    status: 'published',
    author_id: post.author_id,
    featured_image: post.featured_image,
    category_id: post.category_id,
    tags: post.tags,
    published_at: post.published_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select();

if (error) {
  console.error('Error inserting:', error);
  process.exit(1);
}

console.log(`✅ ${postIndex + 1}/10 - Successfully translated and inserted: ${translation.slug}`);
