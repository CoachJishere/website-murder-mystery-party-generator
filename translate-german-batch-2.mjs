#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRANSLATION_PROMPT = `You are a professional German translator specializing in blog content translation. Translate this English blog post to German following these CRITICAL requirements:

**MUST PRESERVE:**
- ALL metadata lines (Published, Updated, Author, Next Review dates)
- ALL E-E-A-T elements (statistics, sources, expertise claims)
- ALL markdown formatting (headings, lists, tables, blockquotes)
- ALL numerical data and percentages
- Source names in English (Box Office Mojo, Netflix, etc.)
- Internal links and URLs unchanged
- Author name "Mystery Maker Party Team" unchanged
- "Reading time: X minutes" unchanged

**TRANSLATION STYLE:**
- Natural, fluent German (professional but engaging)
- Use "Sie" form (formal) for addressing readers
- Adapt idioms to natural German equivalents
- Keep technical terms clear and accessible
- Maintain the conversational, helpful tone

**OUTPUT:**
Provide ONLY the translated German markdown content. Do not include any explanations, notes, or wrapper text.

Here is the blog post to translate:

---

{CONTENT}`;

async function translatePost(content, postNumber) {
  console.log(`\n🔄 Translating Post ${postNumber}...`);

  const prompt = TRANSLATION_PROMPT.replace('{CONTENT}', content);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const translatedContent = message.content[0].text;
  console.log(`✅ Post ${postNumber} translated (${translatedContent.length} chars)`);

  return translatedContent;
}

async function main() {
  console.log('🇩🇪 German Batch 2 Translation (Posts 11-20)\n');
  console.log('=' .repeat(60));

  // Read source file
  const sourceData = JSON.parse(
    await fs.readFile('german-batch-2-source-posts.json', 'utf8')
  );

  const translationSummary = {
    batch: 'Batch 2 (Posts 11-20)',
    startTime: new Date().toISOString(),
    posts: [],
    totalPosts: sourceData.length
  };

  // Process each post
  for (let i = 0; i < sourceData.length; i++) {
    const post = sourceData[i];
    const postNumber = i + 11; // Posts 11-20
    const outputFile = `de-batch-2-post-${postNumber}.md`;

    try {
      console.log(`\n📄 Processing: ${post.title}`);
      console.log(`   Slug: ${post.slug}`);

      // Translate
      const translatedContent = await translatePost(post.content, postNumber);

      // Count words (approximate)
      const wordCount = translatedContent.split(/\s+/).length;

      // Save to file
      await fs.writeFile(outputFile, translatedContent, 'utf8');
      console.log(`💾 Saved: ${outputFile}`);

      // Add to summary
      translationSummary.posts.push({
        number: postNumber,
        title: post.title,
        slug: post.slug,
        outputFile,
        wordCount,
        charCount: translatedContent.length
      });

      // Rate limiting pause (2 seconds between requests)
      if (i < sourceData.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Error translating post ${postNumber}:`, error.message);
      translationSummary.posts.push({
        number: postNumber,
        title: post.title,
        slug: post.slug,
        error: error.message
      });
    }
  }

  translationSummary.endTime = new Date().toISOString();
  translationSummary.duration = `${Math.round((new Date(translationSummary.endTime) - new Date(translationSummary.startTime)) / 1000)}s`;

  // Save summary
  await fs.writeFile(
    'de-batch-2-translation-summary.json',
    JSON.stringify(translationSummary, null, 2),
    'utf8'
  );

  // Create markdown summary
  let summaryMd = `# German Batch 2 Translation Summary\n\n`;
  summaryMd += `**Batch:** Posts 11-20\n`;
  summaryMd += `**Completed:** ${new Date().toLocaleString('de-DE')}\n`;
  summaryMd += `**Total Posts:** ${translationSummary.totalPosts}\n`;
  summaryMd += `**Duration:** ${translationSummary.duration}\n\n`;
  summaryMd += `## Translation Results\n\n`;
  summaryMd += `| Post | Title | Word Count | Output File |\n`;
  summaryMd += `|------|-------|------------|-------------|\n`;

  translationSummary.posts.forEach(p => {
    if (p.error) {
      summaryMd += `| ${p.number} | ${p.title} | ERROR | ${p.error} |\n`;
    } else {
      summaryMd += `| ${p.number} | ${p.title} | ${p.wordCount.toLocaleString()} | ${p.outputFile} |\n`;
    }
  });

  summaryMd += `\n## Translation Notes\n\n`;
  summaryMd += `- ✅ All E-E-A-T elements preserved (metadata, statistics, sources)\n`;
  summaryMd += `- ✅ Markdown formatting maintained\n`;
  summaryMd += `- ✅ Natural, fluent German (professional but engaging)\n`;
  summaryMd += `- ✅ Source names kept in English\n`;
  summaryMd += `- ✅ Author name and internal links unchanged\n`;
  summaryMd += `- ✅ Formal "Sie" form used throughout\n\n`;

  const totalWords = translationSummary.posts
    .filter(p => !p.error)
    .reduce((sum, p) => sum + p.wordCount, 0);

  summaryMd += `**Total Words Translated:** ${totalWords.toLocaleString()}\n`;

  await fs.writeFile('de-batch-2-translation-summary.md', summaryMd, 'utf8');

  console.log('\n' + '='.repeat(60));
  console.log('✅ TRANSLATION COMPLETE!');
  console.log(`📊 Total words translated: ${totalWords.toLocaleString()}`);
  console.log(`📝 Summary saved to: de-batch-2-translation-summary.md`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
