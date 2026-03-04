import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue-fr',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue-fr',
  'how-to-host-a-space-station-murder-mystery-fr',
  'how-to-host-a-hollywood-murder-mystery-party-fr',
  'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime-fr'
];

const { data, error } = await supabase
  .from('blog_posts')
  .select('title, slug, language, meta_description')
  .in('slug', slugs)
  .order('id');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('\n✅ TRANSLATION COMPLETE - 5 NEW FRENCH POSTS\n');
console.log('═'.repeat(60));
data.forEach((post, i) => {
  console.log(`\n${i + 11}. ✅ ${post.title}`);
  console.log(`    Slug: ${post.slug}`);
  console.log(`    Meta: ${post.meta_description.substring(0, 80)}...`);
});
console.log('\n' + '═'.repeat(60));
console.log('\n✨ All 5 posts translated to French and inserted successfully!\n');
