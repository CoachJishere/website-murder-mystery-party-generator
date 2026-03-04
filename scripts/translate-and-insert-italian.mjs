import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Translation mappings for Italian slugs
const slugTranslations = {
  'bookstore': 'libreria',
  'murder-mystery': 'mistero-omicidio',
  'party': 'festa',
  'planning': 'pianificazione',
  'turn-the-page-on-literary-murder': 'svelare-mistero-letterario',
  'butler': 'maggiordomo',
  'themes': 'temi',
  'manor-murders-household-secrets': 'omicidi-villa-segreti-domestici',
  'chef': 'chef',
  'culinary-crimes-kitchen-secrets': 'crimini-culinari-segreti-cucina',
  'creating-the-perfect-detective-character-guide': 'creare-perfetto-personaggio-detective-guida',
  'design-compelling-investigators-for-your-custom-murder-mystery-party': 'progettare-investigatori-coinvolgenti-festa-mistero-omicidio-personalizzata',
  'cruise-ship': 'nave-crociera',
  'guide': 'guida',
  'set-sail-for-murder-on-the-high-seas': 'salpare-verso-omicidio-in-alto-mare',
  'haunted-hotel': 'hotel-stregato',
  'check-in-to-terror-and-suspense': 'check-in-terrore-suspense',
  'how-to-fix-guests-breaking-character': 'come-risolvere-ospiti-rompono-personaggio',
  'keep-your-murder-mystery-party-immersive': 'mantenere-festa-mistero-omicidio-immersiva',
  'how-to-host-a-fairy-tale-murder-mystery-party': 'come-ospitare-festa-mistero-omicidio-fiaba',
  'once-upon-a-crime': 'cera-una-volta-crimine',
  'how-to-host-a-hollywood-murder-mystery-party': 'come-ospitare-festa-mistero-omicidio-hollywood',
  'how-to-host-a-medieval-castle-murder-mystery': 'come-ospitare-mistero-omicidio-castello-medievale',
  'rule-your-realm-with-royal-intrigue': 'governare-regno-intrigo-reale'
};

function translateSlug(enSlug) {
  let itSlug = enSlug;
  for (const [en, it] of Object.entries(slugTranslations)) {
    itSlug = itSlug.replace(new RegExp(en, 'g'), it);
  }
  return itSlug;
}

async function insertTranslation(postNum) {
  try {
    const filename = `temp-files/translated-it-${postNum}.json`;
    const translation = JSON.parse(readFileSync(filename, 'utf-8'));

    console.log(`[${postNum}/10] Inserting: ${translation.slug.substring(0, 50)}...`);

    // Check if exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', translation.slug)
      .eq('language', 'it')
      .single();

    if (existing) {
      console.log(`  ⊘ Already exists (id: ${existing.id})\n`);
      return { status: 'skipped', id: existing.id };
    }

    // Get original English post for metadata
    const englishFilename = `temp-files/to-translate-it-${postNum}.json`;
    const englishPost = JSON.parse(readFileSync(englishFilename, 'utf-8'));

    // Insert
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug: translation.slug,
        title: translation.title,
        content: translation.content,
        meta_description: translation.meta_description,
        language: 'it',
        published: englishPost.published !== undefined ? englishPost.published : true,
        category: englishPost.category || 'murder-mystery-themes',
        featured_image: englishPost.featured_image || null,
        author: englishPost.author || 'AI Assistant',
        tags: englishPost.tags || [],
        schema_markup: englishPost.schema_markup || null,
        reading_time: englishPost.reading_time || 15,
        created_at: englishPost.created_at,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    console.log(`  ✅ Inserted (id: ${data[0].id})\n`);
    return { status: 'success', id: data[0].id };

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}\n`);
    return { status: 'error', message: error.message };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('INSERTING ITALIAN TRANSLATIONS - Posts 10-19');
  console.log('='.repeat(80));
  console.log('');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 10; i <= 19; i++) {
    const result = await insertTranslation(i);
    if (result.status === 'success') successCount++;
    else if (result.status === 'skipped') skipCount++;
    else errorCount++;
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successfully inserted: ${successCount}`);
  console.log(`⊘ Skipped (already exist): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`Total: ${successCount + skipCount + errorCount}/10`);
  console.log('='.repeat(80));
}

main();
