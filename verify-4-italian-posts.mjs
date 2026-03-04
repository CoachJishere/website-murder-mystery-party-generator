#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const expectedPosts = [
  {
    slug: 'how-to-host-a-space-station-murder-mystery-it',
    title: 'Come Organizzare un Giallo sulla Stazione Spaziale',
    theme: 'Sci-Fi'
  },
  {
    slug: 'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains-it',
    title: 'Come Organizzare una Festa a Tema Giallo con Supereroi',
    theme: 'Superhero'
  },
  {
    slug: 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival-it',
    title: 'Come Organizzare un Giallo sull\'Apocalisse Zombie',
    theme: 'Horror/Zombie'
  },
  {
    slug: 'innocent-bystander-murder-mystery-themes-wrong-place-wrong-time-it',
    title: 'Temi di Gialli con Testimoni Innocenti',
    theme: 'Mystery Themes'
  }
];

async function verifyPost(expectedPost) {
  const url = `${SUPABASE_URL}?language=eq.it&slug=eq.${expectedPost.slug}&select=id,title,slug,language,status,theme,tags,published_at,content`;

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
    return { found: false, slug: expectedPost.slug };
  }

  const post = posts[0];
  return {
    found: true,
    slug: post.slug,
    title: post.title,
    theme: post.theme,
    tags: post.tags,
    status: post.status,
    published_at: post.published_at,
    content_length: post.content.length
  };
}

async function main() {
  console.log('VERIFICATION OF 4 ITALIAN BLOG POSTS');
  console.log('=' .repeat(80));
  console.log('\nChecking for Italian translations...\n');

  const results = [];

  for (let i = 0; i < expectedPosts.length; i++) {
    const expected = expectedPosts[i];
    console.log(`${i + 1}. Checking: ${expected.slug}`);

    try {
      const result = await verifyPost(expected);
      results.push(result);

      if (result.found) {
        console.log(`   ✓ FOUND`);
        console.log(`   Title: ${result.title}`);
        console.log(`   Theme: ${result.theme}`);
        console.log(`   Tags: ${result.tags?.join(', ') || 'none'}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Content length: ${result.content_length} characters`);
        console.log(`   Published: ${result.published_at}`);
      } else {
        console.log(`   ✗ NOT FOUND`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ✗ ERROR: ${error.message}\n`);
      results.push({ found: false, slug: expected.slug, error: error.message });
    }
  }

  console.log('=' .repeat(80));
  console.log('SUMMARY');
  console.log('=' .repeat(80));

  const found = results.filter(r => r.found).length;
  const notFound = results.filter(r => !r.found).length;

  console.log(`\n✓ Successfully inserted: ${found}/4`);
  console.log(`✗ Not found: ${notFound}/4`);

  if (found === 4) {
    console.log('\n🎉 SUCCESS! All 4 Italian posts are live in the database.');
    console.log('\nPost URLs (assuming standard routing):');
    results.forEach((r, i) => {
      if (r.found) {
        console.log(`${i + 1}. https://your-site.com/blog/${r.slug}`);
      }
    });
  } else {
    console.log('\n⚠️  Some posts were not found. Please review the errors above.');
  }

  console.log('\n' + '=' .repeat(80));
}

main().catch(console.error);
