import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Topic keyword mappings for matching
const topicKeywords = {
  'fairy-tale': ['conte-de-fees', 'conte-de-fee', 'fiaba', 'conte', 'fees', 'fairy-tale'],
  'masquerade': ['bal-masque', 'masque', 'mascarade', 'masquerade'],
  'speakeasy': ['speakeasy', 'clandestin', 'prohibition', '1920'],
  'detective': ['detective', 'investigat'],
  'mountain-lodge': ['montagne', 'chalet', 'lodge', 'mountain'],
  'ancient-egypt': ['egypte', 'egypt', 'pharaon', 'ancient-egypt'],
  'spy-thriller': ['espion', 'spy', 'thriller', 'espionnage'],
  'cruise-ship': ['croisiere', 'cruise', 'navire', 'paquebot'],
  'art-gallery': ['galerie', 'gallerie', 'art-gallery'],
  'butler': ['majordome', 'butler'],
  'chef': ['chef', 'cuisinier', 'culinaire'],
  'bookstore': ['librairie', 'bookstore', 'libraire'],
  'haunted-mansion': ['manoir-hante', 'hante', 'manoir', 'maison-hantee', 'haunted-mansion'],
  'hollywood': ['hollywood'],
  'renaissance': ['renaissance'],
  'medieval': ['medieval', 'chateau-medieval', 'moyen-age', 'medieva'],
  'victorian': ['victorien', 'victorian'],
  'wild-west': ['far-west', 'western', 'wild-west'],
  'beach-resort': ['plage', 'beach', 'bord-de-mer', 'station-balneaire'],
  'space-colony': ['spatial', 'espace', 'colonie-spatiale', 'space-station', 'station-spatiale'],
  'casino': ['casino'],
  'haunted-hotel': ['hotel-hante', 'hotel-fantome', 'haunted-hotel'],
  'prohibition': ['prohibition', 'bootleg'],
  'steampunk': ['steampunk'],
  'jazz': ['jazz'],
  'journalist': ['journaliste', 'journalist', 'reporter'],
  'lawyer': ['avocat', 'lawyer', 'legal', 'tribunal'],
  'medical-examiner': ['medecin-legiste', 'forensi', 'medecin'],
  'birthday': ['anniversaire', 'birthday'],
  'corporate': ['entreprise', 'corporate', 'team-building'],
  'date-night': ['soiree-couple', 'date-night', 'romantique'],
  'game-night': ['soiree-jeu', 'game-night', 'jeux'],
  'graduation': ['diplome', 'graduation'],
  'holiday': ['fetes', 'festive', 'holiday', 'noel'],
  'office': ['bureau', 'office', 'equipes-bureau'],
  'small-groups': ['petits-groupes', 'small-groups'],
  'teenagers': ['adolescents', 'teenagers', 'ados'],
  'socialite': ['mondain', 'socialite', 'high-society'],
  'archaeological': ['archeologique', 'archaeological', 'fouilles'],
  'circus': ['cirque', 'circus'],
  'pirate': ['pirate'],
  'school-reunion': ['reunion-scolaire', 'school-reunion', 'retrouvailles'],
  'train-station': ['gare', 'train-station', 'ferroviaire'],
  'underwater': ['sous-marin', 'underwater'],
  'villain': ['mechant', 'villain', 'antagonist'],
  'dinner-party': ['diner', 'dinner', 'soiree-diner'],
  'boring': ['ennuyeuse', 'boring', 'ennui'],
  'confusing-clues': ['indices-confus', 'confusing-clues', 'indices'],
  'non-participating': ['ne-participent', 'non-participating', 'non-participant'],
  'overly-complex': ['trop-complexes', 'overly-complex'],
  'pacing': ['rythme', 'pacing', 'timing', 'tempo'],
  'unrealistic': ['irrealistes', 'unrealistic', 'realisme'],
  'unsatisfying-endings': ['fins-insatisfaisantes', 'unsatisfying-endings', 'fins'],
  'breaking-character': ['personnage', 'breaking-character', 'hors-personnage'],
  'film-noir': ['film-noir', 'cinema-noir'],
  'superhero': ['super-heros', 'superhero'],
  'zombie': ['zombie', 'zombi'],
  'vintage-circus': ['cirque-vintage', 'vintage-circus'],
  'celtic': ['celte', 'celtic', 'celtique'],
  'mayan': ['maya', 'mayan'],
  'greek': ['grec', 'greek', 'grece'],
  'aztec': ['azteque', 'aztec']
};

// Calculate match score between English post and French draft
function calculateMatchScore(enPost, frDraft) {
  const enSlug = enPost.slug.toLowerCase();
  const frSlug = frDraft.slug.toLowerCase();
  const frTitle = frDraft.title.toLowerCase();
  
  let maxScore = 0;
  let matchedTopic = null;
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    // Check if English slug contains the topic
    if (!enSlug.includes(topic)) continue;
    
    let score = 0;
    for (const keyword of keywords) {
      if (frSlug.includes(keyword)) {
        score += 10; // High score for slug match
      }
      if (frTitle.includes(keyword)) {
        score += 5; // Medium score for title match
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      matchedTopic = topic;
    }
  }
  
  return { score: maxScore, topic: matchedTopic };
}

