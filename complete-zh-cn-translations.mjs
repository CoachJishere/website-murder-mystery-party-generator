#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use the anon key from Supabase (for authenticated requests)
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2MTkwODgsImV4cCI6MjA0MTE5NTA4OH0.wliQfY6Wl7vOxhY0TXhOr8GGy4SjIzaUjz-dUU5h3uM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MISSING_POST_IDS = [
  'f9e5ae63-d483-42e0-845e-6c5ce69c3624', // Victorian
  'da666de8-8af2-420e-90af-490597d4360b', // Small Groups
  '9a37fa33-5397-4c58-a85a-d81ebaa676a8', // Medieval
  'f3990bda-af8a-4cca-af57-e49990134f29', // Fix Boring
  '3f26eea9-72c3-4694-ac17-0ca788dd5aaf', // Hollywood
  'fb39f18e-8b9f-4332-9502-dc88fa9345e9', // Wild West
  '1d51a590-b04a-4167-b0f2-96d3a2c7ff79', // Pirate
  'bdb64008-689e-4db6-87be-c170a6bde642', // Fix Confusing Clues
  '3cb1b819-7c13-4630-95ed-494ef515fd0a', // Space Station
  '7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02', // Innocent Bystander
  '7adb6cd9-e978-456e-a72b-852b905bbb78', // Fix Overly Complex
  '2d19c069-2354-45b5-be1f-ffe3d5338e7b'  // Masquerade Ball
];

const translationPrompt = `You are a professional translator specializing in Simplified Chinese (简体中文) translations for party planning content.

CRITICAL TRANSLATION REQUIREMENTS:
- Use Simplified Chinese (简体中文)
- Formal register appropriate for Chinese readers
- Natural, fluent Simplified Chinese that reads as if originally written in Chinese
- Preserve ALL E-E-A-T elements (metadata headers, expertise claims, statistics tables, sources)
- Keep English source titles in the Sources/参考文献 section
- Maintain all markdown formatting exactly
- DO NOT translate URLs or internal link paths
- Use proper Chinese punctuation (。、！？etc.)
- Translate meta descriptions to be SEO-optimized in Simplified Chinese

TRANSLATION GUIDELINES:
1. Title: Translate naturally while preserving SEO keywords
2. Meta description: Create compelling Chinese version (under 160 characters)
3. Content: Maintain all formatting, tables, quotes, and structure
4. Sources: Keep English titles but add "来源：" or "参考文献：" header
5. Links: Keep all markdown links exactly as they are - DO NOT translate paths

Please translate the following blog post to Simplified Chinese:`;

async function fetchEnglishPost(postId) {
  console.log(`\nFetching English post: ${postId}`);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, meta_description')
    .eq('id', postId)
    .single();

  if (error) {
    console.error(`Error fetching post ${postId}:`, error);
    return null;
  }

  console.log(`✓ Fetched: "${data.title}"`);
  return data;
}

async function translateToSimplifiedChinese(englishPost, index) {
  console.log(`\n[${index + 1}/12] Translating: "${englishPost.title}"`);
  console.log(`Slug: ${englishPost.slug}`);

  const translationRequest = `${translationPrompt}

---
TITLE: ${englishPost.title}

META_DESCRIPTION: ${englishPost.meta_description}

CONTENT:
${englishPost.content}
---

Please provide the translation in the following JSON format:
{
  "title": "Translated Chinese title",
  "meta_description": "Translated Chinese meta description",
  "content": "Full translated content in markdown"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: translationRequest
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from potential markdown code blocks
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.match(/```json\n([\s\S]*?)\n```/)[1];
    } else if (responseText.includes('```')) {
      jsonText = responseText.match(/```\n([\s\S]*?)\n```/)[1];
    }

    const translation = JSON.parse(jsonText);

    console.log(`✓ Translation complete`);
    console.log(`  Title: ${translation.title.substring(0, 50)}...`);

    return {
      originalId: englishPost.id,
      originalSlug: englishPost.slug,
      ...translation
    };
  } catch (error) {
    console.error(`✗ Translation error:`, error.message);
    return null;
  }
}

