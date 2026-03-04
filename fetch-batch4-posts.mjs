import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const batch4Posts = [
  { slug: '5-haunted-mansion-murder-mystery-themes', target: 1600, name: 'haunted-mansion' },
  { slug: 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder', target: 2300, name: 'bookstore' },
  { slug: '5-renaissance-murder-mystery-party-themes', target: 1600, name: 'renaissance' },
  { slug: 'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery', target: 2300, name: 'date-night' },
  { slug: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation', target: 2300, name: 'office-teams' }
];

console.log('=== BATCH 4: Event/Character Guides ===\n');

for (const post of batch4Posts) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, reading_time')
    .eq('slug', post.slug)
    .eq('language', 'en')
    .eq('status', 'published')
    .single();

  if (error || !data) {
    console.log(`❌ Error fetching ${post.slug}:`, error?.message || 'Not found');
    continue;
  }

  const wordCount = data.content.split(/\s+/).length;
  const overage = wordCount - post.target;
  
  console.log(`📄 ${data.title}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Current: ${wordCount} words (${data.reading_time} min)`);
  console.log(`   Target: ${post.target} words`);
  console.log(`   Overage: ${overage} words\n`);
  
  // Save full content for trimming
  writeFileSync(`batch4-${post.name}-full.txt`, data.content);
  writeFileSync(`batch4-${post.name}-id.txt`, data.id);
}

console.log('✅ Files created for trimming.');
