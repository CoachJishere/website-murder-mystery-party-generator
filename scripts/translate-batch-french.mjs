import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  console.log('🇫🇷 Fetching English posts for French translation...\n');

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20')
    .ilike('content', '%*Published: February 16, 2026%')
    .order('slug', { ascending: true });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`📊 Found ${posts.length} optimized English posts`);

  const remainingPosts = posts.slice(10);
  console.log(`📝 Processing ${remainingPosts.length} remaining posts (indices 10-46)\n`);

  const outputDir = path.join(__dirname, '..', 'temp-files', 'french-translations');
  await fs.mkdir(outputDir, { recursive: true });

  const batchData = {
    posts: remainingPosts.map((post, index) => ({
      index: index + 10,
      postNumber: index + 11,
      slug: post.slug,
      title: post.title,
      meta_description: post.meta_description,
      content: post.content,
      category: post.category,
      published_at: post.published_at,
      featured_image: post.featured_image,
    })),
    instructions: {
      frenchEEAT: '*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*',
      language: 'fr',
      updated_at: '2026-02-20T00:00:00Z',
      author: 'Équipe Mystery Maker Party',
    }
  };

  const outputFile = path.join(outputDir, 'posts-to-translate.json');
  await fs.writeFile(outputFile, JSON.stringify(batchData, null, 2));

  console.log(`✅ Saved ${remainingPosts.length} posts to: ${outputFile}`);
  console.log(`\n📋 Posts to translate:`);

  remainingPosts.forEach((post, index) => {
    console.log(`   [${index + 11}] ${post.title}`);
  });
}

main();
