import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(readFileSync('posts-to-translate.json', 'utf-8'));

const translations = [
  {
    index: 1,
    title: '5 Strand Resort Mordmysterium Themen, die Ihren Urlaub unvergesslich machen',
    metaDesc: 'Genießen Sie Sonne und Spannung mit tropischen Strand Mordmysterium Partys mit Resortpersonal und Urlaubs-Schurken.',
    file: 'german-post-1.md'
  },
  {
    index: 2,
    title: '5 Casino Mordmysterium Party Themen: Würfeln Sie mit tödlichem Hochrisiko-Drama',
    metaDesc: 'Würfeln Sie mit Gefahr bei Hochrisiko Casino Mordmysterium Partys mit Spielern, Dealern und tödlichen Wetten.',
    file: 'german-post-2.md'
  },
  {
    index: 3,
    title: '5 Spukhaus Mordmysterium Themen',
    metaDesc: 'Erkunden Sie gruselige Spukhaus-Themen perfekt für die Erstellung atmosphärischer maßgeschneiderter Mordmysterium-Erlebnisse.',
    file: 'german-post-3.md'
  },
  {
    index: 4,
    title: '5 Maskenball Mordmysterium Themen, die Ihre Gäste sprachlos machen',
    metaDesc: 'Tanzen Sie mit der Gefahr bei eleganten Maskenball Mordmysterium Partys mit versteckten Identitäten und Ballsaal-Verrat.',
    file: 'german-post-4.md'
  }
];

async function insertGermanPost(translation) {
  const originalPost = posts[translation.index];
  const germanSlug = originalPost.slug + '-de';

  const content = readFileSync(translation.file, 'utf-8');

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: translation.title,
      slug: germanSlug,
      content: content,
      meta_description: translation.metaDesc,
      language: 'de',
      published_at: originalPost.published_at,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error(`❌ Error inserting ${translation.title}:`, error);
    return false;
  }

  console.log(`✅ ${translation.title}`);
  return true;
}

// Insert all translations
console.log('Inserting remaining 4 German posts...\n');
let successCount = 0;

for (const translation of translations) {
  const success = await insertGermanPost(translation);
  if (success) successCount++;
  await new Promise(resolve => setTimeout(resolve, 500));
}

console.log(`\n${successCount}/4 posts successfully inserted.`);
