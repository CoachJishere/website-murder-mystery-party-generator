#!/usr/bin/env node

import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const posts = JSON.parse(fs.readFileSync('german-batch-1-source-posts.json', 'utf-8'));

console.log(`Found ${posts.length} posts to translate\n`);

const translationPrompt = (postNumber, title, content) => `You are a professional German translator specializing in event planning and entertainment content.

Translate this English blog post about murder mystery parties to German.

**CRITICAL REQUIREMENTS:**

1. **Preserve ALL E-E-A-T Elements:**
   - Metadata header format: "*Veröffentlicht: [date] | Aktualisiert: [date] | Autor: Mystery Maker Party Team | Nächste Überprüfung: [date]*"
   - Keep author name as "Mystery Maker Party Team" (do not translate)
   - Expertise claim: Translate "Based on analyzing 10,000+ murder mystery parties..." to German
   - ALL statistics tables: Translate table headers and content, but KEEP source names in English
   - Sources & References section: Keep source titles in English, translate section headers

2. **Markdown Formatting:**
   - Preserve ALL headers (##, ###, ####)
   - Keep ALL tables intact with proper markdown formatting
   - Maintain bullet points, numbered lists
   - Preserve bold (**text**) and italic (*text*)
   - Keep blockquotes (>)
   - Preserve all links

3. **Translation Quality:**
   - Natural, fluent German (not literal translation)
   - Professional but engaging tone
   - Appropriate for educated adults hosting parties
   - Use German cultural context where appropriate
   - Maintain the enthusiastic, helpful tone of the original

4. **Do NOT Translate:**
   - Author name: "Mystery Maker Party Team"
   - Internal links like [Create your custom mystery](#)
   - Source titles in References section (keep in English)
   - Statistics source names in tables (keep in English)

5. **Date Format:**
   - Convert dates to German format but keep the dates the same
   - February 16, 2026 → 16. Februar 2026

**Original Title:** ${title}

**Original Content:**
${content}

**Output Format:**
Return ONLY the translated markdown content, starting with the metadata line and ending with the references section. Do not include any explanations or notes outside the translation.`;

async function translatePost(postNumber, post) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Translating Post ${postNumber}: ${post.title}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: translationPrompt(postNumber, post.title, post.content)
        }
      ]
    });

    const translatedContent = message.content[0].text;

    // Calculate German reading time (words / 200)
    const wordCount = translatedContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Extract German title from first header
    const titleMatch = translatedContent.match(/##\s+(.+)/);
    const germanTitle = titleMatch ? titleMatch[1] : post.title;

    // Save translated post
    const filename = `de-batch-1-post-${postNumber}.md`;
    fs.writeFileSync(filename, translatedContent, 'utf-8');

    console.log(`✓ Saved: ${filename}`);
    console.log(`  Original title: ${post.title}`);
    console.log(`  German title: ${germanTitle}`);
    console.log(`  Word count: ${wordCount}`);
    console.log(`  Reading time: ${readingTime} min`);

    return {
      postNumber,
      originalTitle: post.title,
      germanTitle,
      slug: post.slug,
      wordCount,
      readingTime,
      filename
    };

  } catch (error) {
    console.error(`✗ Error translating post ${postNumber}:`, error.message);
    return {
      postNumber,
      originalTitle: post.title,
      error: error.message
    };
  }
}

async function main() {
  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const result = await translatePost(i + 1, posts[i]);
    results.push(result);

    // Small delay between API calls
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Create summary file
  const summary = {
    translationDate: new Date().toISOString(),
    totalPosts: posts.length,
    successful: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    results: results
  };

  fs.writeFileSync('german-batch-1-translation-summary.json', JSON.stringify(summary, null, 2), 'utf-8');

  // Create markdown summary
  let mdSummary = `# German Translation Summary - Batch 1\n\n`;
  mdSummary += `**Translation Date:** ${new Date().toISOString().split('T')[0]}\n`;
  mdSummary += `**Total Posts:** ${posts.length}\n`;
  mdSummary += `**Successful:** ${summary.successful}\n`;
  mdSummary += `**Failed:** ${summary.failed}\n\n`;
  mdSummary += `## Translation Results\n\n`;
  mdSummary += `| # | Original Title | German Title | Words | Reading Time | Status |\n`;
  mdSummary += `|---|----------------|--------------|-------|--------------|--------|\n`;

  results.forEach(r => {
    if (r.error) {
      mdSummary += `| ${r.postNumber} | ${r.originalTitle} | - | - | - | ❌ Error |\n`;
    } else {
      mdSummary += `| ${r.postNumber} | ${r.originalTitle} | ${r.germanTitle} | ${r.wordCount} | ${r.readingTime} min | ✅ |\n`;
    }
  });

  mdSummary += `\n## Files Created\n\n`;
  results.filter(r => !r.error).forEach(r => {
    mdSummary += `- \`${r.filename}\` - ${r.germanTitle}\n`;
  });

  fs.writeFileSync('GERMAN-BATCH-1-SUMMARY.md', mdSummary, 'utf-8');

  console.log(`\n${'='.repeat(60)}`);
  console.log('TRANSLATION COMPLETE');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total: ${posts.length} posts`);
  console.log(`Successful: ${summary.successful}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`\nSummary saved to: GERMAN-BATCH-1-SUMMARY.md`);
}

main().catch(console.error);
