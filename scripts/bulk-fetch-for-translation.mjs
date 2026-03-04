import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const remaining = [
  "how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime",
  "how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue",
  "how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement",
  "how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime",
  "how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains"
];

const posts = [];

for (const slug of remaining) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .eq('slug', slug)
    .single();
  
  if (!error && data) {
    posts.push({
      slug: data.slug,
      title: data.title,
      meta_description: data.meta_description,
      meta_keywords: data.meta_keywords,
      theme: data.theme,
      tags: data.tags,
      reading_time: data.reading_time,
      content_length: data.content.length
    });
  }
}

console.log(JSON.stringify(posts, null, 2));

