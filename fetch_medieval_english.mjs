const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function fetchEnglish() {
  const url = `${SUPABASE_URL}?slug=eq.unique-medieval-murder-mystery-plot-ideas&language=eq.en&select=title,content,meta_description`;
  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY }
  });
  const data = await res.json();
  
  if (data[0]) {
    const post = data[0];
    console.log('ENGLISH POST FOUND');
    console.log('Title:', post.title);
    console.log('Meta:', post.meta_description);
    console.log('Content length:', post.content.length, 'characters');
    console.log('\n--- CONTENT ---\n');
    console.log(post.content);
  } else {
    console.log('English post not found');
  }
}

fetchEnglish().catch(console.error);
