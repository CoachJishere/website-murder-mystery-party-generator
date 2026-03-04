import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

function createGermanSlug(germanTitle) {
  return germanTitle
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 150); // Reasonable slug length
}

// This object maps English slugs to their German translations
// I'll fill this in as I translate each post
const germanTranslations = {
  "creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party": {
    title: "Der Perfekte Detektiv-Charakter Leitfaden: Überzeugende Ermittler für Ihre Maßgeschneiderte Krimi-Party Gestalten",
    meta_description: "Gestalten Sie überzeugende Detektiv-Charaktere mit einzigartigen Hintergrundgeschichten, Motiven und Hinweisen, die Gäste bei Ihrer maßgeschneiderten Krimi-Party fesseln.",
    // Content will be added separately due to length
  }
};

async function insertGermanPost(englishSlug, germanData, englishPost) {
  const germanSlug = createGermanSlug(germanData.title);

  console.log(`   German title: ${germanData.title.substring(0, 60)}...`);
  console.log(`   German slug: ${germanSlug}`);

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', germanSlug)
      .single();

    if (existing) {
      console.log(`   ⏭️  Already exists (skipping)\n`);
      return { status: 'skipped' };
    }

    const germanPost = {
      slug: germanSlug,
      title: germanData.title,
      content: germanData.content,
      meta_description: germanData.meta_description,
      language: 'de',
      reading_time: englishPost.reading_time,
      theme: englishPost.theme,
      meta_keywords: englishPost.meta_keywords,
      tags: englishPost.tags,
      author: englishPost.author,
      status: 'published',
      created_at: englishPost.created_at,
      updated_at: new Date().toISOString(),
      published_at: englishPost.published_at,
      post_date: englishPost.post_date
    };

    const { error } = await supabase.from('blog_posts').insert(germanPost);
    if (error) throw error;

    console.log(`   ✅ Successfully inserted\n`);
    return { status: 'success', slug: germanSlug };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return { status: 'error', error: error.message };
  }
}

export { createGermanSlug, insertGermanPost };
