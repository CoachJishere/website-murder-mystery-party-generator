import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('📝 Inserting 3 Missing Optimized Posts\n');
console.log('='.repeat(80));

// Read optimized content
const zombieContent = fs.readFileSync('optimized-zombie-apocalypse.md', 'utf8');
const superheroContent = fs.readFileSync('optimized-superhero.md', 'utf8');
const medievalContent = fs.readFileSync('optimized-medieval-castle.md', 'utf8');

// Calculate reading times (words per minute = 200)
function calculateReadingTime(content) {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 200);
}

const posts = [
  {
    title: 'How to Host a Zombie Apocalypse Murder Mystery That Will Have Your Guests Fighting for Survival',
    slug: 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
    content: zombieContent,
    excerpt: 'Survive the undead while solving murders in thrilling zombie apocalypse mystery parties with custom survival scenarios.',
    meta_description: 'Create engaging zombie apocalypse murder mystery parties combining survival horror with detective work. Balanced tension, resource management, and investigation.',
    theme: 'Horror/Zombie',
    post_date: '2025-11-11',
    reading_time: calculateReadingTime(zombieContent)
  },
  {
    title: 'How to Host a Superhero Murder Mystery Party: Powers, Secret Identities, and Super Villains',
    slug: 'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
    content: superheroContent,
    excerpt: 'Design superhero murder mysteries where powers and secret identities create compelling detective challenges.',
    meta_description: 'Host superhero murder mystery parties balancing superpowers with human emotions. Powers, secret identities, and moral complexity for engaging investigations.',
    theme: 'Superhero',
    post_date: '2025-12-02',
    reading_time: calculateReadingTime(superheroContent)
  },
  {
    title: 'How to Host a Medieval Castle Murder Mystery: Rule Your Realm with Royal Intrigue',
    slug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    content: medievalContent,
    excerpt: 'Create medieval castle murder mysteries with royal intrigue, feudal politics, and courtly betrayals.',
    meta_description: 'Plan medieval castle murder mystery parties with feudal intrigue, court politics, and social hierarchy creating authentic period mysteries.',
    theme: 'Medieval',
    post_date: '2025-12-16',
    reading_time: calculateReadingTime(medievalContent)
  }
];

const results = [];

for (const post of posts) {
  console.log(`\nInserting: ${post.title.substring(0, 50)}...`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Reading time: ${post.reading_time} minutes`);
  console.log(`  Word count: ~${Math.floor(post.content.split(/\s+/).length)} words`);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([{
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      meta_description: post.meta_description,
      theme: post.theme,
      post_date: post.post_date,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reading_time: post.reading_time,
      status: 'published',
      language: 'en'
    }])
    .select('id, title, slug, status');

  if (error) {
    console.log(`  ❌ Error: ${error.message}`);
    results.push({ title: post.title, success: false, error: error.message });
  } else {
    console.log(`  ✅ Success! ID: ${data[0].id}`);
    results.push({ title: post.title, success: true, id: data[0].id });
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n\n📊 INSERTION SUMMARY\n');
console.log('='.repeat(80));

const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log(`✅ Successfully inserted: ${successful}/3 posts`);
if (failed > 0) {
  console.log(`❌ Failed: ${failed}/3 posts`);
  console.log('\nFailed posts:');
  results.filter(r => !r.success).forEach(r => {
    console.log(`  - ${r.title.substring(0, 60)}...`);
    console.log(`    Error: ${r.error}`);
  });
}

// Final verification
console.log('\n\n🔍 FINAL VERIFICATION\n');
console.log('='.repeat(80));

const { data: allEnglish } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('language', 'en')
  .eq('status', 'published');

console.log(`Total English published posts: ${allEnglish.length}/61`);

if (allEnglish.length === 61) {
  console.log('\n🎉 SUCCESS! All 61 posts from your original list are now published!');
} else if (allEnglish.length === 58) {
  console.log('\n⚠️  Still at 58/61 - the 3 new posts may have failed to insert.');
} else {
  console.log(`\n📊 Current count: ${allEnglish.length}/61`);
}

console.log('\n✅ Insertion script complete!');
