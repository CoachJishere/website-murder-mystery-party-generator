import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  { id: '141f0863-8371-4f60-a17f-77a38eed6398', name: 'Holiday Gatherings' },
  { id: 'fc1396b1-617a-43b2-81eb-8b9f0325c6a7', name: 'Office Teams' },
  { id: 'da666de8-8af2-420e-90af-490597d4360b', name: 'Small Groups' },
  { id: 'bee3a521-2203-4f03-99a6-1ddc4d97ff62', name: 'Teenagers' }
];

for (const post of posts) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, meta_description, content, tags, theme, author, reading_time, published_at, post_date, status, slug, meta_keywords')
    .eq('id', post.id)
    .eq('language', 'en')
    .single();

  if (!error && data) {
    fs.writeFileSync(`post-${post.name.toLowerCase().replace(/\s+/g, '-')}.json`, JSON.stringify(data, null, 2));
    console.log(`✓ Saved ${post.name}`);
  } else {
    console.log(`✗ Failed ${post.name}`);
  }
}
