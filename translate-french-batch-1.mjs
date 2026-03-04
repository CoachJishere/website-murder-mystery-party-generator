import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const FRENCH_EEAT = '*Publié : 16 février 2026 | Mis à jour : 28 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 28 mai 2026*';

const TRANSLATION_PROMPT = `You are a professional translator specializing in French localization for party planning and entertainment content.

Translate this English blog post to French with these requirements:

1. **Tone & Style**:
   - Use formal "vous" form throughout
   - Maintain engaging, enthusiastic tone
   - Keep professional yet approachable voice
   - Preserve all formatting (headers, lists, bold, italic)

2. **E-E-A-T Compliance**:
   - Replace English E-E-A-T footer with: ${FRENCH_EEAT}
   - Maintain expertise, authority, and trustworthiness
   - Keep all practical tips and actionable advice

3. **Formatting**:
   - Preserve all markdown structure
   - Keep header hierarchy (##, ###, ####)
   - Maintain bullet points and numbered lists
   - Preserve bold (**text**) and italic (*text*)

4. **SEO & Metadata**:
   - Translate title naturally for French SEO
   - Translate meta description (max 155 characters)
   - Keep keyword relevance for French search

5. **Cultural Adaptation**:
   - Adapt idioms and expressions for French audience
   - Keep cultural references relevant
   - Maintain European French conventions

6. **Content Integrity**:
   - Translate ALL content (don't skip sections)
   - Keep the same level of detail
   - Preserve all tips, warnings, and advice

Return ONLY the translated markdown content with NO additional commentary or wrapper text.`;

async function translatePost(post, index) {
  const postNumber = index + 1;
  console.log(`\n[${ postNumber}/10] Translating: ${post.title}`);
  console.log(`Slug: ${post.slug}`);
  
  const contentToTranslate = `
TITLE: ${post.title}

META DESCRIPTION: ${post.meta_description || ''}

CONTENT:
${post.content}
`.trim();

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 1,
      messages: [{
        role: 'user',
        content: `${TRANSLATION_PROMPT}\n\n---\n\n${contentToTranslate}`
      }]
    });

    const translatedContent = message.content[0].text;
    
    // Extract title and meta from translation
    const titleMatch = translatedContent.match(/^#\s+(.+)$/m);
    const translatedTitle = titleMatch ? titleMatch[1] : post.title;
    
    // Create French slug
    const frenchSlug = post.slug + '-fr';
    
    // Save translation to markdown file
    const filename = `fr-batch-1-post-${postNumber}.md`;
    const fileContent = `---
Original Slug: ${post.slug}
French Slug: ${frenchSlug}
Post Number: ${postNumber}
Original Title: ${post.title}
French Title: ${translatedTitle}
Created: ${new Date().toISOString()}
---

${translatedContent}
`;
    
    writeFileSync(filename, fileContent);
    console.log(`✓ Saved: ${filename}`);
    
    return {
      postNumber,
      originalSlug: post.slug,
      frenchSlug,
      originalTitle: post.title,
      frenchTitle: translatedTitle,
      filename,
      translatedContent,
      success: true
    };
    
  } catch (error) {
    console.error(`✗ Error translating post ${postNumber}:`, error.message);
    return {
      postNumber,
      originalSlug: post.slug,
      originalTitle: post.title,
      error: error.message,
      success: false
    };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('FRENCH TRANSLATION - BATCH 1 (Posts 1-10)');
  console.log('='.repeat(70));
  
  // Load source posts
  const posts = JSON.parse(readFileSync('french-batch-1-source-posts.json', 'utf-8'));
  console.log(`\nLoaded ${posts.length} posts for translation\n`);
  
  const results = [];
  
  // Translate each post sequentially
  for (let i = 0; i < posts.length; i++) {
    const result = await translatePost(posts[i], i);
    results.push(result);
    
    // Small delay between translations
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Generate summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n' + '='.repeat(70));
  console.log('TRANSLATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal Posts: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}\n`);
  
  if (successful.length > 0) {
    console.log('Successfully Translated:');
    successful.forEach(r => {
      console.log(`  ${r.postNumber}. ${r.originalTitle}`);
      console.log(`     → ${r.frenchTitle}`);
      console.log(`     File: ${r.filename}`);
      console.log('');
    });
  }
  
  if (failed.length > 0) {
    console.log('Failed Translations:');
    failed.forEach(r => {
      console.log(`  ${r.postNumber}. ${r.originalTitle}`);
      console.log(`     Error: ${r.error}`);
      console.log('');
    });
  }
  
  // Save summary to file
  const summaryContent = `# French Translation Batch 1 Summary
Generated: ${new Date().toISOString()}

## Statistics
- Total Posts: ${results.length}
- Successful: ${successful.length}
- Failed: ${failed.length}

## Translated Posts

${successful.map(r => `### ${r.postNumber}. ${r.frenchTitle}
- **Original**: ${r.originalTitle}
- **Original Slug**: ${r.originalSlug}
- **French Slug**: ${r.frenchSlug}
- **File**: ${r.filename}
`).join('\n')}

${failed.length > 0 ? `## Failed Translations\n${failed.map(r => `- ${r.postNumber}. ${r.originalTitle}: ${r.error}`).join('\n')}` : ''}

## Next Steps
1. Review translated files (fr-batch-1-post-1.md through fr-batch-1-post-10.md)
2. Verify E-E-A-T footer format: ${FRENCH_EEAT}
3. Insert into Supabase blog_posts table
4. Update translation tracking
`;
  
  writeFileSync('french-batch-1-translation-summary.md', summaryContent);
  console.log('Summary saved to: french-batch-1-translation-summary.md\n');
}

main();
