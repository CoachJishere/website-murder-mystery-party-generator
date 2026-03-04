const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const italianTitles = [
  'Unique Medieval Murder Mystery Plot Ideas',
  'Idee Uniche per Trame di Misteri di Pirati',
  'Pianificazione Festa Mistero Omicidio Jazz Club',
  'Temi Mistero Omicidio Giornalista',
  'Trame Uniche di Misteri di Colonie Spaziali',
  'Trame Uniche di Misteri di Stazioni Ferroviarie',
  'Trame Uniche di Misteri per Riunioni Scolastiche'
];

async function searchPosts() {
  // Get all Italian posts
  const url = `${SUPABASE_URL}?language=eq.it&select=id,title,slug,content`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const data = await res.json();
  
  console.log('Total Italian posts:', data.length);
  
  // Search for posts matching our titles
  for (const title of italianTitles) {
    const found = data.find(p => p.title?.includes(title.substring(0, 20)) || title.includes(p.title?.substring(0, 20)));
    if (found) {
      console.log('\nFound:', title);
      console.log('ID:', found.id);
      console.log('Actual Title:', found.title);
      console.log('Slug:', found.slug);
      console.log('Content starts with:', found.content?.substring(0, 100));
    }
  }
  
  // Also search for posts with English content (starts with "# ")
  console.log('\n\n=== Italian posts with English content ===');
  const englishContent = data.filter(p => p.content?.startsWith('# '));
  console.log('Count:', englishContent.length);
  englishContent.slice(0, 10).forEach(p => {
    console.log('\nID:', p.id);
    console.log('Title:', p.title);
    console.log('Slug:', p.slug);
    console.log('Content preview:', p.content.substring(0, 80));
  });
}

searchPosts().catch(console.error);
