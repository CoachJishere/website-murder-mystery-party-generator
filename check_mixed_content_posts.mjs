const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const ids = [
  'bff6f364', // Speakeasy
  'bfc12068'  // Superhero
];

async function checkMixed() {
  for (const id of ids) {
    const url = `${SUPABASE_URL}?id=like.${id}%&language=eq.it&select=id,title,slug,content`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const data = await res.json();
    
    if (data[0]) {
      const p = data[0];
      console.log('=== POST:', p.id.substring(0, 8), '===');
      console.log('Title:', p.title);
      console.log('Has "Pubblicato:"?', p.content?.includes('Pubblicato:') ? 'YES' : 'NO');
      console.log('Has "Published:"?', p.content?.includes('Published:') ? 'YES' : 'NO');
      console.log('Starts with "#"?', p.content?.startsWith('#') ? 'YES' : 'NO');
      console.log('Content first 200 chars:');
      console.log(p.content?.substring(0, 200));
      console.log('\n');
    }
  }
}

checkMixed().catch(console.error);
