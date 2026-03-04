// Check if the deleted posts are truly gone or soft-deleted
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY };

// A few IDs that were deleted — check if they still exist in any form
const testIds = [
  '97877e06-42fd-4efa-bb40-c6e1e5d7b307', // FR speakeasy
  '66470aa9-fbc7-4302-824d-e8c4243ad1cb', // IT haunted mansion
  '9bffdfe7-8aa1-40a9-846c-35efa3ce0eea', // PT ancient egypt
  'b89a9d87-0541-45c8-9eb7-f2462bf30845', // PT zombie (WRONG DELETE)
];

async function run() {
  for (const id of testIds) {
    // Try without status filter to see if post exists with any status
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,status&id=eq.${id}`, { headers });
    const data = await res.json();
    console.log(`id=${id}: ${data.length > 0 ? JSON.stringify(data[0]) : 'GONE (hard deleted)'}`);
  }

  // Also check current counts for all languages
  for (const lang of ['en', 'fr', 'it', 'pt', 'ja', 'de', 'es', 'ko', 'zh-cn', 'sv', 'da', 'nl', 'fi']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id&language=eq.${lang}&status=eq.published`, { headers });
    const data = await res.json();
    console.log(`${lang}: ${data.length} published posts`);
  }
}
run();
