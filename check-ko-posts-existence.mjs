// Check if Korean posts already exist
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const slugs = [
  'murder-mystery-party-for-corporate-events-ko',
  'murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue-ko',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury-ko',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders-ko'
];

async function checkExists() {
  for (const slug of slugs) {
    const response = await fetch(`${SUPABASE_URL}?slug=eq.${slug}&select=id,slug,title`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await response.json();
    if (data.length > 0) {
      console.log(`✓ EXISTS: ${slug}`);
    } else {
      console.log(`✗ MISSING: ${slug}`);
    }
  }
}

checkExists();
