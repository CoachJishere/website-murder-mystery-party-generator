import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('ITALIAN BATCH TRANSLATION: Posts 3-5\n');

// POST 3: Haunted Mansion
const post3 = {
  slug: '5-temi-murder-mystery-villa-stregata',
  title: '5 Temi Murder Mystery per Ville Stregate',
  content: fs.readFileSync('temp-files/italian-post-3-content.txt', 'utf-8'),
  meta_description: 'Esplorate temi da brivido di ville stregate perfetti per creare esperienze di murder mystery personalizzate e atmosferiche.',
  meta_keywords: 'temi murder mystery villa stregata, festa murder mystery soprannaturale, mistero villa gotica, idee festa casa stregata, temi murder mystery spaventosi, festa mistero paranormale, murder mystery storie fantasmi, murder mystery occulto, festa horror atmosferica, festa investigazione soprannaturale',
  language: 'it',
  reading_time: 14,
  theme: 'Halloween/Spooky',
  status: 'published',
  author: 'AI Assistant',
  tags: ['Halloween/Spooky'],
  created_at: '2025-10-27T05:00:37.898165+00:00',
  updated_at: new Date().toISOString(),
  post_date: '2025-10-27',
  published_at: '2025-10-27T05:00:37.073+00:00'
};

// POST 4: Mountain Lodge
const post4 = {
  slug: '5-temi-murder-mystery-rifugio-montano-che-renderanno-il-vostro-ritiro-indimenticabile',
  title: '5 Temi Murder Mystery per Rifugi Montani Che Renderanno il Vostro Ritiro Indimenticabile',
  content: fs.readFileSync('temp-files/italian-post-4-content.txt', 'utf-8'),
  meta_description: 'Scoprite mistero e omicidio tra le montagne con feste murder mystery in rifugi di montagna con intrighi alpini innevati.',
  meta_keywords: 'murder mystery rifugio montano, murder mystery montagna, festa mistero inverno, temi murder mystery alpino, festa rifugio neve, murder mystery isolato, mistero capanna montagna, murder mystery ritiro, mistero inverno montagna, intrattenimento rifugio',
  language: 'it',
  reading_time: 14,
  theme: 'Mountain Lodge',
  status: 'published',
  author: 'AI Assistant',
  tags: ['Mountain Lodge'],
  created_at: '2025-11-03T05:00:10.764104+00:00',
  updated_at: new Date().toISOString(),
  post_date: '2025-11-03',
  published_at: '2025-11-03T05:00:10.343+00:00'
};

// POST 5: Renaissance
const post5 = {
  slug: '5-temi-festa-murder-mystery-rinascimentale',
  title: '5 Temi di Feste Murder Mystery Rinascimentali',
  content: fs.readFileSync('temp-files/italian-post-5-content.txt', 'utf-8'),
  meta_description: 'Viaggiate indietro nel tempo con feste murder mystery rinascimentali con intrighi di corte, segreti di artisti e misteri medicei.',
  meta_keywords: 'murder mystery rinascimentale, festa murder mystery storica, mistero corte rinascimentale, festa a tema rinascimentale, murder mystery medievale, festa Medici, murder mystery palazzo italiano, temi festa storica, murder mystery costume, festa rinascimentale',
  language: 'it',
  reading_time: 14,
  theme: 'Renaissance',
  status: 'published',
  author: 'AI Assistant',
  tags: ['Renaissance'],
  created_at: '2025-11-10T05:00:56.034816+00:00',
  updated_at: new Date().toISOString(),
  post_date: '2025-11-10',
  published_at: '2025-11-10T05:00:55.652+00:00'
};

const posts = [
  { num: 3, data: post3 },
  { num: 4, data: post4 },
  { num: 5, data: post5 }
];

for (const post of posts) {
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', post.data.slug)
    .eq('language', 'it')
    .single();

  if (existing) {
    console.log(`⚠️  POST ${post.num} already exists: ${post.data.slug}`);
  } else {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(post.data)
      .select();

    if (error) {
      console.error(`❌ POST ${post.num} Error:`, error.message);
    } else {
      console.log(`✅ POST ${post.num} INSERTED: ${post.data.slug}`);
      console.log(`   Title: ${post.data.title}`);
      console.log(`   ID: ${data[0].id}\n`);
    }
  }
}

console.log('='.repeat(80));
console.log('BATCH COMPLETE');
console.log('='.repeat(80));
