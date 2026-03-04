const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const ids = [
  '73a54573-3b5c-49bd-841d-a052ef91676a',
  '8e13ee77-2ec2-4ca4-9c93-80c344d5ff64',
  '5a73898e', // need to find full ID
  'bb51b92b',
  'b0bccc52',
  'd84b209f',
  'e3fb37f3-7817-4b68-813f-7366e49959cd'
];

async function checkPosts() {
  for (const id of ids) {
    const url = `${SUPABASE_URL}?id=eq.${id}&language=eq.it&select=id,title,slug,content,meta_description`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY }
    });
    const data = await res.json();
    
    if (data[0]) {
      const post = data[0];
      const hasEnglishContent = post.content?.startsWith('# ') || (post.content?.includes('Published:') && !post.content?.includes('Pubblicato:'));
      const hasEnglishTitle = post.title && !post.title.match(/[àèéìòù]/i) && post.title.includes('Murder Mystery');
      
      console.log('\n=== ID:', post.id.substring(0, 8), '===');
      console.log('Title:', post.title);
      console.log('Slug:', post.slug);
      console.log('English title?', hasEnglishTitle ? 'YES' : 'NO');
      console.log('English content?', hasEnglishContent ? 'YES' : 'NO');
      console.log('Meta:', post.meta_description);
      console.log('Content preview:', post.content?.substring(0, 100).replace(/\n/g, ' '));
    } else {
      console.log('\n❌ No post found for ID:', id);
    }
  }
}

checkPosts().catch(console.error);
