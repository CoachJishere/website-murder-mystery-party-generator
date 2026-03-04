import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const postsData = await readFile('batch3-sv-posts.json', 'utf-8');
const posts = JSON.parse(postsData);

const slugMappings = [
  {
    en: 'butler-murder-mystery-themes-manor-murders-household-secrets',
    sv: 'butler-mordmysterium-teman-herrgardsmordet-hushallshemligheter',
    num: 11
  },
  {
    en: 'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
    sv: 'koksmastare-mordmysterium-teman-kulinariska-brott-kokshemliigheter',
    num: 12
  },
  {
    en: 'creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party',
    sv: 'skapa-den-perfekta-detektiv-karaktar-guiden-design-overtygande-utredare-for-din-anpassade-mordmysteriefest',
    num: 13
  },
  {
    en: 'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
    sv: 'kryssningsfartyg-mordmysteriefest-guide-segla-ivag-for-mord-pa-oppna-havet',
    num: 14
  },
  {
    en: 'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
    sv: 'spokhotel-mordmysteriefest-guide-checka-in-till-skrack-och-spannings',
    num: 15
  }
];

const translationPrompt = `You are a professional Swedish translator specializing in event entertainment and murder mystery content.

TRANSLATION RULES:
1. Translate to formal, natural Swedish (not literal word-for-word)
2. Use proper Swedish grammar, word order, and characters (å, ä, ö)
3. Keep ALL markdown formatting exactly as is (headings, lists, tables, bold, italic)
4. Translate table headers and content
5. Keep | pipes for tables aligned
6. Change dates: "February 16, 2026" → "16 februari 2026", "May 20, 2026" → "20 maj 2026"
7. Change "Published" → "Publicerad", "Updated" → "Uppdaterad", "Author" → "Författare", "Next Review" → "Nästa granskning"
8. Change "Based on analyzing" → "Baserat på analys av"
9. DO NOT translate:
   - URLs
   - Proper names (unless commonly translated to Swedish)
   - Statistical numbers
   - Source citations

SWEDISH FORMAT:
- E-E-A-T: "*Publicerad: 16 februari 2026 | Uppdaterad: 20 februari 2026 | Författare: Mystery Maker Party Team | Nästa granskning: 20 maj 2026*"
- Research: "*Baserat på analys av över 10 000 mordmysteriefester och forskning om [topic]*"
- Table: "| Statistik | Värde | Källa |"

Translate COMPLETE content to Swedish:`;

console.log('🇸🇪 Starting full Swedish translations for posts 11-15...\n');

for (const mapping of slugMappings) {
  const post = posts.find(p => p.slug === mapping.en);
  
  if (!post) {
    console.error(`❌ Post not found: ${mapping.en}`);
    continue;
  }

  console.log(`\n📝 Translating ${mapping.num}/15: ${post.title.substring(0, 50)}...`);
  console.log(`   Length: ${post.content.length} chars`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: `${translationPrompt}\n\n---\n\n${post.content}`
      }]
    });

    const swedishContent = message.content[0].text;
    
    console.log(`   → Swedish: ${swedishContent.length} chars`);

    const { error } = await supabase
      .from('blog_posts')
      .update({ 
        content: swedishContent,
        updated_at: new Date().toISOString()
      })
      .eq('slug', mapping.sv)
      .eq('language', 'sv');

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ ${mapping.num}/15`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error(`   ❌ Translation error: ${error.message}`);
  }
}

console.log('\n\n✅ COMPLETE: All 5 Swedish posts translated (11-15/15)');
