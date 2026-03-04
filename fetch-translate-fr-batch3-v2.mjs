import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Supabase connection
const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const supabase = createClient(supabaseUrl, supabaseKey);

// Read missing posts
const missingPosts = JSON.parse(
  fs.readFileSync('./fr-missing-posts.json', 'utf-8')
);

// Get posts 11-15 (indices 10-14)
const batch3Posts = missingPosts.missing_posts.slice(10, 15);

console.log('Batch 3 Posts to fetch:');
batch3Posts.forEach((post, idx) => {
  console.log(`${idx + 11}. ${post.title}`);
});

async function fetchPost(postId) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error(`Error fetching post ${postId}:`, error);
    return null;
  }

  return data;
}

async function main() {
  console.log(`\nFetching English posts for French Batch 3 (posts 11-15)...\n`);

  for (let i = 0; i < batch3Posts.length; i++) {
    const postInfo = batch3Posts[i];
    const postNumber = i + 11;

    try {
      // Fetch English post
      console.log(`\nFetching post ${postNumber}: ${postInfo.title}`);
      const englishPost = await fetchPost(postInfo.id);

      if (!englishPost) {
        console.error(`❌ Failed to fetch post ${postNumber}`);
        continue;
      }

      console.log(`✓ Fetched: ${englishPost.title}`);

      // Save English content to a JSON file for manual translation
      const dataFilename = `./fr-batch3-post-${postNumber}-data.json`;
      const englishData = {
        original_id: postInfo.id,
        original_title: englishPost.title,
        original_slug: englishPost.slug,
        meta_description: englishPost.meta_description,
        content: englishPost.content,
        batch: 3,
        post_number: postNumber
      };

      fs.writeFileSync(dataFilename, JSON.stringify(englishData, null, 2), 'utf-8');
      console.log(`✓ Saved data: ${dataFilename}`);

    } catch (error) {
      console.error(`❌ Error processing post ${postNumber}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✓ DATA FILES CREATED');
  console.log('='.repeat(80));
  console.log('\nJSON files created with English content:');
  console.log('- fr-batch3-post-11-data.json (Haunted Hotel)');
  console.log('- fr-batch3-post-12-data.json (Fix Boring Parties)');
  console.log('- fr-batch3-post-13-data.json (Fix Confusing Clues)');
  console.log('- fr-batch3-post-14-data.json (Fix Won\'t Participate)');
  console.log('- fr-batch3-post-15-data.json (Fix Overly Complex)');
  console.log('\nNEXT: Use Claude Code to translate each file individually.');
}

main().catch(console.error);
