import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials
const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVictorianPost() {
  try {
    // Read the optimized content
    const contentPath = join(__dirname, '../temp-files/victorian-content-only.txt');
    const optimizedContent = readFileSync(contentPath, 'utf-8');

    console.log('📝 Updating Victorian Murder Mystery post...');
    console.log('Post ID: f9e5ae63-d483-42e0-845e-6c5ce69c3624');
    console.log('Content length:', optimizedContent.length, 'characters');
    console.log('');

    // Update the blog post
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        content: optimizedContent,
        reading_time: 14,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'f9e5ae63-d483-42e0-845e-6c5ce69c3624')
      .select('id, slug, title, reading_time, updated_at');

    if (error) {
      console.error('❌ Error updating post:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No post found with that ID');
    }

    console.log('✅ Successfully updated Victorian Murder Mystery post!');
    console.log('');
    console.log('📊 Updated Post Details:');
    console.log('- ID:', data[0].id);
    console.log('- Slug:', data[0].slug);
    console.log('- Title:', data[0].title);
    console.log('- Reading Time:', data[0].reading_time, 'minutes');
    console.log('- Updated At:', new Date(data[0].updated_at).toLocaleString());
    console.log('');
    console.log('🎯 Optimizations Applied:');
    console.log('✅ E-E-A-T signals (author, expertise, dates)');
    console.log('✅ 4 statistics with citations');
    console.log('✅ 3 pull quotes/callouts');
    console.log('✅ 5 internal links (generator, related posts, pricing)');
    console.log('✅ 1 comparison table (Victorian vs other eras)');
    console.log('✅ Social proof block (testimonials, usage stats)');
    console.log('✅ Prominent publication dates');
    console.log('✅ 7 FAQ questions');
    console.log('✅ Sources section with 6 citations');
    console.log('');
    console.log('📁 FAQ Schema (for future deployment):');
    console.log('- File: temp-files/victorian-faq-schema.json');
    console.log('- Ready to add to BlogPost.tsx when schema column added');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Regenerate static HTML for GitHub Pages');
    console.log('2. Monitor Google Search Console for 7 days');
    console.log('3. Track: impressions, average position, Featured Snippets');
    console.log('');

    return data[0];
  } catch (error) {
    console.error('❌ Failed to update post:', error);
    throw error;
  }
}

// Run the update
updateVictorianPost()
  .then(() => {
    console.log('✨ Update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Update failed:', error.message);
    process.exit(1);
  });
