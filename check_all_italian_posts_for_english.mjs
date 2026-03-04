const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function checkAll() {
  const url = `${SUPABASE_URL}?language=eq.it&select=id,title,slug,content`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const allPosts = await res.json();
  
  console.log('Total Italian posts:', allPosts.length);
  
  const englishContent = allPosts.filter(p => {
    const hasEnglishMarkers = 
      p.content?.startsWith('# ') || 
      (p.content?.includes('Published:') && !p.content?.includes('Pubblicato:'));
    return hasEnglishMarkers;
  });
  
  console.log('\n=== Italian posts still with English content:', englishContent.length, '===\n');
  
  if (englishContent.length > 0) {
    englishContent.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}`);
      console.log(`   ID: ${p.id.substring(0, 8)}`);
      console.log(`   Slug: ${p.slug}`);
      console.log(`   Content preview: ${p.content?.substring(0, 80).replace(/\n/g, ' ')}`);
      console.log('');
    });
  } else {
    console.log('✓ No Italian posts with English content found!');
    console.log('✓ All Italian posts are properly translated.');
  }
}

checkAll().catch(console.error);
