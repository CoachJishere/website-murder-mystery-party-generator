import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function verify() {
  const { data: batch2, error: e2 } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', 'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto')
    .eq('language', 'es')
    .single();

  if (e2) {
    console.error('Error:', e2);
    return;
  }

  // Check if content is mostly English or mostly Spanish
  const sample = batch2.content.substring(500, 1500);
  console.log('Sample from Batch 2 post (chars 500-1500):');
  console.log(sample);
  console.log('\n');

  // Count English vs Spanish indicators
  const englishWords = (sample.match(/\b(the|and|that|with|from|this|will|have|your|are|for|not|but|can|all|would|there|their|what|about|which|when|make|like|time|into|just|know|take|people|than|only|come|some|these|way|could|them|see|other|many|most)\b/gi) || []).length;
  const spanishWords = (sample.match(/\b(el|la|de|que|y|a|en|un|ser|se|no|haber|por|con|su|para|como|estar|tener|le|lo|todo|pero|más|hacer|o|poder|decir|este|ir|otro|ese|la|si|me|ya|ver|porque|dar|cuando|muy|sin|vez|mucho|saber|qué|sobre|mi|alguno|mismo|yo|también)\b/gi) || []).length;

  console.log(`English word indicators: ${englishWords}`);
  console.log(`Spanish word indicators: ${spanishWords}`);

  if (englishWords > spanishWords) {
    console.log('\n⚠️ WARNING: Content appears to be mostly ENGLISH, not Spanish!');
    console.log('Batch 2 needs FULL translation like Batch 1.');
  } else {
    console.log('\n✅ Content appears to be properly translated to Spanish.');
  }
}

verify();
