import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2MTkwODgsImV4cCI6MjA0MTE5NTA4OH0.wliQfY6Wl7vOxhY0TXhOr8GGy4SjIzaUjz-dUU5h3uM';

const supabase = createClient(supabaseUrl, supabaseKey);

const postIds = [
  { id: 'fb39f18e-8b9f-4332-9502-dc88fa9345e9', num: 6, title: 'Wild West' },
  { id: '1d51a590-b04a-4167-b0f2-96d3a2c7ff79', num: 7, title: 'Pirate' },
  { id: 'bdb64008-689e-4db6-87be-c170a6bde642', num: 8, title: 'Fix Confusing Clues' },
  { id: '3cb1b819-7c13-4630-95ed-494ef515fd0a', num: 9, title: 'Space Station' },
  { id: '7f38f1ae-fff5-4119-b6a1-1ea5a8fbbd02', num: 10, title: 'Innocent Bystander' },
  { id: '7adb6cd9-e978-456e-a72b-852b905bbb78', num: 11, title: 'Fix Overly Complex' },
  { id: '2d19c069-2354-45b5-be1f-ffe3d5338e7b', num: 12, title: 'Masquerade Ball' }
];

async function fetchPosts() {
  for (const post of postIds) {
    console.log(`\n=== Fetching Post ${post.num}: ${post.title} ===`);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', post.id)
      .eq('language', 'en')
      .single();

    if (error) {
      console.error(`Error fetching post ${post.num}:`, error);
      continue;
    }

    if (data) {
      const filename = `zh-cn-post-${post.num}-en.json`;
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`✓ Saved to ${filename}`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Content length: ${data.content?.length || 0} chars`);
    }
  }
}

fetchPosts().catch(console.error);
