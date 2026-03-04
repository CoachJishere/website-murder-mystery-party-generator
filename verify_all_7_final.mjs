const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  { id: '73a54573-3b5c-49bd-841d-a052ef91676a', topic: 'Medieval', enSlug: 'unique-medieval-murder-mystery-plot-ideas' },
  { id: '8e13ee77-2ec2-4ca4-9c93-80c344d5ff64', topic: 'Pirate', enSlug: 'unique-pirate-murder-mystery-plot-ideas' },
  { id: '5a73898e-0578-46fc-b04d-7ed7242e5b09', topic: 'Jazz', enSlug: 'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime' },
  { id: 'bb51b92b-7b14-4cec-8e14-43d4989bbdc1', topic: 'Journalist', enSlug: 'journalist-murder-mystery-themes-investigative-reporters-deadly-stories' },
  { id: 'b0bccc52-698a-45e2-9213-8f794bf5b42f', topic: 'Space', enSlug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime' },
  { id: 'd84b209f-c953-4bad-ba86-6afa914140d4', topic: 'Train', enSlug: 'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue' },
  { id: 'e3fb37f3-7817-4b68-813f-7366e49959cd', topic: 'School', enSlug: 'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets' }
];

async function verifyAll() {
  console.log('=== Final Verification of All 7 Posts ===\n');
  
  let needsTranslation = [];
  
  for (const post of posts) {
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
      
      const status = (hasEnglishTitle || hasEnglishContent) ? '⚠️  NEEDS TRANSLATION' : '✓ Already Italian';
      
      console.log(`${post.topic.toUpperCase()}`);
      console.log(`  ID: ${p.id.substring(0, 8)}`);
      console.log(`  Status: ${status}`);
      console.log(`  IT Title: ${p.title}`);
      console.log(`  EN Slug: ${post.enSlug}`);
      console.log('');
      
      if (hasEnglishTitle || hasEnglishContent) {
        needsTranslation.push({
          id: p.id,
          topic: post.topic,
          enSlug: post.enSlug,
          currentTitle: p.title
        });
      }
    } else {
      console.log(`❌ ${post.topic.toUpperCase()} - Not found\n`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Posts needing translation: ${needsTranslation.length}`);
  needsTranslation.forEach(p => {
    console.log(`  - ${p.topic}: ${p.id.substring(0, 8)}`);
  });
}

verifyAll().catch(console.error);
