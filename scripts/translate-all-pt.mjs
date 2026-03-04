import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// List of posts to translate with their Portuguese slugs
const postsToTranslate = [
  {
    enSlug: 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
    ptSlug: 'planejamento-festa-misterio-assassinato-livraria-vire-pagina-assassinato-literario'
  },
  {
    enSlug: 'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
    ptSlug: 'temas-misterio-assassinato-chef-crimes-culinarios-segredos-cozinha'
  },
  {
    enSlug: 'journalist-murder-mystery-themes-investigative-reporters-deadly-stories',
    ptSlug: 'temas-misterio-assassinato-jornalista-reporteres-investigativos-historias-mortais'
  },
  {
    enSlug: 'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
    ptSlug: 'temas-misterio-assassinato-advogado-drama-tribunal-intriga-juridica'
  },
  {
    enSlug: 'medical-examiner-murder-mystery-themes-forensic-investigations',
    ptSlug: 'temas-misterio-assassinato-medico-legista-investigacoes-forenses'
  }
];

// Get first post
const { data: enPost } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .eq('slug', postsToTranslate[0].enSlug)
  .single();

console.log('Fetched:', enPost.slug);
console.log('Content length:', enPost.content.length);

// Save to file for translation
import { writeFileSync } from 'fs';
writeFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/article_to_translate.json', JSON.stringify(enPost, null, 2));
console.log('Saved to article_to_translate.json');
