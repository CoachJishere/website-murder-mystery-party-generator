import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI3MzEsImV4cCI6MjA1MDU0ODczMX0.td9wLRE-ngrpfocu6f5tocCNdSeJawkS0t7gP11aSng';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchBatch5Posts() {
  console.log('Fetching German Batch 5 (posts 41-47)...');
  
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, meta_description, content, created_at')
    .eq('language', 'en')
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .range(40, 46); // Posts 41-47 (0-indexed, so 40-46)

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  console.log(`✓ Fetched ${posts.length} posts`);
  
  // Save to file
  fs.writeFileSync(
    'german-batch-5-source-posts.json',
    JSON.stringify(posts, null, 2)
  );
  
  console.log('✓ Saved to german-batch-5-source-posts.json');
  
  // Display post info
  posts.forEach((post, idx) => {
    console.log(`\nPost ${idx + 41}:`);
    console.log(`  Slug: ${post.slug}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Content length: ${post.content?.length || 0} chars`);
  });
  
  return posts;
}

fetchBatch5Posts().catch(console.error);
