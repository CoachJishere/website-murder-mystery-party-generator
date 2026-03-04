import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const slugsToCheck = [
  'how-to-fix-boring-murder-mystery-parties-ko',
  'how-to-fix-confusing-murder-mystery-clues-ko',
  'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party-ko',
  'how-to-fix-overly-complex-murder-mysteries-ko'
];

async function checkExistingPosts() {
  console.log('Checking for existing Korean posts...\n');

  for (const slug of slugsToCheck) {
    const response = await fetch(
      `${SUPABASE_URL}?slug=eq.${slug}&select=id,slug,title,language`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data = await response.json();

    if (data.length > 0) {
      console.log(`✗ EXISTS: ${slug}`);
      console.log(`  ID: ${data[0].id}, Title: ${data[0].title}`);
    } else {
      console.log(`✓ NOT FOUND: ${slug} (ready to create)`);
    }
  }
}

checkExistingPosts().catch(console.error);
