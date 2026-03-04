import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const POST_IDS = [
  '260f2fd7-0106-475a-8f02-8aa7a1037f47',
  '2aaee48f-eb45-4183-8340-f92616812fe2',
  '2acf78da-c601-4506-830b-ab46c180c414',
  '2bc621a3-61d1-4ba6-8a7b-66e031e5d28c',
  '2d19c069-2354-45b5-be1f-ffe3d5338e7b',
];

async function main() {
  const posts = [];
  
  for (const id of POST_IDS) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, content, meta_description')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching ${id}: ${error.message}`);
      continue;
    }
    
    posts.push(data);
    console.log(`Fetched: ${data.title}`);
  }
  
  writeFileSync('english-posts-6-10.json', JSON.stringify(posts, null, 2));
  console.log(`\nSaved ${posts.length} posts to english-posts-6-10.json`);
}

main().catch(console.error);
