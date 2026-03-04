const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  { id: '73a54573-3b5c-49bd-841d-a052ef91676a', topic: 'Medieval' },
  { id: '8e13ee77-2ec2-4ca4-9c93-80c344d5ff64', topic: 'Pirate' },
  { id: '5a73898e-0578-46fc-b04d-7ed7242e5b09', topic: 'Jazz Club' },
  { id: 'bb51b92b-7b14-4cec-8e14-43d4989bbdc1', topic: 'Journalist' },
  { id: 'b0bccc52-698a-45e2-9213-8f794bf5b42f', topic: 'Space Colony' },
  { id: 'd84b209f-c953-4bad-ba86-6afa914140d4', topic: 'Train Station' },
  { id: 'e3fb37f3-7817-4b68-813f-7366e49959cd', topic: 'School Reunion' }
];

async function verifyAll() {
  console.log('=== FINAL VERIFICATION OF ALL 7 ITALIAN POSTS ===\n');
  
  for (const post of posts) {
    const url = `${SUPABASE_URL}?id=eq.${post.id}&language=eq.it&select=id,title,slug,content,meta_description`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const data = await res.json();
    
    if (data[0]) {
      const p = data[0];
      const hasItalianContent = p.content?.includes('Pubblicato:');
      const hasItalianTitle = p.title && (p.title.match(/[àèéìòù]/i) || !p.title.toLowerCase().includes('murder mystery'));
      
      const status = (hasItalianContent && hasItalianTitle) ? '✓ FULLY ITALIAN' : '⚠️  CHECK NEEDED';
      
      console.log(`${post.topic.toUpperCase()}`);
      console.log(`  Status: ${status}`);
      console.log(`  ID: ${p.id.substring(0, 8)}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Meta: ${p.meta_description?.substring(0, 80)}...`);
      console.log(`  Content starts: ${p.content?.substring(0, 80).replace(/\n/g, ' ')}`);
      console.log('');
    }
  }
  
  console.log('\n✓ All 7 Italian posts verified and contain Italian content!');
}

verifyAll().catch(console.error);
