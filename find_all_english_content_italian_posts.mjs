const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function findEnglishContentPosts() {
  const url = `${SUPABASE_URL}?language=eq.it&select=id,title,slug,content,meta_description`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const allPosts = await res.json();
  
  const englishContentPosts = allPosts.filter(p => {
    const hasEnglishMarkers = 
      p.content?.startsWith('# ') || 
      (p.content?.includes('Published:') && !p.content?.includes('Pubblicato:')) ||
      (p.title && !p.title.match(/[àèéìòù]/i) && p.title.toLowerCase().includes('murder mystery'));
    return hasEnglishMarkers;
  });
  
  console.log('Total Italian posts with English content:', englishContentPosts.length);
  console.log('\n=== Posts needing translation ===\n');
  
  englishContentPosts.forEach((p, i) => {
    console.log(`${i + 1}. ID: ${p.id.substring(0, 8)}`);
    console.log(`   Title: ${p.title}`);
    console.log(`   Slug: ${p.slug}`);
    console.log(`   Meta: ${p.meta_description?.substring(0, 80)}...`);
    console.log('');
  });
  
  // Now check if journalist, space, train exist
  console.log('\n=== Checking for specific topics ===\n');
  
  const topics = ['journalist', 'giornalist', 'space', 'spazio', 'coloni', 'train', 'treno', 'stazion'];
  
  for (const topic of topics) {
    const matches = allPosts.filter(p => 
      p.slug?.includes(topic) || 
      p.title?.toLowerCase().includes(topic)
    );
    if (matches.length > 0) {
      console.log(`${topic.toUpperCase()}:`, matches.length, 'posts');
      matches.forEach(m => console.log('  -', m.title, `(${m.id.substring(0, 8)})`));
    }
  }
}

findEnglishContentPosts().catch(console.error);
