import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get a sample EN post
const { data: enSample } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .limit(1)
  .single();

console.log('EN Sample columns:', Object.keys(enSample));
console.log('\nEN Sample:');
console.log('  slug:', enSample.slug);
console.log('  title:', enSample.title);

// Get a sample DE post
const { data: deSample } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'de')
  .limit(1)
  .single();

console.log('\nDE Sample columns:', Object.keys(deSample));
console.log('\nDE Sample:');
console.log('  slug:', deSample.slug);
console.log('  title:', deSample.title);
