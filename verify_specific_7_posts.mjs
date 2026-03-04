const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const postsToCheck = [
  { id: '73a54573-3b5c-49bd-841d-a052ef91676a', topic: 'Medieval' },
  { id: '8e13ee77-2ec2-4ca4-9c93-80c344d5ff64', topic: 'Pirate' },
  { id: '5a73898e', topic: 'Jazz' },
  { id: 'bb51b92b', topic: 'Journalist' },
  { id: 'b0bccc52', topic: 'Space Colony' },
  { id: 'd84b209f', topic: 'Train Station' },
  { id: 'e3fb37f3-7817-4b68-813f-7366e49959cd', topic: 'School Reunion' }
];

async function verifyPosts() {
  console.log('=== Verifying 7 Specific Posts ===\n');
  
  for (const post of postsToCheck) {
    const url = `${SUPABASE_URL}?id=eq.${post.id}&language=eq.it&select=id,title,slug,content,meta_description`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const data = await res.json();
    
    if (data[0]) {
      const p = data[0];
      const hasEnglishContent = 
        p.content?.startsWith('# ') || 
        (p.content?.includes('Published:') && !p.content?.includes('Pubblicato:'));
      const hasEnglishTitle = p.title && p.title.toLowerCase().includes('murder mystery') && !p.title.match(/[àèéìòù]/i);
      
      console.log(`${post.topic.toUpperCase()} (${p.id.substring(0, 8)})`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Slug: ${p.slug}`);
      console.log(`  English title? ${hasEnglishTitle ? '⚠️  YES' : '✓ NO'}`);
      console.log(`  English content? ${hasEnglishContent ? '⚠️  YES' : '✓ NO'}`);
      console.log(`  Content preview: ${p.content?.substring(0, 80).replace(/\n/g, ' ')}`);
      console.log('');
    } else {
      console.log(`❌ ${post.topic.toUpperCase()} - ID not found: ${post.id}`);
      console.log('');
    }
  }
}

verifyPosts().catch(console.error);
