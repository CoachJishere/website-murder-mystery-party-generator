const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function showDetails() {
  const url = `${SUPABASE_URL}?id=eq.73a54573-3b5c-49bd-841d-a052ef91676a&language=eq.it&select=id,title,slug,content,meta_description`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const data = await res.json();
  
  if (data[0]) {
    const post = data[0];
    
    console.log('=== MEDIEVAL POST - UPDATED VERSION ===\n');
    console.log('ID:', post.id);
    console.log('Language: it (Italian)');
    console.log('Slug:', post.slug);
    console.log('\n--- TITLE ---');
    console.log(post.title);
    console.log('\n--- META DESCRIPTION ---');
    console.log(post.meta_description);
    console.log('\n--- CONTENT (first 800 characters) ---');
    console.log(post.content.substring(0, 800));
    console.log('\n... [content continues for', post.content.length, 'total characters]');
    console.log('\n--- CONTENT (last 300 characters) ---');
    console.log(post.content.substring(post.content.length - 300));
  }
}

showDetails().catch(console.error);
