import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read pre-translated content from files
const posts = [
  {
    id: '9c6bc262-da91-4eb9-aeda-71f5dc3ce0d8',
    contentFile: 'steampunk-es.txt'
  },
  {
    id: 'dd208ded-7aef-43b1-8176-98a9e5f28c09',
    contentFile: 'superhero-es.txt'
  },
  {
    id: 'f9e5ae63-d483-42e0-845e-6c5ce69c3624',
    contentFile: 'victorian-es.txt'
  },
  {
    id: 'bd829048-623b-467a-94e2-c7676bdf8ef2',
    contentFile: 'zombie-es.txt'
  }
];

async function processPost(postId, contentFile) {
  try {
    // Read translated content
    const content = await fs.readFile(contentFile, 'utf-8');

    // Parse content to extract title, meta, etc.
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '').trim();
    const meta_description = lines[2] || '';

    // Insert into database
    const spanishPost = {
      title: title,
      slug: contentFile.replace('-es.txt', ''),
      meta_description: meta_description.substring(0, 160),
      meta_keywords: '',
      language: 'es',
      status: 'published',
      author: 'Equipo de Mystery Maker Party',
      published_at: '2026-02-16T00:00:00.000Z',
      post_date: '2026-02-16',
      content: content
    };

    const { error } = await supabase
      .from('blog_posts')
      .insert(spanishPost);

    if (error) {
      console.error(`❌ Error inserting ${title}:`, error);
    } else {
      console.log(`✅ ${title}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${contentFile}:`, error.message);
  }
}

async function main() {
  for (const post of posts) {
    await processPost(post.id, post.contentFile);
  }
}

main();