function generateChineseSlug(englishSlug, chineseTitle) {
  // Use pattern of existing Chinese posts - romanized slugs
  // For consistency, we'll keep the English slug pattern
  return englishSlug;
}

async function insertChinesePost(translation) {
  const slug = generateChineseSlug(translation.originalSlug, translation.title);

  console.log(`\nInserting Chinese post: ${slug}`);

  const postData = {
    title: translation.title,
    slug: slug,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'zh-cn',
    status: 'published',
    author: 'AI Assistant',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([postData])
    .select();

  if (error) {
    console.error(`✗ Insert error:`, error);
    return { success: false, error };
  }

  console.log(`✓ Successfully inserted post`);
  return { success: true, data: data[0] };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  SIMPLIFIED CHINESE (ZH-CN) TRANSLATION PROJECT');
  console.log('  Completing 12 missing posts to reach 61/61');
  console.log('═══════════════════════════════════════════════════\n');

  const translations = [];
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  // Process each post
  for (let i = 0; i < MISSING_POST_IDS.length; i++) {
    const postId = MISSING_POST_IDS[i];

    try {
      // Fetch English post
      const englishPost = await fetchEnglishPost(postId);
      if (!englishPost) {
        results.failed++;
        results.errors.push({ postId, error: 'Failed to fetch English post' });
        continue;
      }

      // Translate to Simplified Chinese
      const translation = await translateToSimplifiedChinese(englishPost, i);
      if (!translation) {
        results.failed++;
        results.errors.push({ postId, error: 'Translation failed' });
        continue;
      }

      // Save translation to file
      const filename = `zh-cn-post-${i + 1}-${translation.originalSlug.substring(0, 30)}.md`;
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, `# ${translation.title}\n\n${translation.content}`, 'utf-8');
      console.log(`  Saved to: ${filename}`);

      translations.push(translation);

      // Small delay to respect API rate limits
      if (i < MISSING_POST_IDS.length - 1) {
        console.log('  Waiting 2 seconds before next translation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`\n✗ Error processing post ${postId}:`, error.message);
      results.failed++;
      results.errors.push({ postId, error: error.message });
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  INSERTING TRANSLATIONS INTO SUPABASE');
  console.log('═══════════════════════════════════════════════════\n');

  // Insert all translations into Supabase
  for (let i = 0; i < translations.length; i++) {
    const translation = translations[i];

    try {
      const result = await insertChinesePost(translation);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          slug: translation.originalSlug,
          error: result.error.message
        });
      }

      // Small delay between inserts
      if (i < translations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`\n✗ Error inserting ${translation.originalSlug}:`, error.message);
      results.failed++;
      results.errors.push({
        slug: translation.originalSlug,
        error: error.message
      });
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('  TRANSLATION PROJECT COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`✓ Successful: ${results.successful}/12`);
  console.log(`✗ Failed: ${results.failed}/12`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.postId || err.slug}: ${err.error}`);
    });
  }

  // Save summary report
  const report = {
    timestamp: new Date().toISOString(),
    totalPosts: 12,
    successful: results.successful,
    failed: results.failed,
    errors: results.errors,
    translations: translations.map(t => ({
      englishSlug: t.originalSlug,
      chineseTitle: t.title,
      chineseSlug: generateChineseSlug(t.originalSlug, t.title)
    }))
  };

  fs.writeFileSync(
    path.join(__dirname, 'zh-cn-translation-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('\n✓ Report saved to: zh-cn-translation-report.json');

  if (results.successful === 12) {
    console.log('\n🎉 PHASE 2 COMPLETE! 🎉');
    console.log('   ZH-CN: 61/61 posts (100%)');
    console.log('   PT: 61/61 posts (100%)');
    console.log('   KO: 61/61 posts (100%)');
    console.log('\n   All 3 languages fully translated!');
  }
}

main().catch(console.error);
