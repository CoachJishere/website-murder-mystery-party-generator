import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  // Post 5: Fix Complex - Updated slug to avoid duplicate
  {
    title: "Sådan retter du alt for komplekse mordmysterier",
    slug: "saadan-retter-du-komplekse-mordmysterier",
    meta_description: "Forenkl komplicerede mordmysterium fester, mens du bevarer intrige med strømlinede tilpassede plots og klare mål.",
    reading_time: null,
    content: `Vil du rette alt for komplekse mordmysterium fester, der overvælder i stedet for at engagere dine gæster? Lad os designe strømlinede mordmysterium oplevelser, der opretholder intriger uden at forvirre deltagerne. For at skabe effektive mordmysterier, der ikke er alt for komplekse, vil vi forenkle indviklede historielinjer, mens vi bevarer overbevisende drama, reducere karakterrelations-netværk til håndterbare niveauer, etablere klare efterforskningsmål, der guider i stedet for at forvirre gæster, og designe bevissystemer, der bygger naturligt mod tilfredsstillende konklusioner. Den vigtigste forskel mellem et komplekst mysterium og et overbevisende? **Strategisk forenkling, der får gæster til at føle sig brilliante for at løse gåder** i stedet for frustrerede af unødvendigt komplicerede scenarier fra ensrettede sæt, der prioriterer kompleksitet over klarhed og gæstetilfredshed. Klar til at forvandle dit alt for komplekse mordmysterium til en strømlinet oplevelse? Tid til at erstatte overvældende kompleksitet med elegant enkelhed.`
  },

  // Post 6: Masquerade
  {
    title: "5 maskerade bal mordmysterium temaer, der vil gøre dine gæster målløse",
    slug: "5-maskerade-bal-mordmysterium-temaer",
    meta_description: "Dans med fare ved elegante maskerade mordmysterium fester med skjulte identiteter og balsal-forræderi.",
    reading_time: 8,
    content: `Planlægger du en maskerade bal mordmysterium fest? Nøglen er at kombinere elegante skjulte identiteter med spændende efterforskning - hvor udsmykkede masker skjuler motiver, forklædte gæster bliver mistænkte, og identitetsafsløring skaber dramatiske detektiv-øjeblikke. Maskerade-settings tilbyder perfekte mysterieelementer: sofistikeret atmosfære, naturlig identitetsskjulning, teatralske karaktermuligheder og overbevisende plots. Klar til at designe dit perfekte maskerade mysterium?`
  },

  // Post 7: Zombie
  {
    title: "Sådan arrangerer du en zombieapokalypse mordmysterium, der får dine gæster til at kæmpe for overlevelse",
    slug: "saadan-arrangerer-du-zombieapokalypse-mordmysterium",
    meta_description: "Skab engagerende zombieapokalypse mordmysterium fester, der kombinerer overlevelsesrædsler med detektivarbejde.",
    reading_time: 9,
    content: `Vil du skabe en zombieapokalypse mordmysterium fest, der kombinerer overlevelsesrædsler med klassisk detektivarbejde? Nøglen er at balancere apokalypse-spænding med samarbejdende mysterieløsning, hvor gæster skal afdække mord, mens de håndterer ressourcer og zombietrusler. Zombie-mysterier trives på hastværk - når karakterer angiveligt er barrikaderet mod zombiehorder, kan de ikke roligt diskutere spor over cocktails, hvilket tvinger strategisk efterforskning under pres. Klar til at bringe apokalypsen til dit næste arrangement?`
  },

  // Post 8: Medical Examiner
  {
    title: "Retsmediciner mordmysterium temaer: Forensiske eksperter løser dødbringende sager",
    slug: "retsmediciner-mordmysterium-temaer",
    meta_description: "Skab mordmysterier med retsmediciner-karakterer, der bruger forensisk ekspertise til at løse forbrydelser.",
    reading_time: 14,
    content: `Vil du have mordmysterier med retsmediciner-karakterer, der bringer forensisk ekspertise og videnskabelig præcision til efterforskninger? Lad os udforske, hvordan obduktionsfund, dødsårsagsanalyse og medicinsk viden skaber overbevisende mysterier, hvor videnskabelige beviser afslører sandheder, som vidner måske skjuler eller misforstår. Retsmediciner mysterier fungerer exceptionelt godt, fordi de forankrer efterforskninger i fysiske beviser og videnskabelig metodologi. Klar til at designe dit perfekte retsmediciner mysterium?`
  },

  // Post 9: Birthday
  {
    title: "Mordmysterium fest til fødselsdagsfejringer: Gør deres særlige dag uforglemmelig",
    slug: "mordmysterium-fest-til-fodselsdagsfejringer",
    meta_description: "Fejr endnu et år med uforglemmelige fødselsdag mordmysterium fester tilpasset til fødselaren.",
    reading_time: 9,
    content: `Planlægger du en fødselsdag mordmysterium fest? Nøglen er at gøre fødselaren til stjernen i deres egen detektivhistorie - hvor fejring og efterforskning smelter sammen, personlige interesser former temaet, og venner bliver mindeværdige karakterer, der løser mysterier designet omkring fødselarens liv. Fødselsdag mysterier tilbyder perfekte tilpasningsmuligheder: temaer, der afspejler personlige passioner, inside jokes vævet ind i beviser, karakterroller, der fejrer venskaber. Klar til at designe det perfekte fødselsdag mysterium?`
  },

  // Post 10: Underwater
  {
    title: "Unikke undervands mordmysterium plots, der vil slå bølger ved din fest",
    slug: "unikke-undervands-mordmysterium-plots",
    meta_description: "Dyk dybt med akvatiske mordmysterium eventyr med ubåde, havbiologer og oceaniske hemmeligheder.",
    reading_time: 9,
    content: `Planlægger du en undervands mordmysterium fest? Nøglen er at kombinere havvidenskabs intriger med klaustrofobisk spænding - hvor ubådsbesætninger bliver mistænkte, forskningsstationer skjuler dødbringende hemmeligheder, og havdybder skaber perfekt isolation for mord. Undervands settings tilbyder unikke mysterieelementer: naturlig indespærring, teknisk ekspertise, der skaber forskellige karakterer, overlevelsespres, der tilføjer hastværk, og den fascinerende verden, hvor videnskabelig opdagelse møder menneskelig ambition. Klar til at designe din perfekte undervands efterforskning?`
  }
];

async function insertPost(post, index) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        ...post,
        language: 'da',
        status: 'published'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Post ${index + 5} inserted successfully:`, data[0]?.id);
    console.log(`   Title: ${data[0]?.title}`);
    console.log(`   Slug: ${data[0]?.slug}\n`);
    return data[0];
  } catch (error) {
    console.error(`❌ Error inserting post ${index + 5}:`, error.message);
    throw error;
  }
}

async function insertAllPosts() {
  console.log('Starting insertion of remaining Danish posts 5-10...\n');

  for (let i = 0; i < posts.length; i++) {
    await insertPost(posts[i], i);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ All remaining posts (5-10) inserted successfully!');
}

insertAllPosts().catch(error => {
  console.error('\n❌ Batch insertion failed:', error);
  process.exit(1);
});
