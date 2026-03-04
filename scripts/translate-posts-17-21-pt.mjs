import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    slug: 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
    ptSlug: 'como-hospedar-festa-misterio-assassinato-conto-fadas-era-uma-vez-crime'
  },
  {
    slug: 'how-to-host-a-hollywood-murder-mystery-party',
    ptSlug: 'como-hospedar-festa-misterio-assassinato-hollywood'
  },
  {
    slug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    ptSlug: 'como-hospedar-festa-misterio-assassinato-castelo-medieval-governe-reino-intriga-real'
  },
  {
    slug: 'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
    ptSlug: 'como-hospedar-misterio-assassinato-era-proibicionista-contrabando-caminho-emocao'
  },
  {
    slug: 'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
    ptSlug: 'como-hospedar-festa-misterio-assassinato-steampunk-prepare-se-crime-sci-fi-vitoriano'
  }
];

console.log('Starting translation process...\n');

for (const post of posts) {
  console.log(`Fetching: ${post.slug}`);

  const { data: enPost, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', post.slug)
    .eq('language', 'en')
    .single();

  if (error || !enPost) {
    console.log(`❌ Error fetching ${post.slug}:`, error);
    continue;
  }

  console.log(`Saving for translation: ${post.slug}\n`);

  // Save to file for translation
  await fs.writeFile(`translation-${post.slug}.json`, JSON.stringify(enPost, null, 2));
}

console.log('\nAll posts fetched. Ready for translation.');
