import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('\n=== TRANSLATING POST 21: Innocent Bystander ===\n');

// Fetch the English post
const { data: post, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('id', '7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02')
  .eq('language', 'en')
  .single();

if (error || !post) {
  console.error('❌ Error fetching post:', error);
  process.exit(1);
}

console.log(`📝 Post: ${post.title}`);
console.log(`📏 Content length: ${post.content.length} chars\n`);

// Translate with Claude
console.log('🤖 Translating with Claude Opus 4...\n');

const message = await anthropic.messages.create({
  model: 'claude-opus-4-20250514',
  max_tokens: 16000,
  temperature: 1,
  messages: [{
    role: 'user',
    content: `You are a professional translator specializing in French localization for murder mystery party content.

Translate this blog post to French following these strict standards:

**Translation Requirements:**
- Use formal "vous" throughout
- Natural, engaging French (not literal translation)
- Preserve all E-E-A-T markers (expertise, authority, trust)
- Maintain SEO optimization and readability
- Keep markdown formatting exactly as is
- Keep HTML/JSX elements unchanged
- Keep source citations in English
- Preserve all links, metadata, and structure

**Title:** ${post.title}

**Meta Description:** ${post.meta_description}

**Content:**
${post.content}

**Instructions:**
Return ONLY a JSON object with this exact structure:
{
  "title": "French title",
  "meta_description": "French meta description",
  "content": "Full French content with all markdown preserved"
}

No other text, no explanations, just valid JSON.`
  }]
});

const translatedText = message.content[0].text;
console.log('✓ Translation complete\n');

// Parse the JSON response
let translated;
try {
  // Extract JSON from response (in case there's extra text)
  const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    translated = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('No JSON found in response');
  }
} catch (e) {
  console.error('❌ Error parsing JSON:', e.message);
  fs.writeFileSync('./fr-post-21-raw.txt', translatedText);
  console.log('Raw response saved to fr-post-21-raw.txt');
  process.exit(1);
}

// Create markdown file
const markdown = `---
Title: ${translated.title}
Meta Description: ${translated.meta_description}
Slug: ${post.slug}
Original ID: ${post.id}
---

${translated.content}`;

fs.writeFileSync('./fr-complete-post-21.md', markdown);

console.log('✅ Translation saved to: fr-complete-post-21.md');
console.log(`\n📊 Stats:`);
console.log(`   Title: ${translated.title}`);
console.log(`   Meta: ${translated.meta_description.substring(0, 80)}...`);
console.log(`   Content: ${translated.content.length} chars\n`);
