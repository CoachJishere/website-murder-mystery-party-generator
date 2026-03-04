#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Step 1: Fetch posts 31-40
console.log('Step 1: Fetching German Batch 4 posts (31-40)...\n');

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, slug, title, meta_description, content, created_at')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('created_at', { ascending: true })
  .range(30, 39); // Posts 31-40 (0-indexed)

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Fetched ${posts.length} posts:\n`);
posts.forEach((post, i) => {
  console.log(`${i + 31}. ${post.title}`);
  console.log(`   Slug: ${post.slug}\n`);
});

// Save source posts
await fs.writeFile(
  'german-batch-4-source-posts.json',
  JSON.stringify(posts, null, 2)
);
console.log('✓ Saved to german-batch-4-source-posts.json\n');

// Step 2: Translate each post
console.log('Step 2: Translating all 10 posts to German...\n');

const translationPrompt = `You are a professional German translator specializing in E-E-A-T compliant content for murder mystery party guides.

CRITICAL REQUIREMENTS:
1. Maintain ALL markdown formatting exactly (headers, tables, lists, bold, italic, links)
2. Keep ALL English metadata lines at the top unchanged (Published dates, Author, etc.)
3. Preserve ALL table structures with German translations
4. Keep all statistics and numbers identical
5. Translate naturally for German audiences while maintaining professional tone
6. Keep proper nouns in English (brand names, study names, BMO Financial, etc.)
7. Preserve all HTML/markdown syntax
8. Maintain E-E-A-T signals (expertise, authority, trustworthiness)

TRANSLATION GUIDELINES:
- "murder mystery party" → "Krimi-Party" or "Detektivparty" (context-dependent)
- "host" → "Gastgeber/in"
- "guest" → "Gast"
- "clue" → "Hinweis"
- "suspect" → "Verdächtige/r"
- "detective" → "Detektiv/in"
- Keep measurement units as-is (feet, inches, dollars)
- Keep quoted expert statements in English with German context

Translate this complete blog post to German:`;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const postNumber = i + 31;

  console.log(`\nTranslating Post ${postNumber}: ${post.title}...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `${translationPrompt}

TITLE: ${post.title}

META DESCRIPTION: ${post.meta_description}

CONTENT:
${post.content}`
      }]
    });

    const translatedContent = message.content[0].text;

    // Save translation
    await fs.writeFile(
      `de-batch-4-post-${postNumber}.md`,
      translatedContent
    );

    console.log(`✓ Saved de-batch-4-post-${postNumber}.md`);
    console.log(`  Tokens used: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);

    // Rate limiting - wait 2 seconds between requests
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error(`✗ Error translating post ${postNumber}:`, error.message);
    process.exit(1);
  }
}

// Create summary
const summary = `# German Batch 4 Translation Report
**Date:** ${new Date().toISOString().split('T')[0]}
**Posts:** 31-40 (10 posts)

## Translated Posts

${posts.map((post, i) => {
  const postNumber = i + 31;
  return `${postNumber}. **${post.title}**
   - Slug: \`${post.slug}\`
   - File: \`de-batch-4-post-${postNumber}.md\`
   - Original ID: \`${post.id}\``;
}).join('\n\n')}

## Next Steps

1. Review all 10 translated files for quality
2. Insert into Supabase using batch insert script
3. Verify German posts are published correctly

## Files Created

- \`german-batch-4-source-posts.json\` (source data)
- \`de-batch-4-post-31.md\` through \`de-batch-4-post-40.md\` (translations)
- This summary report

---
**Status:** ✓ Complete
`;

await fs.writeFile('GERMAN-BATCH-4-TRANSLATION-REPORT.md', summary);

console.log('\n' + '='.repeat(60));
console.log('TRANSLATION COMPLETE!');
console.log('='.repeat(60));
console.log('\nFiles created:');
console.log('- german-batch-4-source-posts.json');
console.log('- de-batch-4-post-31.md through de-batch-4-post-40.md');
console.log('- GERMAN-BATCH-4-TRANSLATION-REPORT.md');
console.log('\nAll 10 posts successfully translated to German.');
