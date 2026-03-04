import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(supabaseUrl, supabaseKey);

const missingPosts = JSON.parse(fs.readFileSync('nl-missing-posts.json', 'utf8'));

console.log(`Fetching ${missingPosts.length} posts for Dutch translation...`);

const allPosts = [];

for (let i = 0; i < missingPosts.length; i++) {
  const post = missingPosts[i];
  console.log(`\nFetching ${i + 1}/${missingPosts.length}: ${post.title}`);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', post.postId)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error(`Error fetching post ${post.postId}:`, error);
    continue;
  }

  if (data) {
    allPosts.push({
      id: data.id,
      slug: data.slug,
      title: data.title,
      meta_description: data.meta_description,
      content: data.content,
      author: data.author,
      categories: data.categories
    });
    console.log(`✓ Fetched: ${data.title.substring(0, 60)}...`);
  }
}

fs.writeFileSync('nl-batch-all-posts.json', JSON.stringify(allPosts, null, 2));
console.log(`\n✓ Saved ${allPosts.length} posts to nl-batch-all-posts.json`);
