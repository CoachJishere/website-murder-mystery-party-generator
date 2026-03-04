import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postsToTranslate = [
  '1920s-speakeasy-murder-mystery-party-guide',
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
  '5-haunted-mansion-murder-mystery-themes',
  '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless'
];

async function fetchEnglishPost(slug) {
  console.log(`\n📖 Fetching English post: ${slug}`);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error(`❌ Error fetching post: ${error.message}`);
    return null;
  }

  console.log(`✅ Fetched: ${data.title}`);
  return data;
}

async function savePostForTranslation(slug, englishPost) {
  const filename = `./posts-to-translate/${slug}.json`;

  // Create directory if it doesn't exist
  if (!fs.existsSync('./posts-to-translate')) {
    fs.mkdirSync('./posts-to-translate', { recursive: true });
  }

  const data = {
    slug: slug,
    title: englishPost.title,
    meta_description: englishPost.meta_description,
    content: englishPost.content,
    category: englishPost.category,
    tags: englishPost.tags,
    reading_time_minutes: englishPost.reading_time_minutes,
    featured_image_url: englishPost.featured_image_url,
    canonical_url: englishPost.canonical_url
  };

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Saved to: ${filename}`);
}

async function insertTranslatedPost(translationData) {
  console.log(`\n💾 Inserting Chinese post: ${translationData.slug}`);

  const postData = {
    title: translationData.title,
    slug: translationData.slug,
    content: translationData.content,
    meta_description: translationData.meta_description,
    language: 'zh-cn',
    status: 'published',
    published_at: new Date().toISOString(),
    author: '神秘派对专家团队',
    reading_time_minutes: translationData.reading_time_minutes || 8,
    category: translationData.category || 'murder-mystery-guides',
    tags: translationData.tags || ['murder-mystery', 'party-planning', 'themed-parties'],
    featured_image_url: translationData.featured_image_url,
    featured_image_alt: translationData.title,
    canonical_url: translationData.canonical_url,
    is_optimized: true,
    optimized_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([postData])
    .select();

  if (error) {
    console.error(`❌ Insert error: ${error.message}`);
    console.error(`   Details: ${JSON.stringify(error, null, 2)}`);
    return false;
  }

  console.log(`✅ Successfully inserted: ${translationData.slug}`);
  console.log(`   Post ID: ${data[0].id}`);
  return true;
}

async function main() {
  const command = process.argv[2];

  if (command === 'fetch') {
    console.log('🚀 Fetching posts for translation\n');

    for (const slug of postsToTranslate) {
      const post = await fetchEnglishPost(slug);
      if (post) {
        await savePostForTranslation(slug, post);
      }
    }

    console.log('\n✅ All posts fetched and saved to ./posts-to-translate/');
    console.log('📝 Next step: Translate each JSON file and run "node script.mjs insert <translated-file.json>"');

  } else if (command === 'insert') {
    const filename = process.argv[3];

    if (!filename) {
      console.error('❌ Please provide a translated file: node script.mjs insert <file.json>');
      return;
    }

    console.log(`\n🚀 Inserting translated post from: ${filename}\n`);

    const translationData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const success = await insertTranslatedPost(translationData);

    if (success) {
      console.log('\n✅ Post successfully inserted!');
    } else {
      console.log('\n❌ Failed to insert post');
    }

  } else {
    console.log('Usage:');
    console.log('  node script.mjs fetch          - Fetch all posts and save for translation');
    console.log('  node script.mjs insert <file>  - Insert a translated post from JSON file');
  }
}

main().catch(console.error);
