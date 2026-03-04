import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const newKoreanSlugs = [
  '1920s-speakeasy-murder-mystery-party-guide-ko',
  '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless-ko',
  'ancient-egypt-murder-mystery-party-guide-ko',
  'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics-ko'
];

async function verifyPost(slug) {
  const response = await fetch(
    `${SUPABASE_URL}?slug=eq.${slug}&select=id,title,slug,language,status,published_at`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await response.json();
  return data.length > 0 ? data[0] : null;
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION: 4 NEW KOREAN BLOG POSTS');
  console.log('='.repeat(70) + '\n');

  let allFound = true;

  for (const slug of newKoreanSlugs) {
    const post = await verifyPost(slug);

    if (post) {
      console.log(`✅ VERIFIED: ${slug}`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Title: ${post.title}`);
      console.log(`   Language: ${post.language}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   Published: ${new Date(post.published_at).toLocaleString()}\n`);
    } else {
      console.log(`❌ NOT FOUND: ${slug}\n`);
      allFound = false;
    }
  }

  console.log('='.repeat(70));
  if (allFound) {
    console.log('✅ SUCCESS: All 4 Korean posts verified in database!');
  } else {
    console.log('❌ ERROR: Some posts are missing');
  }
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
