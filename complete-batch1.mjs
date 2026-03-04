import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('\n🎯 BATCH 1 COMPLETION: Trimming Posts 4 & 5\n');
console.log('='.repeat(80));

// Post IDs for remaining batch 1 posts
const posts = [
  {
    id: 'a0ab637f-a1a5-48af-a6af-add9e4753e35',
    title: '5 Mountain Lodge Murder Mystery Themes',
    target: 1600,
    type: 'listicle'
  },
  {
    id: '0501b577-d1b8-457b-8301-b02857d69382',
    title: 'Unique School Reunion Murder Mystery Plots',
    target: 2300,
    type: 'how-to guide'
  }
];

for (const post of posts) {
  console.log(`\n📝 ${post.title}`);
  console.log(`   Type: ${post.type} | Target: ${post.target} words`);

  // Fetch current content
  const { data: current } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('id', post.id)
    .single();

  const currentWords = current.content.split(/\s+/).length;
  console.log(`   Current: ${currentWords} words`);

  // Note: Actual trimming would require Claude API or manual process
  // For now, just log status
  console.log(`   ⏳ Requires manual trimming (${currentWords - post.target} words to trim)`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ Identified remaining posts for Batch 1 completion\n');
