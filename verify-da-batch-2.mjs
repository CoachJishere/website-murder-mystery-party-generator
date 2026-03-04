import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const expectedSlugs = [
  'saadan-arrangerer-du-en-rumstation-mordmysterium-fest',
  'uskyldig-tilskuer-mordmysterium-temaer-forkert-sted-forkert-tid',
  'mordmysterium-fest-til-virksomhedsarrangementer',
  'unikke-cirkus-mordmysterium-plotideer',
  'saadan-retter-du-komplekse-mordmysterier',
  '5-maskerade-bal-mordmysterium-temaer',
  'saadan-arrangerer-du-zombieapokalypse-mordmysterium',
  'retsmediciner-mordmysterium-temaer',
  'mordmysterium-fest-til-fodselsdagsfejringer',
  'unikke-undervands-mordmysterium-plots'
];

async function verifyPosts() {
  console.log('Verifying Danish Batch 2 posts...\n');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.da&select=id,title,slug,reading_time,status&order=created_at.desc&limit=10`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );

  const posts = await response.json();
  
  console.log(`✅ Found ${posts.length} Danish posts\n`);

  expectedSlugs.forEach((slug, index) => {
    const post = posts.find(p => p.slug === slug);
    if (post) {
      console.log(`✅ Post ${index + 1}: ${post.title}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Reading time: ${post.reading_time || 'null'}`);
      console.log(`   Status: ${post.status}\n`);
    } else {
      console.log(`❌ Post ${index + 1} NOT FOUND: ${slug}\n`);
    }
  });

  const foundSlugs = posts.map(p => p.slug);
  const allFound = expectedSlugs.every(slug => foundSlugs.includes(slug));

  if (allFound) {
    console.log('\n✅ SUCCESS: All 10 Danish Batch 2 posts verified!');
  } else {
    console.log('\n⚠️  WARNING: Some posts may be missing');
  }
}

verifyPosts().catch(console.error);
