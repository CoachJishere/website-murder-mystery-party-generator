import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const postIndex = parseInt(process.argv[2]);
if (isNaN(postIndex)) {
  console.error('Usage: node translate-post-italian.mjs <post-index>');
  console.error('Example: node translate-post-italian.mjs 10');
  process.exit(1);
}

// Fetch all optimized posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
const post = optimized[postIndex - 1]; // Convert 1-based to 0-based index

if (!post) {
  console.error(`Post ${postIndex} not found`);
  process.exit(1);
}

console.log(`\n📝 Translating post ${postIndex}: ${post.slug}`);
console.log(`Title: ${post.title}`);

// Translation prompt
const translationPrompt = `Translate this complete English blog post to Italian following these requirements:

## Italian Format Requirements:
- **E-E-A-T timestamp**: "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*"
- **Research note**: "*Basato sull'analisi di oltre 10.000 feste misteriose e ricerca su [theme]*"
- **Table headers**: "| Statistica | Valore | Fonte |"
- **Reading time**: "Tempo di lettura: X minuti"
- Use formal "Lei" form throughout
- Preserve all accents (è, é, à, ì, ò, ù)
- Keep all markdown formatting intact
- Translate ALL content including meta descriptions, headings, tables, lists, etc.
- Keep the same structure and formatting

## English Post:

Title: ${post.title}
Slug: ${post.slug}
Meta Description: ${post.meta_description}

Content:
${post.content}

## Output Format:
Return ONLY a JSON object with these fields (no markdown, no code blocks):
{
  "title": "translated title",
  "slug": "italian-slug",
  "meta_description": "translated meta description",
  "content": "full translated content"
}`;

const message = await anthropic.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 16000,
  temperature: 1,
  messages: [{
    role: 'user',
    content: translationPrompt
  }]
});

const responseText = message.content[0].text;

// Extract JSON from response (handle potential markdown code blocks)
let translation;
try {
  // Try direct parse first
  translation = JSON.parse(responseText);
} catch (e) {
  // Try to extract from code block
  const jsonMatch = responseText.match(/```json?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    translation = JSON.parse(jsonMatch[1]);
  } else {
    throw new Error('Could not parse translation response');
  }
}

console.log('\n✅ Translation complete');
console.log(`Italian slug: ${translation.slug}`);

// Insert into database
const { error: insertError } = await supabase
  .from('blog_posts')
  .insert({
    title: translation.title,
    slug: translation.slug,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'it',
    category: post.category,
    published: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

if (insertError) {
  console.error('Error inserting:', insertError);
  process.exit(1);
}

console.log(`✅ ${postIndex}/10 done - Inserted into database with language='it'`);
