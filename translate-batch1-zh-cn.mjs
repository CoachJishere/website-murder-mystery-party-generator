import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
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

const postsToTranslate = [
  '1920s-speakeasy-murder-mystery-party-guide',
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
  '5-haunted-mansion-murder-mystery-themes',
  '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless'
];

async function fetchEnglishPost(slug) {
  console.log(`\n📖 Fetching English post: ${slug}`);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error(`❌ Error fetching post: ${error.message}`);
    return null;
  }

  console.log(`✅ Fetched: ${data.title}`);
  return data;
}

async function translateToChineseWithClaude(englishPost) {
  console.log(`\n🤖 Translating to Chinese (zh-cn): ${englishPost.title}`);

  const prompt = `You are a professional translator specializing in Chinese (Simplified) translations for murder mystery party content.

Translate the following blog post to Chinese (zh-cn) with these requirements:

**E-E-A-T Format Requirements:**
- Use Simplified Chinese characters (简体中文)
- Author: "神秘派对专家团队" (Mystery Party Expert Team)
- Expertise claim: "基于分析10,000+场神秘派对活动" (Based on analyzing 10,000+ mystery party events)
- Review date format: "下次审核：2026年6月" (Next review: June 2026)
- Use formal business tone (商务正式)
- Date format: YYYY年MM月DD日
- Preserve ALL markdown formatting, HTML tags, links, and structure EXACTLY

**English Post:**
Title: ${englishPost.title}
Meta Description: ${englishPost.meta_description}
Content:
${englishPost.content}

**Instructions:**
1. Translate the title to Chinese
2. Translate the meta description to Chinese
3. Translate the full content to Chinese, preserving:
   - All markdown headers (##, ###, etc.)
   - All lists (ordered and unordered)
   - All links [text](url) - translate text, keep URL
   - All bold/italic formatting
   - All HTML elements
   - All line breaks and paragraph structure
4. Add E-E-A-T metadata section at the beginning of the content in Chinese format
5. Use culturally appropriate Chinese expressions while maintaining the meaning

Return ONLY a JSON object with this structure (no markdown code blocks):
{
  "title": "translated Chinese title",
  "meta_description": "translated Chinese meta description",
  "content": "full translated Chinese content with E-E-A-T metadata and preserved formatting"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text.trim();

    // Remove markdown code blocks if present
    let cleanedResponse = responseText;
    if (responseText.startsWith('```json')) {
      cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
    } else if (responseText.startsWith('```')) {
      cleanedResponse = responseText.replace(/```\n?/g, '').trim();
    }

    const translation = JSON.parse(cleanedResponse);

    console.log(`✅ Translation completed`);
    console.log(`   Title: ${translation.title.substring(0, 50)}...`);
    console.log(`   Content length: ${translation.content.length} chars`);

    return translation;
  } catch (error) {
    console.error(`❌ Translation error: ${error.message}`);
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    return null;
  }
}

async function insertChinesePost(englishPost, translation) {
  console.log(`\n💾 Inserting Chinese post into database`);

  const chineseSlug = `${englishPost.slug}-zh-cn`;

  const postData = {
    title: translation.title,
    slug: chineseSlug,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'zh-cn',
    status: 'published',
    published_at: new Date().toISOString(),
    author: '神秘派对专家团队',
    reading_time_minutes: englishPost.reading_time_minutes || 8,
    category: englishPost.category || 'murder-mystery-guides',
    tags: englishPost.tags || ['murder-mystery', 'party-planning', 'themed-parties'],
    featured_image_url: englishPost.featured_image_url,
    featured_image_alt: translation.title,
    canonical_url: englishPost.canonical_url,
    is_optimized: true,
    optimized_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([postData])
    .select();

  if (error) {
    console.error(`❌ Insert error: ${error.message}`);
    return false;
  }

  console.log(`✅ Successfully inserted: ${chineseSlug}`);
  console.log(`   Post ID: ${data[0].id}`);
  return true;
}

async function translateAndInsertPost(slug) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 Processing: ${slug}`);
  console.log(`${'='.repeat(80)}`);

  // Step 1: Fetch English post
  const englishPost = await fetchEnglishPost(slug);
  if (!englishPost) {
    console.log(`❌ Failed to fetch post, skipping...`);
    return false;
  }

  // Step 2: Translate to Chinese
  const translation = await translateToChineseWithClaude(englishPost);
  if (!translation) {
    console.log(`❌ Failed to translate post, skipping...`);
    return false;
  }

  // Step 3: Insert into database
  const success = await insertChinesePost(englishPost, translation);

  if (success) {
    console.log(`\n✅ ✅ ✅ Successfully completed: ${slug}`);
  } else {
    console.log(`\n❌ ❌ ❌ Failed to complete: ${slug}`);
  }

  return success;
}

async function main() {
  console.log('🚀 Starting Chinese (zh-cn) Translation Batch 1');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`📝 Total posts to translate: ${postsToTranslate.length}\n`);

  const results = {
    success: [],
    failed: []
  };

  for (const slug of postsToTranslate) {
    const success = await translateAndInsertPost(slug);

    if (success) {
      results.success.push(slug);
    } else {
      results.failed.push(slug);
    }

    // Wait 2 seconds between posts to avoid rate limiting
    if (slug !== postsToTranslate[postsToTranslate.length - 1]) {
      console.log('\n⏳ Waiting 2 seconds before next post...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final report
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📈 Success rate: ${((results.success.length / postsToTranslate.length) * 100).toFixed(1)}%`);

  if (results.success.length > 0) {
    console.log('\n✅ Successfully translated:');
    results.success.forEach(slug => console.log(`   - ${slug}`));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed to translate:');
    results.failed.forEach(slug => console.log(`   - ${slug}`));
  }

  console.log('\n🎉 Translation batch complete!\n');
}

main().catch(console.error);
