const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function getFullIds() {
  const url = `${SUPABASE_URL}?language=eq.it&select=id,title,slug`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const allPosts = await res.json();
  
  const targets = [
    { slug: 'pianificazione-festa-mistero-omicidio-jazz-club', prefix: '5a73898e' },
    { slug: 'temi-mistero-omicidio-giornalista', prefix: 'bb51b92b' },
    { slug: 'trame-uniche-misteri-colonie-spaziali', prefix: 'b0bccc52' },
    { slug: 'trame-uniche-misteri-stazioni-ferroviarie', prefix: 'd84b209f' }
  ];
  
  for (const target of targets) {
    const match = allPosts.find(p => 
      p.slug?.includes(target.slug) || 
      p.id?.startsWith(target.prefix)
    );
    
    if (match) {
      console.log(`${target.prefix} → ${match.id}`);
      console.log(`  Title: ${match.title}`);
      console.log(`  Slug: ${match.slug}\n`);
    } else {
      console.log(`❌ Not found: ${target.slug}\n`);
    }
  }
}

getFullIds().catch(console.error);
