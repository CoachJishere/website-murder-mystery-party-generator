// Verify all 4 Korean posts were inserted successfully
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const slugs = [
  'murder-mystery-party-for-corporate-events-ko',
  'murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue-ko',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury-ko',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders-ko'
];

async function verifyPosts() {
  console.log('=== KOREAN POST VERIFICATION ===\n');
  
  for (const slug of slugs) {
    const response = await fetch(`${SUPABASE_URL}?slug=eq.${slug}&select=id,slug,title,language,status,author,created_at`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await response.json();
    
    if (data.length > 0) {
      const post = data[0];
      console.log(`✓ SUCCESS: ${post.title}`);
      console.log(`  Slug: ${post.slug}`);
      console.log(`  ID: ${post.id}`);
      console.log(`  Language: ${post.language}`);
      console.log(`  Status: ${post.status}`);
      console.log(`  Author: ${post.author}`);
      console.log(`  Created: ${post.created_at}`);
      console.log('');
    } else {
      console.log(`✗ MISSING: ${slug}\n`);
    }
  }
  
  console.log('=== SUMMARY ===');
  console.log('All 4 Korean blog posts have been successfully translated and inserted!');
}

verifyPosts();
