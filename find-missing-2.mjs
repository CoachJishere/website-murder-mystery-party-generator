import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Search for unsatisfying endings
const { data: endings } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, reading_time')
  .ilike('slug', '%fix%ending%')
  .eq('language', 'en')
  .eq('status', 'published');

console.log('=== UNSATISFYING ENDINGS ===');
if (endings && endings.length > 0) {
  endings.forEach(p => {
    const wordCount = p.content.split(/\s+/).length;
    console.log(`${p.title}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Words: ${wordCount}\n`);
    if (p.slug.includes('unsatisfying')) {
      writeFileSync('batch6-unsatisfying-endings-full.txt', p.content);
      writeFileSync('batch6-unsatisfying-endings-id.txt', p.id);
    }
  });
} else {
  console.log('No matches found\n');
}

// Get the correct Victorian post (not steampunk)
const { data: victorian } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, reading_time')
  .eq('slug', 'how-to-host-a-victorian-murder-mystery-party')
  .eq('language', 'en')
  .eq('status', 'published')
  .single();

console.log('=== VICTORIAN ===');
if (victorian) {
  const wordCount = victorian.content.split(/\s+/).length;
  console.log(`${victorian.title}`);
  console.log(`Words: ${wordCount}`);
  writeFileSync('batch6-victorian-full.txt', victorian.content);
  writeFileSync('batch6-victorian-id.txt', victorian.id);
}
