import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzOTM0NDMsImV4cCI6MjA1MDk2OTQ0M30.wBGbj7I7NJmTOSPSFO0FD6sVuC3t3y4jNGU9rqNKJOQ'
);

const posts = [
  { slug: 'unique-space-colony-murder-mystery-plots-exploring-crime-on-the-final-frontier', lang: 'zh', name: 'Chinese Space Colony' },
  { slug: 'how-to-host-a-jazz-club-murder-mystery-party-crime-in-the-prohibition-era', lang: 'fr', name: 'French Jazz Club' },
  { slug: 'chef-murder-mystery-themes-culinary-crimes-and-kitchen-secrets', lang: 'ko', name: 'Korean Chef' }
];

console.log('🔍 Checking bounce rate posts...\n');

for (const post of posts) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, language, content, meta_description, created_at')
    .eq('slug', post.slug)
    .eq('language', post.lang)
    .single();

  console.log(`\n📄 ${post.name} (${post.lang}/${post.slug}):`);
  
  if (error) {
    console.log(`  ❌ Error: ${error.message}`);
  } else if (data) {
    console.log(`  ✅ Found in database`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Content length: ${data.content ? data.content.length : 0} chars`);
    console.log(`  Meta desc: ${data.meta_description ? 'Yes' : 'No'}`);
    console.log(`  Created: ${data.created_at}`);
    
    if (!data.content || data.content.length < 500) {
      console.log(`  ⚠️  WARNING: Content is very short or missing!`);
    }
  } else {
    console.log(`  ❌ Not found in database`);
  }
}

console.log('\n✅ Check complete');
