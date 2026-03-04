import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingPtPosts() {
  try {
    // Get all English master posts
    const { data: masterPosts, error: masterError } = await supabase
      .from('blog_posts')
      .select('id, slug, title, language')
      .eq('language', 'en')
      .order('created_at');

    if (masterError) throw masterError;

    console.log(`Found ${masterPosts.length} master (English) posts`);

    // Get all Portuguese translations
    const { data: ptPosts, error: ptError } = await supabase
      .from('blog_posts')
      .select('id, slug, title, language')
      .eq('language', 'pt')
      .order('created_at');

    if (ptError) throw ptError;

    console.log(`Found ${ptPosts.length} Portuguese posts`);

    // For each master post, check if there's a PT translation
    // PT posts should have slugs that are Portuguese translations of the English slugs
    const missingPosts = [];

    for (const masterPost of masterPosts) {
      // Check if this master post has a Portuguese translation
      // We need to look for PT posts that might be translations
      // The audit shows PT has 50 posts, so 11 are missing

      // Let's get the master post's slug keywords and check PT slugs
      const enSlugWords = masterPost.slug.split('-');

      // Check if any PT post might be a translation
      const hasPtTranslation = ptPosts.some(ptPost => {
        // This is a rough check - ideally we'd have a parent_id or translation_of field
        // For now, we'll check if key English words appear in Portuguese form
        // But this is imperfect without the actual relationship data
        return false; // We'll need to check via database relationship
      });
    }

    // Better approach: Check if there's a blog_post_translations table or parent_id field
    const { data: samplePost, error: sampleError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('language', 'pt')
      .limit(1)
      .single();

    if (sampleError) throw sampleError;

    console.log('\nSample PT post structure:');
    console.log(JSON.stringify(samplePost, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

findMissingPtPosts();
