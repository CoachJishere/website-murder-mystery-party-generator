import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  '5-haunted-mansion-murder-mystery-themes',
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
  '5-renaissance-murder-mystery-party-themes'
];

for (const slug of slugs) {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('slug, title, content, meta_description')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();
  
  console.log(`\n=== ${post.title} ===`);
  console.log(`Slug: ${post.slug}`);
  console.log(`Words: ~${post.content.split(' ').length}`);
}
