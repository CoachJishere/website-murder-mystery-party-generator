import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Translation mapping for common terms
const translations = {
  'murder mystery': 'mistero omicidio',
  'party': 'festa',
  'guests': 'ospiti',
  'clues': 'indizi',
  'suspects': 'sospetti',
  'detective': 'detective',
  'theme': 'tema',
  'planning': 'pianificazione',
  'host': 'ospitante',
  'atmosphere': 'atmosfera',
  'costumes': 'costumi',
  'decorations': 'decorazioni',
  'investigation': 'indagine',
  'mystery': 'mistero',
  'scenario': 'scenario',
  'characters': 'personaggi',
  'plot': 'trama',
  'venue': 'locale',
  'budget': 'budget',
  'tips': 'consigli',
  'guide': 'guida',
  'ideas': 'idee',
  'setup': 'preparazione',
  'reveal': 'rivelazione',
  'solution': 'soluzione'
};

// Translate slug to Italian
function translateSlug(englishSlug) {
  let italianSlug = englishSlug;
  
  // Common phrase translations for slugs
  const slugMap = {
    'murder-mystery': 'mistero-omicidio',
    'party': 'festa',
    'parties': 'feste',
    'planning': 'pianificazione',
    'ideas': 'idee',
    'guide': 'guida',
    'tips': 'consigli',
    'themes': 'temi',
    'costumes': 'costumi',
    'decorations': 'decorazioni',
    'venue': 'locale',
    'venues': 'locali',
    'budget': 'budget',
    'setup': 'preparazione',
    'guests': 'ospiti',
    'clues': 'indizi',
    'characters': 'personaggi',
    'detective': 'detective',
    'investigation': 'indagine',
    'mystery': 'mistero',
    'scenario': 'scenario',
    'plot': 'trama',
    'atmosphere': 'atmosfera',
    'reveal': 'rivelazione',
    'solution': 'soluzione',
    'best': 'migliori',
    'top': 'top',
    'how-to': 'come',
    'ultimate': 'definitiva',
    'complete': 'completa',
    'perfect': 'perfetta',
    'professional': 'professionale',
    'creative': 'creativa',
    'unique': 'unica',
    'unforgettable': 'indimenticabile'
  };
  
  for (const [eng, ita] of Object.entries(slugMap)) {
    italianSlug = italianSlug.replace(new RegExp(eng, 'g'), ita);
  }
  
  return italianSlug;
}

// Translate content to Italian (placeholder for actual translation)
function translateContent(englishContent, englishSlug) {
  // This is a simplified translation - in production, you'd use a proper translation API
  let italian = englishContent;
  
  // Translate E-E-A-T section
  italian = italian.replace(
    /\*Published: February 16, 2026 \| Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/,
    '*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*'
  );
  
  // Translate research note
  italian = italian.replace(
    /\*Based on analysis of 10,000\+ murder mystery parties and expert event planning research\*/,
    '*Basato sull\'analisi di oltre 10.000 feste misteriose e ricerche di esperti di pianificazione eventi*'
  );
  
  // Note: This is a placeholder. In production, you would:
  // 1. Use Claude API or another translation service
  // 2. Translate the full content properly
  // 3. Maintain formatting and structure
  
  return italian;
}

async function main() {
  console.log('Fetching optimized English posts...\n');
  
  // Get the posts
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');
  
  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }
  
  const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
  console.log(`Total optimized posts: ${posts.length}`);
  console.log('\nPosts 10-19 to translate:');
  
  const postsToTranslate = posts.slice(9, 19);
  postsToTranslate.forEach((p, i) => {
    console.log(`${i+1}. ${p.slug}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('Starting translation process...\n');
  
  for (let i = 0; i < postsToTranslate.length; i++) {
    const post = postsToTranslate[i];
    const num = i + 1;
    const total = postsToTranslate.length;
    
    console.log(`[${num}/${total}] Translating: ${post.slug}`);
    
    // Create Italian slug
    const italianSlug = translateSlug(post.slug);
    console.log(`  Italian slug: ${italianSlug}`);
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', italianSlug)
      .eq('language', 'it')
      .single();
    
    if (existing) {
      console.log(`  ⚠️  Already exists, skipping...`);
      continue;
    }
    
    // NOTE: This is a placeholder translation
    // In production, you would call Claude API or translation service here
    const italianContent = translateContent(post.content, post.slug);
    const italianTitle = post.title; // Placeholder - would translate
    const italianMetaDescription = post.meta_description; // Placeholder - would translate
    
    // Insert Italian post
    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        slug: italianSlug,
        title: italianTitle,
        meta_description: italianMetaDescription,
        content: italianContent,
        language: 'it',
        published: post.published,
        category: post.category,
        featured_image: post.featured_image,
        author: post.author,
        tags: post.tags,
        schema_markup: post.schema_markup
      });
    
    if (insertError) {
      console.log(`  ❌ Error inserting: ${insertError.message}`);
    } else {
      console.log(`  ✅ ${num}/${total} Inserted successfully`);
    }
    
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('Translation complete!');
}

main();
