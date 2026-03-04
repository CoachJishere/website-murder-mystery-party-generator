import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Batch 5 post IDs (posts 21-25)
const batch5Ids = [
  '7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02', // 21. Innocent Bystander
  '2fb18701-39ba-4152-8a82-bcbe0fea4e9b', // 22. Dinner Parties
  '6c030a19-7884-42fa-aecb-d97ef2b0bdac', // 23. Underwater
  'b88413c5-7f5b-4dad-955f-aab433943b19', // 24. Villain
  'fb39f18e-8b9f-4332-9502-dc88fa9345e9'  // 25. Wild West
];

console.log(`\n=== FETCHING FINAL FRENCH BATCH (Posts 21-25) ===\n`);

const results = [];

for (let i = 0; i < batch5Ids.length; i++) {
  const postId = batch5Ids[i];
  console.log(`[${i + 21}/25] Fetching post: ${postId}`);
  
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .eq('language', 'en')
    .single();
  
  if (error) {
    console.error(`  ❌ Error: ${error.message}`);
    continue;
  }
  
  if (data) {
    console.log(`  ✓ ${data.title}`);
    console.log(`    Slug: ${data.slug}`);
    console.log(`    Content: ${data.content?.length || 0} chars\n`);
    results.push(data);
  }
}

// Save results
const fs = await import('fs');
fs.writeFileSync(
  './fr-batch5-english-posts.json',
  JSON.stringify(results, null, 2)
);

console.log(`✅ Successfully fetched ${results.length}/5 posts`);
console.log(`📄 Saved to: fr-batch5-english-posts.json\n`);
