import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const ptSlugs = [
  'como-hospedar-festa-misterio-assassinato-conto-fadas-era-uma-vez-crime',
  'como-hospedar-festa-misterio-assassinato-hollywood',
  'como-hospedar-festa-misterio-assassinato-castelo-medieval-governe-reino-intriga-real',
  'como-hospedar-misterio-assassinato-era-proibicionista-contrabando-caminho-emocao',
  'como-hospedar-festa-misterio-assassinato-steampunk-prepare-se-crime-sci-fi-vitoriano'
];

console.log('VERIFYING ALL 5 PORTUGUESE POSTS (17-21)\n');

for (let i = 0; i < ptSlugs.length; i++) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, language, status')
    .eq('slug', ptSlugs[i])
    .eq('language', 'pt')
    .single();

  if (error) {
    console.log(`❌ POST ${i + 1}: NOT FOUND - ${ptSlugs[i]}`);
  } else {
    console.log(`✅ POST ${i + 1}: ${data.title}`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Status: ${data.status}\n`);
  }
}

console.log('VERIFICATION COMPLETE');
