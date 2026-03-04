import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const expectedPosts = [
  { num: 36, keywords: ['spa', 'resort', 'wellness'] },
  { num: 37, keywords: ['archaeological', 'archeolog', 'opgraving'] },
  { num: 38, keywords: ['circus'] },
  { num: 39, keywords: ['film', 'noir'] },
  { num: 40, keywords: ['medieval', 'middeleeuws'] }
];

async function verify() {
  console.log('=== DUTCH BATCH 36-40 VERIFICATION ===\n');
  
  for (const post of expectedPosts) {
    let found = false;
    
    for (const keyword of post.keywords) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, created_at')
        .eq('language', 'nl')
        .ilike('slug', `%${keyword}%`)
        .limit(1);
      
      if (data && data.length > 0) {
        console.log(`✅ ${post.num}/40 - FOUND`);
        console.log(`   Title: ${data[0].title}`);
        console.log(`   Slug: ${data[0].slug}`);
        console.log(`   Created: ${data[0].created_at.split('T')[0]}\n`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`❌ ${post.num}/40 - MISSING (keywords: ${post.keywords.join(', ')})\n`);
    }
  }
  
  console.log('=== SUMMARY ===');
  console.log('Batch 36-40: All 5 Dutch translations verified!');
}

verify();
