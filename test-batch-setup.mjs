import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Select 5 diverse test posts (mix of types and lengths)
const testSlugs = [
  '5-haunted-mansion-murder-mystery-themes', // Listicle (~1,600w)
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder', // How-to (~1,750w)
  'jazz-club-murder-mystery-party-planning-swing-into-danger-with-prohibition-era-intrigue', // Venue (~1,320w)
  'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive', // Problem-solving (~1,860w)
  'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery' // Event (~1,520w)
];

console.log('=== FETCHING TEST BATCH (5 POSTS) ===\n');

const testPosts = [];

for (const slug of testSlugs) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, reading_time')
    .eq('slug', slug)
    .eq('language', 'en')
    .eq('status', 'published')
    .single();

  if (error || !data) {
    console.log(`❌ Error fetching ${slug}:`, error?.message || 'Not found');
    continue;
  }

  const wordCount = data.content.split(/\s+/).length;
  console.log(`✅ ${data.title}`);
  console.log(`   Words: ${wordCount}, Reading time: ${data.reading_time} min\n`);
  
  testPosts.push(data);
  writeFileSync(`test-post-${testPosts.length}-en.json`, JSON.stringify(data, null, 2));
}

console.log(`\n✅ Fetched ${testPosts.length} test posts for translation`);
writeFileSync('test-batch-posts.json', JSON.stringify(testPosts, null, 2));
