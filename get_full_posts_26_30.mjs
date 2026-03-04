import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
  'how-to-host-a-hollywood-murder-mystery-party',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement'
];

async function fetchAll() {
  const allPosts = [];
  
  for (let i = 0; i < slugs.length; i++) {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slugs[i])
      .eq('language', 'en')
      .single();

    if (error || !post) {
      console.error(`Error fetching ${slugs[i]}:`, error);
      continue;
    }

    allPosts.push({
      number: 26 + i,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      meta_description: post.meta_description,
      theme: post.theme,
      tags: post.tags,
      published_at: post.published_at
    });
  }

  fs.writeFileSync('posts-26-30.json', JSON.stringify(allPosts, null, 2));
  console.log('✅ Saved all 5 posts to posts-26-30.json');
}

fetchAll();
