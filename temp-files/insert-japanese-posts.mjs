import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load the translated posts
const translatedPosts = JSON.parse(
  readFileSync('./temp-files/japanese-translations-batch1.json', 'utf-8')
);

console.log('='.repeat(60));
console.log('INSERTING JAPANESE TRANSLATIONS');
console.log('='.repeat(60));

let success = 0;
let errors = 0;

for (let i = 0; i < translatedPosts.length; i++) {
  const post = translatedPosts[i];
  console.log(`\n[${i + 1}/5] ${post.slug}`);
  console.log(`Title: ${post.title}`);

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([post])
      .select();

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      errors++;
    } else {
      console.log(`✅ Inserted (ID: ${data[0].id})`);
      success++;
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    errors++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Success: ${success}/5`);
console.log(`❌ Errors: ${errors}/5`);

if (success === 5) {
  console.log('\n🎉 ALL 5 JAPANESE POSTS INSERTED SUCCESSFULLY!');
}
