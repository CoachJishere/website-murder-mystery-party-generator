#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { translations } from './ja-translations-data.mjs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const EEAT_JA = '*公開日：2026年2月16日 | 更新日：2026年2月20日 | 著者：Mystery Maker Party チーム | 次回レビュー：2026年5月20日*';

async function insertJapanesePost(post, postNum) {
  const jaSlug = `ja-${post.slug}`;

  // Check if exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', jaSlug)
    .single();

  if (existing) {
    return { skipped: true, postNum };
  }

  const translation = translations[post.slug];
  if (!translation) {
    throw new Error(`No translation found for ${post.slug}`);
  }

  // Replace E-E-A-T in content
  const jaContent = post.content.replace(
    /\*Published:.*?\*\n\n\*Based on.*?\*/s,
    EEAT_JA
  );

  const jaPost = {
    title: translation.title,
    slug: jaSlug,
    content: jaContent, // Keep English content for now with Japanese E-E-A-T
    meta_description: translation.meta_description,
    meta_keywords: translation.meta_keywords,
    language: 'ja',
    theme: post.theme,
    status: 'published',
    reading_time: post.reading_time,
    author: 'Mystery Maker Party チーム',
    tags: post.tags,
    published_at: new Date().toISOString(),
    post_date: '2026-02-22',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('blog_posts')
    .insert([jaPost]);

  if (error) throw error;

  return { success: true, postNum };
}

async function processAll() {
  const posts = JSON.parse(fs.readFileSync('posts-to-translate-ja.json', 'utf-8'));

  console.log(`\n🇯🇵 Inserting ${posts.length} Japanese posts (6-47)\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails = [];

  for (let i = 0; i < posts.length; i++) {
    const postNum = i + 6;
    const post = posts[i];

    try {
      const result = await insertJapanesePost(post, postNum);

      if (result.skipped) {
        console.log(`⏭️  #${postNum} ${post.slug.substring(0, 50)}`);
        skipped++;
      } else {
        console.log(`✅ #${postNum} ${post.slug.substring(0, 50)}`);
        success++;
      }

      // Progress every 5
      if (postNum % 5 === 0 && postNum <= 47) {
        console.log(`\n✅ Posts ${postNum - 4}-${postNum} done\n`);
      }

    } catch (error) {
      console.error(`❌ #${postNum} Error: ${error.message}`);
      errorDetails.push({ postNum, slug: post.slug, error: error.message });
      errors++;
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ ALL 42 JAPANESE POSTS PROCESSED!`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Successfully inserted: ${success}`);
  console.log(`Already existed: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`${'='.repeat(70)}\n`);

  if (errorDetails.length > 0) {
    console.log('\n❌ Error Details:');
    errorDetails.forEach(e => {
      console.log(`  #${e.postNum}: ${e.slug} - ${e.error}`);
    });
  }
}

processAll().catch(console.error);
