const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function getAdditional() {
  const url = `${SUPABASE_URL}?language=eq.it&select=id,title,slug,content`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const allPosts = await res.json();
  
  const additionalEnglish = [
    { id: '49868ec0', title: 'Unique Circus Murder Mystery Plot Ideas' },
    { id: '79ae2724', title: 'How to Host a Medieval Castle Murder Mystery' },
    { id: '0741a884', title: 'How to Host a Prohibition Era Murder Mystery' },
    { id: '8174f4a9', title: 'How to Host a Steampunk Murder Mystery Party' },
    { id: 'bff6f364', title: 'Guida alla Festa a Tema Giallo in Stile Speakeasy anni \'20' },
    { id: 'bfc12068', title: 'Come Organizzare una Festa a Tema Giallo con Supereroi' }
  ];
  
  console.log('=== Additional Italian Posts with English Content ===\n');
  console.log('These were NOT in your original list of 7.\n');
  
  additionalEnglish.forEach(target => {
    const match = allPosts.find(p => p.id.startsWith(target.id));
    if (match) {
      const hasItalianContent = match.content?.includes('Pubblicato:');
      console.log(`${target.id}:`);
      console.log(`  Title: ${match.title}`);
      console.log(`  Slug: ${match.slug}`);
      console.log(`  Italian content? ${hasItalianContent ? '✓ YES' : '⚠️  NO'}`);
      console.log('');
    }
  });
  
  console.log('\nNote: Your original request only mentioned 7 specific posts.');
  console.log('Should these additional 6 posts also be translated?');
}

getAdditional().catch(console.error);
