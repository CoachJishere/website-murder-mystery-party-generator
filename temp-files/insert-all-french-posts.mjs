import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const translations = [
  {
    title: 'Thèmes de Mystère de Meurtre de Majordome : Meurtres de Manoir et Secrets Domestiques',
    slug: 'themes-de-mystere-de-meurtre-de-majordome-meurtres-de-manoir-et-secrets-domestiques',
    meta_description: 'Créez des mystères de meurtre mettant en vedette des personnages de majordome qui sont témoins de secrets domestiques et naviguent dans la loyauté envers le service. Générez des mystères de manoir personnalisés avec du personnel observateur.',
    content_file: 'post-1-butler-fr.txt'
  },
  {
    title: 'Comment Organiser une Soirée de Mystère de Meurtre de Conte de Fées : Il Était Une Fois un Crime',
    slug: 'comment-organiser-une-soiree-de-mystere-de-meurtre-de-conte-de-fees-il-etait-une-fois-un-crime',
    meta_description: 'Il était une fois un crime avec des soirées de murder mystery de contes de fées fantaisistes mettant en vedette des personnages bien-aimés avec des secrets sombres.',
    content_file: 'post-2-fairytale-fr.txt'
  },
  {
    title: 'Intrigues Uniques de Mystère de Meurtre Film Noir : Entrez dans les Ombres du Crime Urbain',
    slug: 'intrigues-uniques-de-mystere-de-meurtre-film-noir-entrez-dans-les-ombres-du-crime-urbain',
    meta_description: 'Entrez dans les ombres avec des soirées de murder mystery film noir classiques mettant en vedette des détectives, des femmes fatales et le crime urbain.',
    content_file: 'post-3-filmnoir-fr.txt'
  },
  {
    title: 'Mystère de Meurtre de Fouilles Archéologiques Unique : Déterrez les Secrets Anciens et les Meurtres Modernes',
    slug: 'mystere-de-meurtre-de-fouilles-archeologiques-unique-deterrez-les-secrets-anciens-et-les-meurtres-modernes',
    meta_description: 'Déterrez les secrets anciens et les meurtres modernes lors de soirées de mystère de fouilles archéologiques avec des chercheurs et des reliques.',
    content_file: 'post-4-archaeological-fr.txt'
  },
  {
    title: '5 Thèmes de Mystère de Meurtre de Bal Masqué Qui Laisseront Vos Invités Sans Voix',
    slug: '5-themes-de-mystere-de-meurtre-de-bal-masque-qui-laisseront-vos-invites-sans-voix',
    meta_description: 'Dansez avec le danger lors d\'élégants bals masqués de murder mystery mettant en vedette des identités cachées et des trahisons de salle de bal.',
    content_file: 'post-5-masquerade-fr.txt'
  }
];

async function insertPost(translation) {
  console.log(`\nInserting: ${translation.title}`);

  const content = readFileSync(`temp-files/${translation.content_file}`, 'utf-8');

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: translation.title,
      slug: translation.slug,
      content: content,
      meta_description: translation.meta_description,
      language: 'fr',
      status: 'published',
    })
    .select();

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }

  console.log(`✅ ${translation.title}`);
  return true;
}

async function main() {
  console.log('=== Inserting 5 French Blog Posts (6-10) ===\n');

  let success = 0;
  for (const translation of translations) {
    if (await insertPost(translation)) {
      success++;
    }
    // Small delay between inserts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n=== COMPLETE: ${success}/5 French translations inserted ===`);
}

main().catch(console.error);
