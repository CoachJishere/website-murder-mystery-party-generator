import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient('https://mhfikaomkmqcndqfohbp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const posts = JSON.parse(readFileSync('./temp-files/posts-to-translate-ja.json', 'utf-8'));

const TRANSLATION_PROMPT = `You are a professional translator specializing in Japanese localization for entertainment and party planning content.

CRITICAL RULES FOR JAPANESE TRANSLATION:
1. Use polite です/ます form throughout
2. Use appropriate kanji with natural Japanese phrasing (avoid overly literal translations)
3. Use Arabic numerals (1, 2, 3) NOT Japanese numerals (一、二、三)
4. NO spaces between Japanese characters (except before/after English words/numbers)
5. Maintain all markdown formatting exactly
6. Keep all HTML tags, links, and structure identical
7. Translate naturally for Japanese readers while preserving SEO value

STANDARD TRANSLATIONS:
- "Market Trends & Popularity" → "市場動向と人気"
- "What 10,000+ Mystery Parties Have Taught Us" → "10,000以上のミステリーパーティーから学んだこと"
- "Sources & References" → "出典と参考文献"
- "FAQ" → "よくある質問"
- "Reading time: X minutes" → "読了時間：X分"
- Table headers: "| 統計 | 値 | 出典 |"

E-E-A-T BYLINE (use this exact format):
*公開日：2026年2月16日 | 更新日：2026年2月20日 | 著者：Mystery Maker Party チーム | 次回レビュー：2026年5月20日*

Translate the following blog post to Japanese. Return ONLY the translated content, no explanations:`;

async function translatePost(post, index) {
  console.log(`\n[${ index + 1}/5] Translating: ${post.title}`);
  console.log(`Slug: ${post.slug}`);

  try {
    // Translate title
    console.log('  → Translating title...');
    const titleResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Translate this title to Japanese (natural, engaging, SEO-friendly). Return ONLY the translation:\n\n${post.title}`
      }]
    });
    const translatedTitle = titleResponse.content[0].text.trim();
    console.log(`  ✓ Title: ${translatedTitle}`);

    // Translate meta description
    console.log('  → Translating meta description...');
    const metaResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Translate this meta description to Japanese (compelling, under 160 chars). Return ONLY the translation:\n\n${post.meta_description}`
      }]
    });
    const translatedMeta = metaResponse.content[0].text.trim();
    console.log(`  ✓ Meta: ${translatedMeta.substring(0, 80)}...`);

    // Translate main content
    console.log('  → Translating content (this will take a moment)...');
    const contentResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `${TRANSLATION_PROMPT}\n\n${post.content}`
      }]
    });
    const translatedContent = contentResponse.content[0].text.trim();
    console.log(`  ✓ Content: ${translatedContent.length} characters`);

    // Prepare Japanese post object
    const japanesePost = {
      title: translatedTitle,
      slug: post.slug,
      content: translatedContent,
      excerpt: translatedMeta,
      meta_description: translatedMeta,
      language: 'ja',
      category: post.category,
      featured_image: post.featured_image,
      author: post.author,
      reading_time: post.reading_time,
      published: post.published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into database
    console.log('  → Inserting into database...');
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([japanesePost])
      .select();

    if (error) {
      console.error(`  ✗ Error inserting:`, error);
      return { success: false, title: post.title, error };
    }

    console.log(`  ✓ Inserted successfully (ID: ${data[0].id})`);
    return { success: true, title: translatedTitle, originalTitle: post.title };

  } catch (error) {
    console.error(`  ✗ Error translating:`, error.message);
    return { success: false, title: post.title, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('JAPANESE TRANSLATION - BATCH 1 (Posts 0-4)');
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const result = await translatePost(posts[i], i);
    results.push(result);

    // Brief pause between translations
    if (i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TRANSLATION SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/5`);
  successful.forEach(r => {
    console.log(`  ✓ ${r.title}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/5`);
    failed.forEach(r => {
      console.log(`  ✗ ${r.title}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

main();
