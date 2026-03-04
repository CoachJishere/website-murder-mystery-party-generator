import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  { num: 21, id: '7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02', name: 'Innocent Bystander' },
  { num: 22, id: '2fb18701-39ba-4152-8a82-bcbe0fea4e9b', name: 'Dinner Parties' },
  { num: 23, id: '6c030a19-7884-42fa-aecb-d97ef2b0bdac', name: 'Underwater' },
  { num: 24, id: 'b88413c5-7f5b-4dad-955f-aab433943b19', name: 'Villain' },
  { num: 25, id: 'fb39f18e-8b9f-4332-9502-dc88fa9345e9', name: 'Wild West' }
];

console.log('\n=== EXTRACTING POSTS FOR FRENCH TRANSLATION ===\n');

for (const postInfo of posts) {
  console.log(`[${postInfo.num}/25] ${postInfo.name}`);
  
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postInfo.id)
    .eq('language', 'en')
    .single();
  
  if (error || !post) {
    console.error(`  ❌ Error: ${error?.message}`);
    continue;
  }
  
  const english = `# POST ${postInfo.num}: ${postInfo.name}

**ID:** ${post.id}
**Slug:** ${post.slug}
**Content Length:** ${post.content.length} chars

## TITLE
${post.title}

## META DESCRIPTION
${post.meta_description}

## CONTENT
${post.content}

---
END OF POST ${postInfo.num}
---
`;
  
  const filename = `./fr-post-${postInfo.num}-english.txt`;
  fs.writeFileSync(filename, english);
  console.log(`  ✓ Saved to: ${filename}`);
}

console.log('\n✅ All 5 English posts extracted for translation\n');
