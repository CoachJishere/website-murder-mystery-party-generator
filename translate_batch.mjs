import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const remainingSlugs = [
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
  '5-haunted-carnival-murder-mystery-themes-creepy-circus-adventures-for-unforgettable-parties',
  '5-haunted-mansion-murder-mystery-themes',
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
  '5-renaissance-murder-mystery-party-themes',
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'ancient-egypt-murder-mystery-party-guide',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
  'butler-murder-mystery-themes-manor-murders-household-secrets',
  'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
  'creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party',
  'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
  'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
  'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
  'how-to-host-a-fairy-garden-murder-mystery-whimsical-adventures-with-magical-creature-suspects',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
  'how-to-host-a-hollywood-murder-mystery-party',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'how-to-host-a-post-apocalyptic-murder-mystery-survive-the-wasteland-while-solving-murders',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
  'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
  'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
  'how-to-host-a-vampire-castle-murder-mystery-sink-your-teeth-into-immortal-intrigue',
  'how-to-host-a-victorian-murder-mystery-party',
  'how-to-host-a-witch-coven-murder-mystery-magical-adventures-with-supernatural-suspects',
  'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
  'how-to-host-a-zombie-wedding-murder-mystery-say-i-do-to-the-undead',
  'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime',
  'journalist-murder-mystery-themes-investigative-reporters-deadly-stories',
  'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
  'medical-examiner-murder-mystery-themes-forensic-investigations',
  'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable',
  'murder-mystery-party-for-corporate-events',
  'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery',
  'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night',
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue'
];

async function translatePost(slug, index, total) {
  try {
    // Get English post
    const { data: enPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();

    if (fetchError || !enPost) {
      console.error(`❌ ${index}/${total} - Failed to fetch: ${slug}`);
      return false;
    }

    // Translate with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `Translate this murder mystery blog post to Italian. Use formal "Lei", proper accents (à, è, é, ì, ò, ù).

IMPORTANT Italian format requirements:
- E-E-A-T: "*Pubblicato: 16 febbraio 2026 | Aggiornato: 20 febbraio 2026 | Autore: Team Mystery Maker Party | Prossima revisione: 20 maggio 2026*"
- Research citations: "*Basato sull'analisi di oltre 10.000 feste misteriose e ricerca su [theme]*"
- Table headers: "| Statistica | Valore | Fonte |"
- Reading time: "Tempo di lettura: X minuti"

Title: ${enPost.title}
Meta Description: ${enPost.meta_description}
Content:
${enPost.content}

Return JSON:
{
  "title": "Italian title",
  "slug": "italian-slug",
  "meta_description": "Italian meta description",
  "content": "Full Italian content"
}`
      }]
    });

    const translated = JSON.parse(message.content[0].text);

    // Insert Italian post
    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: translated.title,
        slug: translated.slug,
        content: translated.content,
        meta_description: translated.meta_description,
        language: 'it',
        category: enPost.category,
        featured_image: enPost.featured_image,
        author: enPost.author,
        published: enPost.published,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`❌ ${index}/${total} - Insert error:`, insertError.message);
      return false;
    }

    console.log(`✅ ${index}/${total} - ${slug}`);
    return true;

  } catch (error) {
    console.error(`❌ ${index}/${total} - Error: ${slug}`, error.message);
    return false;
  }
}

async function main() {
  console.log(`Starting translation of ${remainingSlugs.length} posts...\n`);
  
  let successCount = 0;
  const total = Math.min(40, remainingSlugs.length);
  
  for (let i = 0; i < total; i++) {
    const success = await translatePost(remainingSlugs[i], i + 1, total);
    if (success) successCount++;
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Completed: ${successCount}/${total} posts translated successfully`);
}

main();
