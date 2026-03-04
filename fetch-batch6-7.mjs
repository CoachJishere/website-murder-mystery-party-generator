import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const batch6Patterns = ['casino', 'train-station', 'unsatisfying-endings', 'victorian', 'game-night'];
const batch7Patterns = ['dinner-parties', 'circus-murder-mystery-plot', 'medieval-murder-mystery-plot', 'pirate-murder-mystery-plot', 'ancient-egypt'];

console.log('=== BATCH 6 & 7: Final 10 Posts ===\n');

for (const pattern of [...batch6Patterns, ...batch7Patterns]) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, language, status, reading_time, content')
    .ilike('slug', `%${pattern}%`)
    .eq('language', 'en')
    .eq('status', 'published');

  if (error || !data || data.length === 0) {
    console.log(`❌ No match for ${pattern}`);
  } else if (data.length > 1) {
    console.log(`⚠️  Multiple matches for ${pattern}:`);
    data.forEach(p => console.log(`   - ${p.slug}`));
  } else {
    const post = data[0];
    const wordCount = post.content.split(/\s+/).length;
    const batchNum = batch6Patterns.includes(pattern) ? 6 : 7;
    console.log(`✅ ${post.title}`);
    console.log(`   Current: ${wordCount} words (${post.reading_time} min)`);
    console.log(`   Batch: ${batchNum}\n`);
    
    writeFileSync(`batch${batchNum}-${pattern}-full.txt`, post.content);
    writeFileSync(`batch${batchNum}-${pattern}-id.txt`, post.id);
  }
}
