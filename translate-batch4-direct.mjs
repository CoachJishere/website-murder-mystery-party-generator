#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Read the source posts JSON file that will be provided
console.log('Reading source posts from german-batch-4-source-posts.json...\n');

let posts;
try {
  const data = await fs.readFile('german-batch-4-source-posts.json', 'utf-8');
  posts = JSON.parse(data);
} catch (error) {
  console.error('Error reading source posts file:', error.message);
  console.log('\nPlease ensure german-batch-4-source-posts.json exists first.');
  process.exit(1);
}

console.log(`Found ${posts.length} posts to translate\n`);

// Translation prompt
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

// Translate each post
for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const postNumber = i + 31;

  console.log(`\n[${ i + 1}/${posts.length}] Translating Post ${postNumber}:`);
  console.log(`Title: ${post.title}`);

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

    console.log(`✓ Saved: de-batch-4-post-${postNumber}.md`);
    console.log(`  Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);

    // Rate limiting - wait 2 seconds between requests
    if (i < posts.length - 1) {
      console.log('  Waiting 2 seconds...');
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
console.log('✓ TRANSLATION COMPLETE!');
console.log('='.repeat(60));
console.log('\nFiles created:');
console.log('- de-batch-4-post-31.md through de-batch-4-post-40.md (10 files)');
console.log('- GERMAN-BATCH-4-TRANSLATION-REPORT.md');
console.log('\nAll 10 posts successfully translated to German.');
