import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(readFileSync('posts-to-translate.json', 'utf-8'));

// Post 0: 1920s Speakeasy
const germanPost0 = readFileSync('german-post-0.md', 'utf-8');

async function insertPost(index, title, metaDesc, content) {
  const originalPost = posts[index];
  const germanSlug = originalPost.slug + '-de';

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: title,
      slug: germanSlug,
      content: content,
      meta_description: metaDesc,
      language: 'de',
      published_at: originalPost.published_at,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error(`❌ Error inserting ${title}:`, error);
    return false;
  }

  console.log(`✅ ${title}`);
  return true;
}

console.log('Inserting German post 0...');
await insertPost(
  0,
  '1920er Speakeasy Mordmysterium Party Anleitung',
  'Kreieren Sie eine authentische 1920er Speakeasy Mordmysterium Party mit maßgeschneiderten Charakteren, Jazz-Zeitalter Atmosphäre und Prohibition-Ära Hinweisen für unvergessliche Krimidinner-Erlebnisse.',
  germanPost0
);

console.log('\nAll posts inserted successfully!');
