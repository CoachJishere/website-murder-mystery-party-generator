const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const keywords = [
  { topic: 'jazz', enSlug: 'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime' },
  { topic: 'journalist', enSlug: 'journalist-murder-mystery-themes-investigative-reporters-deadly-stories' },
  { topic: 'space', enSlug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime' },
  { topic: 'train', enSlug: 'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue' }
];

async function findPosts() {
  const url = `${SUPABASE_URL}?language=eq.it&select=id,title,slug,content,meta_description`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const allPosts = await res.json();
  
  for (const kw of keywords) {
    console.log('\n=== Searching for:', kw.topic.toUpperCase(), '===');
    
    const matches = allPosts.filter(p => 
      p.slug?.includes(kw.topic) || 
      p.title?.toLowerCase().includes(kw.topic) ||
      p.slug?.includes(kw.enSlug.split('-')[0])
    );
    
    if (matches.length > 0) {
      matches.forEach(m => {
        const hasEnglishContent = m.content?.startsWith('# ') || (m.content?.includes('Published:') && !m.content?.includes('Pubblicato:'));
        console.log('\nID:', m.id.substring(0, 8));
        console.log('Title:', m.title);
        console.log('Slug:', m.slug);
        console.log('English content?', hasEnglishContent ? 'YES ⚠️' : 'NO ✓');
      });
    } else {
      console.log('❌ No matches found');
      
      // Try fetching the English post to see if Italian exists
      const enUrl = `${SUPABASE_URL}?slug=eq.${kw.enSlug}&language=eq.en&select=title`;
      const enRes = await fetch(enUrl, { headers: { 'apikey': SUPABASE_KEY } });
      const enData = await enRes.json();
      console.log('English post exists:', enData[0]?.title || 'NOT FOUND');
    }
  }
}

findPosts().catch(console.error);
