import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const POSTS_TO_FETCH = [
  '1920s-speakeasy-murder-mystery-party-guide',
  '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless',
  'ancient-egypt-murder-mystery-party-guide',
  'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics'
];

async function fetchEnglishPost(slug) {
  console.log(`Fetching: ${slug}...`);

  const response = await fetch(
    `${SUPABASE_URL}?slug=eq.${slug}&language=eq.en&status=eq.published&select=*`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await response.json();
  if (data.length === 0) {
    throw new Error(`English post not found: ${slug}`);
  }

  return data[0];
}

async function main() {
  console.log('Fetching English posts for translation...\n');

  for (const slug of POSTS_TO_FETCH) {
    const post = await fetchEnglishPost(slug);

    const filename = `ko-source-${slug}.json`;
    writeFileSync(filename, JSON.stringify(post, null, 2));

    console.log(`✓ Saved to ${filename}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Length: ${post.content.length} chars\n`);
  }

  console.log('All English posts saved! Ready for translation.');
}

main().catch(console.error);
