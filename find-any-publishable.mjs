import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function main() {
  console.log('=== Looking for any publishable French drafts ===\n');
  
  // Get all published French posts
  const pubUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug&language=eq.fr&status=eq.published`;
  const pubResponse = await fetch(pubUrl, { headers });
  const published = await pubResponse.json();
  const publishedSlugs = new Set(published.map(p => p.slug));
  
  console.log(`Currently ${published.length} published French posts\n`);
  
  // Get all draft French posts with content length
  const draftUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title,content&language=eq.fr&status=eq.draft&order=created_at.desc`;
  const draftResponse = await fetch(draftUrl, { headers });
  const drafts = await draftResponse.json();
  
  console.log(`Found ${drafts.length} draft French posts\n`);
  
  // Find drafts with substantial content (>1000 chars) that aren't duplicates
  const publishable = drafts.filter(d => {
    if (!d.content || d.content.length < 1000) return false;
    if (publishedSlugs.has(d.slug)) return false;
    return true;
  });
  
  console.log(`Found ${publishable.length} drafts with substantial content (>1000 chars)\n`);
  
  // Show the first 10
  console.log('Top 10 publishable drafts by recency:\n');
  publishable.slice(0, 10).forEach((d, i) => {
    console.log(`${i + 1}. ${d.slug}`);
    console.log(`   ${d.title}`);
    console.log(`   Content length: ${d.content.length} chars`);
    console.log(`   ID: ${d.id}\n`);
  });
  
  // Check specific topics
  console.log('\n=== Checking for specific missing topics ===\n');
  
  // Look for archaeological more broadly
  const archaeological = publishable.filter(d => {
    const text = (d.slug + ' ' + d.title).toLowerCase();
    return text.includes('fouille') || text.includes('archeolog') || 
           text.includes('ancient') || text.includes('ruin') ||
           text.includes('excavat');
  });
  
  if (archaeological.length > 0) {
    console.log('ARCHAEOLOGICAL matches:');
    archaeological.forEach(d => {
      console.log(`  ${d.slug}`);
      console.log(`  ${d.title}`);
      console.log(`  ID: ${d.id}\n`);
    });
  }
  
  // Look for spa/wellness
  const spa = publishable.filter(d => {
    const text = (d.slug + ' ' + d.title).toLowerCase();
    return (text.includes('spa') || text.includes('therm') || 
            text.includes('wellness') || text.includes('bien-etre') ||
            text.includes('detente') || text.includes('massage')) &&
           !text.includes('spatial') && !text.includes('espace');
  });
  
  if (spa.length > 0) {
    console.log('SPA/WELLNESS matches:');
    spa.forEach(d => {
      console.log(`  ${d.slug}`);
      console.log(`  ${d.title}`);
      console.log(`  ID: ${d.id}\n`);
    });
  }
  
  // Suggest top 2 to publish to reach 61
  console.log('\n=== RECOMMENDATION ===');
  console.log('To reach 61 published posts, publish these 2 drafts:\n');
  if (publishable.length >= 2) {
    publishable.slice(0, 2).forEach((d, i) => {
      console.log(`${i + 1}. ${d.slug}`);
      console.log(`   ${d.title}`);
      console.log(`   ID: ${d.id}\n`);
    });
  }
}

main().catch(console.error);
