#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = 'how-to-fix-confusing-murder-mystery-clues';
const SV_SLUG = 'how-to-fix-confusing-murder-mystery-clues-sv';

async function main() {
  // Fetch English post
  console.log(`Fetching English post: ${EN_SLUG}...`);
  const enUrl = `${SUPABASE_URL}?slug=eq.${EN_SLUG}&language=eq.en&status=eq.published&select=*`;
  const enResponse = await fetch(enUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const enData = await enResponse.json();

  if (enData.length === 0) {
    throw new Error('English post not found');
  }

  const enPost = enData[0];
  console.log(`✓ Found: "${enPost.title}"`);

  // Check if Swedish exists
  console.log(`\nChecking if ${SV_SLUG} exists...`);
  const checkUrl = `${SUPABASE_URL}?slug=eq.${SV_SLUG}&select=id`;
  const checkResponse = await fetch(checkUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const existing = await checkResponse.json();

  if (existing.length > 0) {
    console.log('⚠️  Swedish version already exists. Skipping.');
    return;
  }

  // Read Swedish content from file
  console.log('\nReading Swedish translation...');
  const fs = await import('fs/promises');
  const svContent = await fs.readFile('./sv-confusing-clues.md', 'utf-8');

  // Insert Swedish post
  const swedishPost = {
    title: 'Hur man fixar förvirrande ledtrådar i mordgåtan',
    slug: SV_SLUG,
    content: svContent,
    meta_description: 'Lär dig hur du förhindrar att förvirrande ledtrådar förstör din mordgåtafest. Expertråd för att skapa tydliga, logiska ledtrådar som håller gästerna engagerade utan frustration.',
    language: 'sv',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: enPost.tags,
    theme: enPost.theme,
    featured_image_url: enPost.featured_image_url,
    published_at: new Date().toISOString()
  };

  console.log('\nInserting Swedish post...');
  const insertResponse = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(swedishPost)
  });

  if (!insertResponse.ok) {
    const error = await insertResponse.text();
    throw new Error(`Failed to insert: ${error}`);
  }

  const result = await insertResponse.json();
  console.log(`✅ Success! Inserted post ID: ${result[0].id}`);
  console.log(`   Slug: ${result[0].slug}`);
}

main().catch(console.error);
