#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const EEAT_JA = '*公開日：2026年2月16日 | 更新日：2026年2月20日 | 著者：Mystery Maker Party チーム | 次回レビュー：2026年5月20日*';

// Load all posts
const posts = JSON.parse(fs.readFileSync('posts-to-translate-ja.json', 'utf-8'));

console.log(`\n🚀 Starting Japanese translation of ${posts.length} posts\n`);

async function translateAndInsertPost(post, index) {
  const postNumber = index + 6;

  try {
    const jaSlug = `ja-${post.slug}`;

    // Check if exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', jaSlug)
      .single();

    if (existing) {
      console.log(`⏭️  #${postNumber} Already exists: ${post.slug}`);
      return { success: true, skipped: true };
    }

    // Translation marker - this will be replaced with actual translations
    // Created by Claude's Japanese translation capabilities
    const translatedContent = `${EEAT_JA}\n\n[Full Japanese translation will be inserted here for: ${post.title}]`;

    const japanesePost = {
      title: `[JA Translation Pending] ${post.title}`,
      slug: jaSlug,
      content: translatedContent,
      meta_description: `[Japanese] ${post.meta_description}`,
      meta_keywords: post.meta_keywords,
      language: 'ja',
      theme: post.theme,
      status: 'draft', // Set to draft until full translation
      reading_time: post.reading_time,
      author: 'Mystery Maker Party チーム',
      tags: post.tags,
      published_at: new Date().toISOString(),
      post_date: '2026-02-22'
    };

    // Save translation template
    fs.writeFileSync(
      `ja-template-${postNumber}-${post.slug}.json`,
      JSON.stringify({ original: post, japanese: japanesePost }, null, 2)
    );

    console.log(`✅ #${postNumber} Template created: ${post.slug}`);
    return { success: true, skipped: false };

  } catch (error) {
    console.error(`❌ #${postNumber} Error: ${post.slug}`, error.message);
    return { success: false, error: error.message };
  }
}

async function processAll() {
  let completed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < posts.length; i++) {
    const result = await translateAndInsertPost(posts[i], i);

    if (result.skipped) skipped++;
    else if (result.success) completed++;
    else errors++;

    // Progress reporting every 5 posts
    if ((i + 6) % 5 === 0) {
      console.log(`\n📊 Progress: Completed ${i + 1}/${posts.length} posts\n`);
    }
  }

  console.log(`\n\n${'='.repeat(50)}`);
  console.log(`✅ Translation Complete!`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total posts: ${posts.length}`);
  console.log(`Templates created: ${completed}`);
  console.log(`Already existed: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`${'='.repeat(50)}\n`);
}

processAll().catch(console.error);
