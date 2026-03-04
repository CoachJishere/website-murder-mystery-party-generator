#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  '1920s-speakeasy-murder-mystery-party-guide',
  '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless',
  'how-to-fix-confusing-murder-mystery-clues',
  'how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murder-mystery-timing',
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy'
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
    throw new Error(`Failed to fetch ${slug}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.length === 0) {
    throw new Error(`No English post found for slug: ${slug}`);
  }

  return data[0];
}

async function checkItalianExists(slug) {
  const url = `${SUPABASE_URL}?language=eq.it&slug=eq.${slug}&select=id,slug`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to check Italian post: ${response.statusText}`);
  }

  const data = await response.json();
  return data.length > 0;
}

async function translateToItalian(text, context = '') {
  // This is a placeholder - you'll need to add actual translation logic
  // For now, we'll return the text with a note
  console.log(`\n⚠️  TRANSLATION NEEDED for ${context}:`);
  console.log('---');
  console.log(text.substring(0, 200) + '...');
  console.log('---\n');
  return text; // Return original for now
}

async function insertItalianPost(englishPost, italianSlug) {
  console.log(`\n📝 Translating: ${englishPost.title}`);

  // Translate content
  const italianTitle = await translateToItalian(englishPost.title, 'TITLE');
  const italianContent = await translateToItalian(englishPost.content, 'CONTENT');
  const italianMetaDescription = await translateToItalian(englishPost.meta_description, 'META_DESCRIPTION');

  const italianPost = {
    title: italianTitle,
    slug: italianSlug,
    content: italianContent,
    excerpt: italianContent.substring(0, 200) + '...',
    meta_description: italianMetaDescription,
    language: 'it',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: englishPost.tags,
    theme: englishPost.theme,
    featured_image_url: englishPost.featured_image_url,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log(`\n📤 Inserting Italian post: ${italianSlug}`);

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
    throw new Error(`Failed to insert Italian post: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Successfully inserted: ${italianSlug} (ID: ${result[0].id})`);
  return result[0];
}

async function processAllPosts() {
  console.log('🚀 Starting Italian translation process for 5 posts...\n');

  for (const enSlug of posts) {
    const itSlug = `${enSlug}-it`;

    try {
      // Check if Italian version already exists
      const exists = await checkItalianExists(itSlug);
      if (exists) {
        console.log(`⏭️  SKIPPING: ${itSlug} (already exists)`);
        continue;
      }

      // Fetch English source
      console.log(`📥 Fetching English post: ${enSlug}`);
      const englishPost = await fetchEnglishPost(enSlug);

      console.log(`📊 Post details:`);
      console.log(`   Title: ${englishPost.title}`);
      console.log(`   Content length: ${englishPost.content?.length || 0} chars`);
      console.log(`   Tags: ${englishPost.tags?.join(', ') || 'none'}`);
      console.log(`   Theme: ${englishPost.theme || 'none'}`);

      // NOTE: This script needs manual translation
      // You'll need to translate the content before running insertion
      console.log(`\n⚠️  MANUAL TRANSLATION REQUIRED FOR: ${enSlug}`);
      console.log(`Please translate and insert this post manually.\n`);

      // Uncomment below when translations are ready:
      // await insertItalianPost(englishPost, itSlug);

    } catch (error) {
      console.error(`❌ Error processing ${enSlug}:`, error.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  console.log('🎉 Process complete!');
}

// Run the process
processAllPosts().catch(console.error);
