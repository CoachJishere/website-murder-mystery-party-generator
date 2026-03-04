import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const titleUpdates = [
  {
    slug: 'jazz-klubb-mordmysterium-fest-planering-swinga-in-i-forbudstidens-brott',
    title: 'Jazz Klubb Mordmysterium Fest Planering: Swinga in i Förbudstidens Brott',
    postNum: 22
  },
  {
    slug: 'journalist-mordmysterium-teman-undersokande-reportrars-dodliga-historier',
    title: 'Journalist Mordmysterium Teman: Undersökande Reportrars Dödliga Historier',
    postNum: 23
  },
  {
    slug: 'advokat-mordmysterium-teman-rattssalsdrama-juridisk-intrig',
    title: 'Advokat Mordmysterium Teman: Rättssalsdrama & Juridisk Intrig',
    postNum: 24
  },
  {
    slug: 'rattslakare-mordmysterium-teman-forensiska-utredningar',
    title: 'Rättsläkare Mordmysterium Teman: Forensiska Utredningar',
    postNum: 25
  }
];

console.log('Updating Swedish titles for posts 22-25:\n');

for (const update of titleUpdates) {
  const { error } = await supabase
    .from('blog_posts')
    .update({ title: update.title })
    .eq('slug', update.slug)
    .eq('language', 'sv');

  if (error) {
    console.error(`❌ ${update.postNum}/25 - Error updating:`, error);
  } else {
    console.log(`✅ ${update.postNum}/25 - Title updated: ${update.title}`);
  }
}

console.log('\n✅ All Swedish titles updated for posts 22-25');
