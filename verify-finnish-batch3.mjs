#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function verifyFinnishPosts() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.fi&select=id,title,slug,status,reading_time&order=created_at.desc&limit=15`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );

  const posts = await response.json();
  
  console.log('\n🇫🇮 FINNISH BLOG POSTS VERIFICATION');
  console.log('='.repeat(80));
  console.log(`Total Finnish posts found: ${posts.length}\n`);

  posts.forEach((post, i) => {
    console.log(`${i + 1}. ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Status: ${post.status} | Reading time: ${post.reading_time} min | ID: ${post.id}\n`);
  });
  
  console.log('='.repeat(80));
}

verifyFinnishPosts().catch(console.error);
