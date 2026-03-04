import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function verifyDanishPosts() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?language=eq.da&select=id,title,slug,status,created_at&order=created_at.desc&limit=15`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const posts = await response.json();
    
    console.log('='.repeat(70));
    console.log('DANISH BLOG POSTS VERIFICATION');
    console.log('='.repeat(70));
    console.log(`\nTotal Danish posts found: ${posts.length}\n`);
    
    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyDanishPosts();
