#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const postsToTranslate = [
  'how-to-host-a-space-station-murder-mystery',
  'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
  'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
  'innocent-bystander-murder-mystery-themes-wrong-place-wrong-time'
];

async function fetchEnglishPost(slug) {
  const url = `${SUPABASE_URL}?language=eq.en&status=eq.published&slug=eq.${slug}&select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }

  const posts = await response.json();
  if (posts.length === 0) {
    throw new Error(`Post not found: ${slug}`);
  }

  return posts[0];
}

async function checkIfItalianExists(slug) {
  const italianSlug = `${slug}-it`;
  const url = `${SUPABASE_URL}?language=eq.it&slug=eq.${italianSlug}&select=id`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const posts = await response.json();
  return posts.length > 0;
}

async function translateToItalian(englishPost) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TRANSLATING: ${englishPost.title}`);
  console.log(`${'='.repeat(80)}\n`);

  // For now, we'll output the English content that needs to be translated
  // In production, you would use a translation API or manual translation
  console.log('ENGLISH TITLE:', englishPost.title);
  console.log('\nENGLISH META DESCRIPTION:', englishPost.meta_description);
  console.log('\nENGLISH CONTENT LENGTH:', englishPost.content.length, 'characters');
  console.log('\nFIRST 500 CHARS OF CONTENT:');
  console.log(englishPost.content.substring(0, 500));
  console.log('\n...[FULL CONTENT TO BE TRANSLATED]...\n');

  return {
    title: englishPost.title, // To be replaced with translation
    meta_description: englishPost.meta_description, // To be replaced with translation
    content: englishPost.content // To be replaced with translation
  };
}

async function insertItalianPost(englishPost, translation) {
  const italianSlug = `${englishPost.slug}-it`;

  const italianPost = {
    title: translation.title,
    slug: italianSlug,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'it',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: englishPost.tags,
    theme: englishPost.theme,
    featured_image_url: englishPost.featured_image_url,
    published_at: new Date().toISOString()
  };

  const response = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(italianPost)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert post: ${error}`);
  }

  return await response.json();
}

async function processPost(englishSlug, index) {
  console.log(`\n\n${'#'.repeat(80)}`);
  console.log(`POST ${index + 1} OF ${postsToTranslate.length}: ${englishSlug}`);
  console.log(`${'#'.repeat(80)}`);

  try {
    // Check if Italian version already exists
    const exists = await checkIfItalianExists(englishSlug);
    if (exists) {
      console.log(`✓ Italian version already exists for: ${englishSlug}-it`);
      return { status: 'skipped', slug: englishSlug };
    }

    // Fetch English post
    console.log('Fetching English post...');
    const englishPost = await fetchEnglishPost(englishSlug);
    console.log(`✓ Fetched: ${englishPost.title}`);
    console.log(`  Tags: ${englishPost.tags?.join(', ') || 'none'}`);
    console.log(`  Theme: ${englishPost.theme || 'none'}`);

    // Save English content to file for translation
    const fs = await import('fs/promises');
    const fileName = `italian-post-${index + 1}-${englishSlug.substring(0, 30)}.json`;
    await fs.writeFile(fileName, JSON.stringify(englishPost, null, 2));
    console.log(`✓ Saved English content to: ${fileName}`);

    return {
      status: 'ready_for_translation',
      slug: englishSlug,
      file: fileName,
      post: englishPost
    };

  } catch (error) {
    console.error(`✗ Error processing ${englishSlug}:`, error.message);
    return { status: 'error', slug: englishSlug, error: error.message };
  }
}

async function main() {
  console.log('ITALIAN TRANSLATION PROJECT - 4 POSTS');
  console.log('======================================\n');

  const results = [];

  for (let i = 0; i < postsToTranslate.length; i++) {
    const result = await processPost(postsToTranslate[i], i);
    results.push(result);
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const readyForTranslation = results.filter(r => r.status === 'ready_for_translation');
  const alreadyExists = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\n✓ Ready for translation: ${readyForTranslation.length}`);
  readyForTranslation.forEach(r => console.log(`  - ${r.slug} → ${r.file}`));

  console.log(`\n✓ Already exists: ${alreadyExists.length}`);
  alreadyExists.forEach(r => console.log(`  - ${r.slug}`));

  console.log(`\n✗ Errors: ${errors.length}`);
  errors.forEach(r => console.log(`  - ${r.slug}: ${r.error}`));

  console.log('\n\nNEXT STEPS:');
  console.log('1. Review the JSON files created for each post');
  console.log('2. Translate the title, meta_description, and content to Italian');
  console.log('3. Run the insertion script for each translated post');
}

main().catch(console.error);
