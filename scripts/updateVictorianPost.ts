import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVictorianPost() {
  try {
    // Read the optimized content
    const contentPath = path.join(__dirname, '../temp-files/victorian-content-only.txt');
    const optimizedContent = fs.readFileSync(contentPath, 'utf-8');

    // Read the FAQ schema
    const schemaPath = path.join(__dirname, '../temp-files/victorian-faq-schema.json');
    const faqSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    console.log('Updating Victorian Murder Mystery post...');
    console.log('Post ID: f9e5ae63-d483-42e0-845e-6c5ce69c3624');
    console.log('Content length:', optimizedContent.length, 'characters');

    // Update the blog post
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        content: optimizedContent,
        reading_time: 14,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'f9e5ae63-d483-42e0-845e-6c5ce69c3624')
      .select();

    if (error) {
      console.error('Error updating post:', error);
      throw error;
    }

    console.log('✅ Successfully updated Victorian Murder Mystery post!');
    console.log('Updated fields:');
    console.log('- content: optimized with E-E-A-T, statistics, pull quotes, internal links, comparison table, social proof');
    console.log('- reading_time: 14 minutes');
    console.log('- updated_at:', new Date().toISOString());
    console.log('');
    console.log('Optimizations applied:');
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
    console.log('FAQ Schema (for future deployment):');
    console.log('- Saved to: temp-files/victorian-faq-schema.json');
    console.log('- Will be added to BlogPost.tsx when schema column is added to database');
    console.log('');
    console.log('Next steps:');
    console.log('1. Regenerate static HTML for GitHub Pages');
    console.log('2. Monitor Google Search Console for 7 days');
    console.log('3. Track: impressions, average position, Featured Snippet eligibility');

    return data;
  } catch (error) {
    console.error('Failed to update post:', error);
    throw error;
  }
}

// Run the update
updateVictorianPost()
  .then(() => {
    console.log('Update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Update failed:', error);
    process.exit(1);
  });
