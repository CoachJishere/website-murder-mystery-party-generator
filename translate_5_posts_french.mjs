import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(fs.readFileSync('posts_to_translate.json', 'utf8'));

const frenchEEAT = '*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*';

const postNum = parseInt(process.argv[2]) - 1; // Convert to 0-indexed

if (postNum < 0 || postNum >= 5) {
  console.error('Please specify post number 1-5');
  process.exit(1);
}

const englishPost = posts[postNum];

console.log(`\n📝 Post ${postNum + 1}: ${englishPost.title}`);
console.log(`Original slug: ${englishPost.slug}`);
console.log(`Content length: ${englishPost.content.length} characters\n`);
console.log('Ready to receive French translation JSON...\n');

// Read translation from stdin
let translation = '';
process.stdin.on('data', chunk => {
  translation += chunk.toString();
});

process.stdin.on('end', async () => {
  try {
    const frenchData = JSON.parse(translation);

    const insertData = {
      title: frenchData.title,
      slug: englishPost.slug + '-fr',
      content: frenchData.content,
      meta_description: frenchData.meta_description,
      language: 'fr',
      published_at: englishPost.published_at,
      updated_at: englishPost.updated_at,
      author: 'Équipe Mystery Maker Party',
      tags: englishPost.tags,
      category: englishPost.category,
      featured_image: englishPost.featured_image,
      read_time: englishPost.read_time,
      related_posts: englishPost.related_posts
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(insertData);

    if (error) {
      console.error('❌ Database error:', error);
      process.exit(1);
    }

    console.log(`\n✅ ${frenchData.title}`);
    console.log(`   Slug: ${insertData.slug}`);
    console.log(`   Language: fr\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
});
