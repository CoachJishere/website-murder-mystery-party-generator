import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  { id: '27922634-1045-4b0e-9384-69806af8aed0', file: 'post3' },
  { id: 'e1e641e1-6202-4936-b856-ba63adaaf26a', file: 'post4' },
  { id: 'a0ab637f-a1a5-48af-a6af-add9e4753e35', file: 'post5' }
];

for (const post of posts) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, content')
    .eq('id', post.id)
    .single();
  
  if (error) {
    console.error(`Error fetching ${post.file}:`, error);
    continue;
  }
  
  fs.writeFileSync(`${post.file}-english.txt`, data.content);
  console.log(`${post.file}: ${data.title} (${data.content.length} chars)`);
}
