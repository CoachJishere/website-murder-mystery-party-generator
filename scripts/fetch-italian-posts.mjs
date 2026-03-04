import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  console.log('Fetching optimized English posts...\n');

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
  console.log(`Total optimized posts: ${posts.length}`);

  const postsToTranslate = posts.slice(9, 19);
  console.log(`\nPosts 10-19 (${postsToTranslate.length} posts):\n`);

  postsToTranslate.forEach((p, i) => {
    console.log(`${i+1}. ${p.slug}`);

    // Save individual JSON files
    const filename = `temp-files/to-translate-it-${i+10}.json`;
    writeFileSync(filename, JSON.stringify({
      slug: p.slug,
      title: p.title,
      content: p.content,
      meta_description: p.meta_description,
      category: p.category,
      published: p.published,
      featured_image: p.featured_image,
      author: p.author,
      tags: p.tags,
      schema_markup: p.schema_markup,
      reading_time: p.reading_time,
      created_at: p.created_at
    }, null, 2));
  });

  console.log('\n✅ Saved 10 individual JSON files in temp-files/');
  console.log('Files: to-translate-it-10.json through to-translate-it-19.json');
}

main();