async function fetchData(endpoint, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${params}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

async function updatePostStatus(postId, status) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${postId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update post ${postId}: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

async function main() {
  console.log('=== French Blog Post Recovery ===\n');
  
  // Step 1: Fetch all published English posts
  console.log('1. Fetching published English posts...');
  const enPosts = await fetchData('blog_posts', '?select=id,slug,title&language=eq.en&status=eq.published&order=created_at.asc');
  console.log(`   Found ${enPosts.length} published English posts\n`);
  
  // Step 2: Fetch all French draft posts
  console.log('2. Fetching French draft posts...');
  const frDrafts = await fetchData('blog_posts', '?select=id,slug,title,content,created_at&language=eq.fr&status=eq.draft&order=created_at.desc');
  console.log(`   Found ${frDrafts.length} French draft posts\n`);
  
  // Step 3: Fetch published French posts
  console.log('3. Fetching published French posts...');
  const frPublished = await fetchData('blog_posts', '?select=id,slug,title&language=eq.fr&status=eq.published');
  console.log(`   Found ${frPublished.length} published French posts\n`);
  
  // Create a set of published French slugs for quick lookup
  const publishedFrSlugs = new Set(frPublished.map(p => p.slug));
  
  // Step 4-6: Match and publish
  console.log('4. Matching English posts with French drafts...\n');
  
  const matches = [];
  const noMatch = [];
  const alreadyPublished = [];
  
  for (const enPost of enPosts) {
    // Check if already has published French version
    const frSlug = enPost.slug; // Assuming same slug structure
    if (publishedFrSlugs.has(frSlug)) {
      alreadyPublished.push(enPost.slug);
      continue;
    }
    
    // Find best matching draft
    let bestMatch = null;
    let bestScore = 0;
    
    for (const draft of frDrafts) {
      const { score, topic } = calculateMatchScore(enPost, draft);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { draft, topic };
      }
    }
    
    if (bestMatch && bestScore >= 5) { // Minimum score threshold
      matches.push({
        enSlug: enPost.slug,
        enTitle: enPost.title,
        frId: bestMatch.draft.id,
        frSlug: bestMatch.draft.slug,
        frTitle: bestMatch.draft.title,
        score: bestScore,
        topic: bestMatch.topic
      });
    } else {
      noMatch.push({
        slug: enPost.slug,
        title: enPost.title
      });
    }
  }
  
  console.log(`   Matched ${matches.length} English posts to French drafts`);
  console.log(`   Already published: ${alreadyPublished.length}`);
  console.log(`   No match found: ${noMatch.length}\n`);
  
  // Show matches before publishing
  if (matches.length > 0) {
    console.log('=== Matches to be published ===');
    for (const match of matches) {
      console.log(`   EN: ${match.enSlug}`);
      console.log(`   FR: ${match.frSlug} (ID: ${match.frId})`);
      console.log(`   Topic: ${match.topic}, Score: ${match.score}`);
      console.log(`   Title: ${match.frTitle.substring(0, 60)}...`);
      console.log('');
    }
  }
  
  // Publish the matches
  console.log('5. Publishing matched drafts...\n');
  let publishedCount = 0;
  
  for (const match of matches) {
    try {
      await updatePostStatus(match.frId, 'published');
      publishedCount++;
      console.log(`   ✓ Published: ${match.frSlug}`);
    } catch (error) {
      console.log(`   ✗ Failed to publish ${match.frSlug}: ${error.message}`);
    }
  }
  
  console.log(`\n   Published ${publishedCount} posts\n`);
  
  // Step 7: Final count and report
  console.log('6. Verifying final count...');
  const finalFrPublished = await fetchData('blog_posts', '?select=id&language=eq.fr&status=eq.published');
  console.log(`   Total published French posts: ${finalFrPublished.length}\n`);
  
  console.log('=== SUMMARY ===');
  console.log(`Target: 61 published French posts`);
  console.log(`Current: ${finalFrPublished.length} published French posts`);
  console.log(`Previously published: ${frPublished.length}`);
  console.log(`Newly published: ${publishedCount}`);
  console.log(`Already had translation: ${alreadyPublished.length}`);
  console.log(`Still missing: ${noMatch.length}\n`);
  
  if (noMatch.length > 0) {
    console.log('=== English posts still without French translation ===');
    for (const post of noMatch) {
      console.log(`   - ${post.slug}`);
      console.log(`     ${post.title}`);
    }
  }
  
  if (finalFrPublished.length < 61) {
    console.log(`\n⚠️  Still need ${61 - finalFrPublished.length} more French posts to reach target of 61`);
  } else if (finalFrPublished.length === 61) {
    console.log(`\n✓ Target achieved! Exactly 61 French posts published.`);
  } else {
    console.log(`\n✓ Target exceeded! ${finalFrPublished.length} French posts published (target was 61).`);
  }
}

main().catch(console.error);
