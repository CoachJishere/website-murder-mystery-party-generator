import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  // Get English posts with Published marker
  const { data: enPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, content, updated_at')
    .eq('language', 'en')
    .order('updated_at', { ascending: false });

  const optimized = enPosts.filter(p => p.content && p.content.includes('*Published:'));

  // Get first 47 by most recent update (likely the ones being translated)
  const target47 = optimized.slice(0, 47);

  console.log(`Found ${optimized.length} optimized English posts`);
  console.log(`Taking first 47 by most recent update:\n`);

  target47.forEach((p, i) => {
    const date = new Date(p.updated_at).toLocaleDateString();
    console.log(`${i + 1}. ${p.slug} (updated: ${date})`);
  });

  // Save to file for batch processing
  const fs = await import('fs');
  fs.writeFileSync('/tmp/target_47_slugs.json', JSON.stringify(target47.map(p => p.slug), null, 2));
  console.log(`\n✅ Saved target 47 slugs to /tmp/target_47_slugs.json`);
}

main();
