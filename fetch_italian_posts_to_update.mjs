const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  { prefix: '73a54573', enSlug: 'unique-medieval-murder-mystery-plot-ideas' },
  { prefix: '8e13ee77', enSlug: 'unique-pirate-murder-mystery-plot-ideas' },
  { prefix: '5a73898e', enSlug: 'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime' },
  { prefix: 'bb51b92b', enSlug: 'journalist-murder-mystery-themes-investigative-reporters-deadly-stories' },
  { prefix: 'b0bccc52', enSlug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime' },
  { prefix: 'd84b209f', enSlug: 'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue' },
  { prefix: 'e3fb37f3', enSlug: 'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets' }
];

async function fetchPosts() {
  for (const post of posts) {
    // Fetch Italian post ID
    const itUrl = `${SUPABASE_URL}?id=like.${post.prefix}*&language=eq.it&select=id,title,slug`;
    const itRes = await fetch(itUrl, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const itData = await itRes.json();
    
    // Fetch English source
    const enUrl = `${SUPABASE_URL}?slug=eq.${post.enSlug}&language=eq.en&select=title,content,meta_description`;
    const enRes = await fetch(enUrl, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const enData = await enRes.json();
    
    console.log('\n=== POST:', post.enSlug, '===');
    console.log('IT ID:', itData[0]?.id);
    console.log('IT Title:', itData[0]?.title);
    console.log('IT Slug:', itData[0]?.slug);
    console.log('EN Title:', enData[0]?.title);
    console.log('EN Content length:', enData[0]?.content?.length);
    console.log('EN Meta:', enData[0]?.meta_description);
  }
}

fetchPosts().catch(console.error);
