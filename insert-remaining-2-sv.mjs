#!/usr/bin/env node
import fs from 'fs/promises';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const POSTS = [
  {
    enSlug: 'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party',
    svSlug: 'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party-sv',
    title: 'Hur man får gäster som inte vill delta i din mordgåtafest',
    meta: 'Gäster som inte deltar kan förstöra din mordgåtafest. Upptäck beprövade strategier för att engagera även de mest motvilliga deltagarna och skapa en uppslukande upplevelse för alla.',
    file: 'sv-non-participating.md'
  },
  {
    enSlug: 'how-to-fix-overly-complex-murder-mysteries',
    svSlug: 'how-to-fix-overly-complex-murder-mysteries-sv',
    title: 'Hur man fixar alltför komplexa mordgåtor',
    meta: 'Är din mordgåta för komplicerad? Lär dig hur du förenklar komplexa mysterier utan att förlora spänningen. Praktiska tips för att skapa engagerande men hanterbara mordgåtor.',
    file: 'sv-overly-complex.md'
  }
];

async function insertPost(postConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${postConfig.enSlug}`);
  console.log('='.repeat(60));

  // Fetch English post
  const enUrl = `${SUPABASE_URL}?slug=eq.${postConfig.enSlug}&language=eq.en&status=eq.published&select=*`;
  const enResponse = await fetch(enUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const enData = await enResponse.json();

  if (enData.length === 0) {
    throw new Error('English post not found');
  }

  const enPost = enData[0];
  console.log(`✓ Found English: "${enPost.title}"`);

  // Check if Swedish exists
  const checkUrl = `${SUPABASE_URL}?slug=eq.${postConfig.svSlug}&select=id`;
  const checkResponse = await fetch(checkUrl, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const existing = await checkResponse.json();

  if (existing.length > 0) {
    console.log('⚠️  Swedish version already exists. Skipping.');
    return;
  }

  // Read content
  console.log(`Reading ${postConfig.file}...`);
  const svContent = await fs.readFile(`./${postConfig.file}`, 'utf-8');

  // Insert
  const swedishPost = {
    title: postConfig.title,
    slug: postConfig.svSlug,
    content: svContent,
    meta_description: postConfig.meta,
    language: 'sv',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: enPost.tags,
    theme: enPost.theme,
    featured_image_url: enPost.featured_image_url,
    published_at: new Date().toISOString()
  };

  console.log('Inserting Swedish post...');
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
  console.log(`✅ Success! ID: ${result[0].id}, Slug: ${result[0].slug}`);
}

async function main() {
  for (const post of POSTS) {
    try {
      await insertPost(post);
    } catch (error) {
      console.error(`❌ Error:`, error.message);
    }
  }
  console.log('\n' + '='.repeat(60));
  console.log('All done!');
  console.log('='.repeat(60));
}

main();
