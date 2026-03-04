import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(fs.readFileSync('posts_to_translate.json', 'utf8'));

const frenchEEAT = '*Publié : 16 février 2026 | Mis à jour : 20 février 2026 | Auteur : Équipe Mystery Maker Party | Prochaine révision : 20 mai 2026*';

// Get the post number from command line
const postIndex = parseInt(process.argv[2]);
if (isNaN(postIndex) || postIndex < 0 || postIndex >= posts.length) {
  console.error('Invalid post index');
  process.exit(1);
}

const post = posts[postIndex];

// Read the translation from stdin
let translation = '';
process.stdin.on('data', chunk => {
  translation += chunk.toString();
});

process.stdin.on('end', async () => {
  const translatedData = JSON.parse(translation);
  
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: translatedData.title,
      slug: post.slug + '-fr',
      content: translatedData.content,
      meta_description: translatedData.meta_description,
      language: 'fr',
      published_at: post.published_at,
      updated_at: post.updated_at,
      author: 'Équipe Mystery Maker Party',
      tags: post.tags,
      category: post.category,
      featured_image: post.featured_image,
      read_time: post.read_time,
      related_posts: post.related_posts
    });
  
  if (error) {
    console.error('Error inserting:', error);
    process.exit(1);
  }
  
  console.log('✅ Inserted:', translatedData.title);
});
