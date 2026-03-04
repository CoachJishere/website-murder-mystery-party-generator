import fs from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const translations = [
  {
    sourceFile: 'how-to-fix-boring-murder-mystery-parties.json',
    title: 'Hoe Saaie Murder Mystery Feesten Te Repareren: Transformeer Uw Evenement',
    slug: 'hoe-saaie-murder-mystery-feesten-te-repareren',
    meta_description: 'Transform saaie murder mystery parties met betere personages, dynamische aanwijzingen en boeiende gameplay strategieën.',
  },
  {
    sourceFile: '5-haunted-mansion-murder-mystery-themes.json',
    title: '5 Haunted Mansion Murder Mystery Themas Die Uw Gasten Laten Rillen',
    slug: '5-haunted-mansion-murder-mystery-themas',
    meta_description: 'Ontdek 5 spookhuis murder mystery themas met Victoriaanse gothic, spookjagers en vervloekte landgoederen voor uw feest.',
  },
  {
    sourceFile: 'how-to-fix-confusing-murder-mystery-clues.json',
    title: 'Hoe Verwarrende Murder Mystery Aanwijzingen Te Repareren',
    slug: 'hoe-verwarrende-murder-mystery-aanwijzingen-te-repareren',
    meta_description: 'Leer hoe u verwarrende aanwijzingen kunt transformeren naar heldere, logische hints die uw mystery spannend houden.',
  },
  {
    sourceFile: '5-renaissance-murder-mystery-party-themes.json',
    title: '5 Renaissance Murder Mystery Party Themas: Hof Intriges en Historisch Drama',
    slug: '5-renaissance-murder-mystery-party-themas',
    meta_description: 'Ontdek 5 Renaissance murder mystery themas met koninklijke hofintrige, Medicifamilies en artistieke rivalen.',
  },
  {
    sourceFile: 'how-to-host-a-space-station-murder-mystery.json',
    title: 'Hoe Een Space Station Murder Mystery Te Organiseren',
    slug: 'hoe-een-space-station-murder-mystery-te-organiseren',
    meta_description: 'Creëer een futuristische space station murder mystery met sci-fi personages, zero-gravity spanning en kosmische intriges.',
  },
  {
    sourceFile: 'innocent-bystander-murder-mystery-themes-wrong-place-wrong-t.json',
    title: 'Innocent Bystander Murder Mystery Themas: Verkeerde Plaats, Verkeerde Tijd',
    slug: 'innocent-bystander-murder-mystery-themas',
    meta_description: 'Exploreer onschuldige omstander murder mystery themas waar gewone mensen verstrikt raken in buitengewone misdaden.',
  },
  {
    sourceFile: 'murder-mystery-party-for-corporate-events.json',
    title: 'Murder Mystery Party voor Bedrijfsevenementen: Teambuilding Ontmoet Intriges',
    slug: 'murder-mystery-party-voor-bedrijfsevenementen',
    meta_description: 'Organiseer een corporate murder mystery party die teams samenbrengt via samenwerkende detective work en rollenspel.',
  },
  {
    sourceFile: 'how-to-fix-overly-complex-murder-mysteries.json',
    title: 'Hoe Te Complex Murder Mysteries Te Repareren',
    slug: 'hoe-te-complex-murder-mysteries-te-repareren',
    meta_description: 'Vereenvoudig te complexe murder mysteries met heldere verhaallijnen, gestroomlijnde aanwijzingen en betere pacing.',
  },
  {
    sourceFile: 'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-hav.json',
    title: 'Hoe Een Zombie Apocalypse Murder Mystery Te Organiseren',
    slug: 'hoe-een-zombie-apocalypse-murder-mystery-te-organiseren',
    meta_description: 'Creëer een spannende zombie apocalypse murder mystery waar gasten moeten overleven en mysteries oplossen.',
  },
  {
    sourceFile: 'murder-mystery-party-for-birthday-celebrations-make-their-sp.json',
    title: 'Murder Mystery Party voor Verjaardagen: Maak Hun Speciale Dag Onvergetelijk',
    slug: 'murder-mystery-party-voor-verjaardagen',
    meta_description: 'Plan een onvergetelijke verjaardag murder mystery party aangepast aan elke leeftijdsgroep en interesse.',
  },
  {
    sourceFile: 'how-to-fix-guests-breaking-character-keep-your-murder-myster.json',
    title: 'Hoe Gasten Die Uit Hun Rol Vallen Te Repareren',
    slug: 'hoe-gasten-die-uit-hun-rol-vallen-te-repareren',
    meta_description: 'Houd gasten in character met betere motivaties, regelmatige check-ins en immersive storytelling technieken.',
  },
  {
    sourceFile: 'murder-mystery-party-for-date-night-ideas-where-romance-meet.json',
    title: 'Murder Mystery Party voor Date Night: Waar Romance Intriges Ontmoet',
    slug: 'murder-mystery-party-voor-date-night',
    meta_description: 'Creëer een romantische murder mystery date night met intieme settings en couple-friendly gameplay.',
  },
  {
    sourceFile: 'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-.json',
    title: 'Hoe Onbevredigende Mystery Eindes Te Repareren',
    slug: 'hoe-onbevredigende-mystery-eindes-te-repareren',
    meta_description: 'Creëer bevredigende mystery onthullingen met logische oplossingen, emotionele impact en memorabele revelaties.',
  },
  {
    sourceFile: '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly.json',
    title: '5 Casino Murder Mystery Party Themas: Gooi De Dobbelstenen Op Dodelijke Drama',
    slug: '5-casino-murder-mystery-party-themas',
    meta_description: 'Ontdek 5 casino murder mystery themas met high-stakes poker, Vegas glamour en gevaarlijke gokken.',
  },
  {
    sourceFile: 'how-to-fix-guests-who-wont-participate-in-your-murder-myster.json',
    title: 'Hoe Gasten Die Niet Willen Deelnemen Te Motiveren',
    slug: 'hoe-gasten-die-niet-willen-deelnemen-te-motiveren',
    meta_description: 'Motiveer terughoudende gasten met low-pressure rollen, graduele betrokkenheid en inclusieve gameplay.',
  },
  {
    sourceFile: '5-mountain-lodge-murder-mystery-themes-that-will-make-your-r.json',
    title: '5 Mountain Lodge Murder Mystery Themas Voor Uw Retreat',
    slug: '5-mountain-lodge-murder-mystery-themas',
    meta_description: 'Ontdek 5 berghut murder mystery themas met geïsoleerde lodges, sneeuwstormen en afgezonderde spanning.',
  },
  {
    sourceFile: 'how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murd.json',
    title: 'Hoe Slechte Mystery Pacing Te Repareren',
    slug: 'hoe-slechte-mystery-pacing-te-repareren',
    meta_description: 'Master murder mystery timing met strategische aanwijzing releases, momentum building en perfecte onthullingstiming.',
  },
  {
    sourceFile: 'bookstore-murder-mystery-party-planning-turn-the-page-on-lit.json',
    title: 'Bookstore Murder Mystery Party Planning: Literaire Moord',
    slug: 'bookstore-murder-mystery-party-planning',
    meta_description: 'Plan een bookstore murder mystery met literaire personages, bibliofiel aanwijzingen en boekwinkel sfeer.',
  },
  {
    sourceFile: 'murder-mystery-party-for-dinner-parties-elevate-your-evening.json',
    title: 'Murder Mystery Party voor Diner Parties: Verhoog Uw Avond',
    slug: 'murder-mystery-party-voor-diner-parties',
    meta_description: 'Combineer fine dining met murder mystery voor een onvergetelijke culinaire detective ervaring.',
  },
  {
    sourceFile: 'how-to-fix-unrealistic-murder-mystery-plots-create-believabl.json',
    title: 'Hoe Onrealistische Murder Mystery Plots Te Repareren',
    slug: 'hoe-onrealistische-murder-mystery-plots-te-repareren',
    meta_description: 'Creëer geloofwaardige murder mystery plots met realistische motieven, logische progressie en authentieke personages.',
  },
  {
    sourceFile: 'spa-resort-murder-mystery-party-guide-relax-into-danger-and-.json',
    title: 'Spa Resort Murder Mystery Party Gids: Ontspan In Gevaar',
    slug: 'spa-resort-murder-mystery-party-gids',
    meta_description: 'Creëer een luxe spa resort murder mystery met wellness intriges, verwennerij en dodelijke geheimen.',
  },
  {
    sourceFile: 'murder-mystery-party-for-game-night-groups-transform-your-re.json',
    title: 'Murder Mystery Party voor Game Night Groups: Transform Uw Regelmatige Spelletjesavond',
    slug: 'murder-mystery-party-voor-game-night-groups',
    meta_description: 'Upgrade uw game night met een murder mystery party die strategisch denken en sociale deductie combineert.',
  }
];

async function insertPost(translation) {
  const sourcePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/translation-source/${translation.sourceFile}`;
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

  const postData = {
    ...source,
    title: translation.title,
    slug: translation.slug,
    meta_description: translation.meta_description,
    language: 'nl',
    status: 'published'
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`✗ Error inserting ${translation.slug}:`, error);
    return false;
  } else {
    const data = await response.json();
    console.log(`✓ Inserted: ${data[0].title}`);
    return true;
  }
}

let successCount = 0;
for (const translation of translations) {
  const success = await insertPost(translation);
  if (success) successCount++;
  await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
}

console.log(`\n=== Batch Complete: ${successCount}/${translations.length} posts inserted ===`);
