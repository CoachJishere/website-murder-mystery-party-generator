import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: enPost } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'how-to-host-a-hollywood-murder-mystery-party')
  .eq('language', 'en')
  .single();

const daSlug = 'saadan-arrangerer-du-en-hollywood-mordmysteriefest';
const daTitle = 'Sådan Arrangerer Du en Hollywood-Mordmysteriefest';
const daMetaDesc = 'Skab en glamourøs Hollywood-mordmysteriefest med denne guide til at designe film noir intriger, skabe retro-stil, og inkludere klassiske Hollywood-karakterer. Rød løber-mord venter.';

const daContent = `*Udgivet: 16. februar 2026 | Opdateret: 20. februar 2026 | Forfatter: Mystery Maker Party Team | Næste gennemgang: 20. maj 2026*

*Baseret på analyse af mere end 10.000 mordmysteriefester og forskning i Hollywood's Gyldne Tidsalder*

## Hollywood-Mordmysterier: Markedstendenser & Popularitet

Film noir og classic Hollywood-temaer viser vedvarende appel:

| Statistik | Værdi | Kilde |
|-----------|-------|-------|
| Retro Hollywood-tematiseret events | 67% årlig vækst i 1940-50'er tema fester (2019-2024) | Eventbrite Trends Report, 2024 |
| Film noir kulturel indflydelse | 2,3M+ sociale medier-posts årligt med #FilmNoir | Social Media Analytics, 2024 |
| Classic Hollywood turisme | $892M årligt til Hollywood-tema attraktioner og tours | Los Angeles Tourism Board, 2024 |
| Vintage film genudvisninger | 145% stigning i klassiske Hollywood-filmfremvisninger (2020-2024) | Independent Cinema Alliance, 2024 |

> "Film noir's visuelle sprog - skygger, spejle, røg - skaber en verden, hvor moral er kompleks og alle gemmer hemmeligheder. Det perfekte fundament for mysterie-fortælling." - Dr. James Naremore, Film Scholar og forfatter til "More Than Night: Film Noir in Its Contexts" (2023)

Drømmer du om rød-løber-glamour, sort-hvid-cinematografi, og klassiske Hollywood-intriger? En Hollywood-mordmysteriefest bringer tinseltown's gyldne tidsalder til live med filmstjerne-drama, producentpolitik, og fatale femmes. Fra studiebaglot til premiereaften får du denne komplette guide til at arrangere en festival-værdig mordmysteriefest, der fortjener en Oscar.

**Læsetid: 13 minutter**

## Vælg Din Hollywood-Æra og Stil

### Option 1: Golden Age Hollywood (1930-1950'erne)

Klassisk Hollywood-glamour på sin højeste:

**Setting:** Film studio lot, premiereaften, eller eksklusiv Hollywood Hills-fest

**Karakterer:**
- Filmstjerner (leading men og ladies)
- Studieproducentere og executives
- Direktører og manuskriptforfattere
- Hollywood agenter og managers
- Gossip-columnister (baseret på Hedda Hopper, Louella Parsons)
- Stuntmænd og crews
- Aspirerende skuespillere og talentagenter

**Æstetik:**
- Art Deco design-elementer
- Guld og sølv farvepalet med sort hvid kontrast
- Elegant formel påklædning (smoking, glamourkjoler)
- Vintage filmudstyr som dekor
- Klassisk Hollywood-fotografier på vægge

**Kulturelle Referencer:**
- Studiokontroersystemet (actors var "ejet" af studier)
- The Hays Code (censorregler)
- Blacklist-perioden (politisk forfølgelse)
- Pressekat-og-mus med paparazzi

### Option 2: Film Noir Style (1940-50'erne)

Mørkere, grittier Hollywood med hård-kogt detektiv-vibe:

**Setting:** Smoky nightclub, privat efterforsknings kontor, eller neonblå byens baggade

**Karakterer:**
- Den hård-kogte detektiv (privatøje)
- Femme fatale (den mystiske kvinde)
- Korrupt politibetjent
- Falmet filmstjerne
- Gangster eller natklubejer
- Desperate manuskriptforfatter
- Tilsidesættet krimi-fotograf

**Æstetik:**
- Høj-kontrast sort-hvid belysning-stil
- Røggrenådede rum (falsk røg eller haze)
- Venetianske persienner skabende dramatiske skygger
- Neon-skilter og by-landskaber
- Trench coats, fedora hatter, og røde læber

**Noir-Elementer:**
- Moralsk tvetydighed (ingen er fuldstændig uskyldig eller skyldig)
- Komplekse flashback-strukturer
- Hård-kogt dialog med dobbelt-betydninger
- Skæbne og fatal destination-temaer

### Option 3: 1960-70'erne New Hollywood

Rebellerende, edgier Hollywood:

**Setting:** Counterkulturel filmfest, experimentel filmstudio, eller hippie-influeret Hollywood-fest

**Karakterer:**
- Unge maverickdirektører udfordrer systemet
- Modkultur-skuespillere
- Traditionelle Hollywood-executives kæmpe med ændring
- Dokumentarister
- Musik-supervisors og rock-stjerner crossover til film
- Revolutionsfilm-kritikere

**Æstetik:**
- Psychedelic farver eller mørkere, mere realistiske toner
- Hippie og mod-fashion (fringes, paisley, lange hår)
- Protestskilter og politisk art
- Super 8-film-projektorer
- Vintage film-posters fra æra

## Design Dine Hollywood-Karakterer

### Principper for Character-Skabelse

**1. Brug Klassiske Hollywood-Arketyper**

Klassisk Hollywood kom med indbyggede rolletyper, som alle genkender:

**The Leading Man:**
- Charmerende, håndsom, men skjuler hemmeligheder
- *Eksempel:* "Sterling Dashwood" - filmhjerte-tyvn nummer et ved boxoffice, men rygtvis involveret i skandaler

**The Femme Fatale:**
- Mystisk, sexappealerende, farlig
- *Eksempel:* "Vivienne Noir" - en rygende hot skuespillerinde kendt for at ødelægge karrierer og hjerter

**The Studio Mogul:**
- Magtfuld, hensynsløs, kontrollerende
- *Eksempel:* "Max Goldwyn" - studiebaas der ønsker at bevare absolut kontrol over hans stars

**The Gossip Columnist:**
- Kender alles hemmeligheder, bruger information som magt
- *Eksempel:* "Hedda Hatfield" - feared columnist der kan lave eller bryde karrierer med én artikel

**The Washed-Up Star:**
- Tidligere berømt, nu desperat for comeback
- *Eksempel:* "Gloria Swanson-Esque" - stjerne fra stumfilm-æraen kæmper med talkies

**The Aspiring Starlet:**
- Ambitiøs, desperate for success, villig til at gøre næsten hvad som helst
- *Eksempel:* "Daisy Newcomb" - nyuddannet fra Midtvesten med store Hollywood-drømme

**The Director:**
- Kunstnerisk vision sammenstødende med studiopolitik
- *Eksempel:* "Vincent Visionary" - auteur-direktør kæmpende for kreativ kontrol

**The Screenwriter:**
- Ofte undervurderet, bitter om ikke at få anerkendelse
- *Eksempel:* "Raymond Quill" - talentfuld forfatter hvis arbejde er stoppet eller crediteret til andre

### Tildel Motiver og Hemmeligheder

Hver karakter skal have:
- **Offentligt Persona:** Hvordan de virker til offentligheden
- **Hemmeligt:** Noget de desperat skjuler
- **Motiv:** Hvorfor de kunne ønske ofret død
- **Alibi:** Deres forklaring (måske løgnagtig) på deres placering på mordtiden

**Eksempel: Sterling Dashwood (The Leading Man)**

*Offentligt Persona:* Americas sweetheart - charmerende, patriotisk, familievenlig filmhjerte

*Hemmeligt:* Faktisk homoseksuel i en æra, hvor det ville ødelægge hans karriere. Tvunget ind i falsk giftermål af studiet. Officeren har oplysninger om hans sande forhold.

*Motiv:* Officeren truede med at "oute" ham, hvilket ville betyde karriere-ødelæggelse og mulig arrestering.

*Alibi:* Hævder han var ved en studiegang møde, men ingen kan bekræfte det.

## Skab Din Hollywood-Handling

### Vælg Dit Mord-Offer

**Option 1: The Studio Mogul**
- Magtfuld exec, der har kontrolleret/udnyttet alle
- *Motiver:* Karriere-undertrykkelse, økonomisk udnyttelse, personlig hævn, ønsker om studiokontrol

**Option 2: The Scandal-Ridden Star**
- Berømt skuespiller, der kender for mange hemmeligheder
- *Motiver:* Frygt for afsløring, jalousi, konkurrence, forræderi

**Option 3: The Powerful Gossip Columnist**
- Kontrollerer information og omdømme
- *Motiver:* At stoppe eksponering, hævn for ruinerede karrierer, konkurrerende gossip-skrivere

**Option 4: The Ruthless Agent**
- Manager der har dobbelt-krydset klienter
- *Motiver:* Økonomisk udnyttelse, stjålne opportunities, kontraktoverstyring

### Struturer Handlingen: Film-Inspireret

Låne fra klassiske Hollywood-fortællestrukturer:

**Struktur 1: The Flashback-Struktur (Film Noir Style)**

Åbn med kroppen opdaget, derefter fortælle historien i flashbacks:

*Åbning:*
> "Dame og herrer, velkommen til World Premiere of 'Shadows of Sunset.' Men før filmen starter... var nogen set producer Victor Valentino? Hans sæde er tommet, og... vent, hvad er det for et skrig fra balkonen? Nej... nogen ring politiet! Victor Valentino er... dead!"

*Fortsæt:* Karakterer interviewer hinanden, hver berette deres version af begivenheder førende op til mordet.

**Struktur 2: Three-Act Structure (Classic Hollywood)**

**Act 1: Opsætning (30 min)**
- Introduktion af karakterer ved en glamourøs Hollywood-begivenhed
- Etablering af relationer, rivaliseringer, spændinger
- Mord opdaget ved slutningen af Act 1

**Act 2: Konfrontation (60 min)**
- Efterforskning og interview
- Hemmeligheder begynder at unravel
- Midtvejs-vendepunkt: en sekundær afsløring eller twist

**Act 3: Opløsning (30 min)**
- Final konfrontationer
- Den sande morder afslører
- "Denouement" (løse ender)

**Struktur 3: Ensemble Cast (Robert Altman Style)**

Flere interlocking historier, der konvergerer:
- Gæster cirkulere mellem forskellige "scener" eller rum
- Hver rum repræsenterer en forskellige Hollywood-lokation (studiokontore, makeup-rum, filmsæt, premiere-lobby)
- Ledtråd spredt på tværs af alle lokationer

## Hollywood-Dekorationer og Set Design

### Skab Authentisk Hollywood-Atmosfære

**Entryway: The Red Carpet**

Sæt tonen straks:
- Rød løber (eller rød textil) førende til indgangen
- "Paparazzi"-station med fotografi-muligheder
- Velvet ropes og stanchions
- "Step and Repeat" baggrund med fiktive film-studielogoer
- "Fans" der råber (eller få early-gæster til at spille fans)

**Main Party Space: The Film Premiere eller Studio Lot**

**For Premiere-Tema:**
- Guld og sølv streamer og balloner
- Forstørrede vintage film-plakater på vægge
- "Marquee" skilter med falskt filmtitler
- Director chairs med karakter-navne
- Oscar-statuer (falske) som centerpieces eller trophies

**For Studio Lot-Tema:**
- "Filmselskaber"-skilter: Makeup, Wardrobe, Soundstage A, Director's Office
- Vintage film-udstyr (gammel kameraer, tripods, klapper)
- Lysskruer og spotlights (eller falske versioner)
- Grøn rum setup med mirrors og vanity belysning
- Film reels og scriptpages som decorationer

**Belysning: Film Noir Dramatik**

Skab stærkt kontrast belysning:
- Dimbar overhead belysning for mørke hjørner
- Spotlight visse områder (interrogation-stil)
- Venetian blinds foran windows til at kaste skygger
- Neon-skilter (batteriopereret) for farveaccenter
- Røggrenådet rum (fog maskine) for mystisk atmosfære

**Bordopsætning:**
- Sort hvid check eller solid sort textil
- Guld eller sølv chargers
- Vintage film reel eller oscar-figurene som centerpieces
- Navnekort designet som clapboards eller film strips
- Menu-kort formet som film scripts

## Kostumer: Dressing the Part

### Kostume-Guidelines for Gæster

**For Leading Ladies:**
- Lange, glamourkjoler i satin eller sequins
- Fuld makeup med røde læber og dramatiske øjne
- Forstyrrede bølger eller elegant updo
- Lange handsker, fancy accessories
- Faux fur stoles eller wraps

**For Leading Men:**
- Smoking eller formale suits (black tie)
- Crisp white skjorte, bow tie
- Slick-backed hår eller Brylcreem-stil
- Pocket squares, cufflinks
- Overvej fedora hatter for noir-stil

**For Film Noir Karakterer:**
- Trench coats for detektiver
- Tight-fitting dresses for femme fatales
- Fedora og tilted hatter
- Leather gloves
- Sunglasses (selv indendørs for cool noir-vibe)

**For Studio Executives:**
- Power suits (brede schouldre for mænd, skarpe skirts for kvinder)
- Expensive-looking accessories (ure, ties, broche)
- Cigars (falske) som props

**For Gossip Columnists:**
- Chic men professional outfits
- Notebook og pen som accessories
- Skarp accessories og kritiske udtrykninger
- Vintage telefonprop (optional)

### Kostume-Rental eller DIY

Hvis gæster ikke har vintage garderobe:

**Budget-Friendly Alternativer:**
- Thrift stores for vintage-style tøj
- Sorte cocktail-kjoler eller suits med tilføjet accessories
- DIY accessories: fjer boas, lange handsker, bow ties
- Hår og makeup bærer meget vægt - fokus på period-korrekte styles

**Rental-Muligheder:**
- Kostumeshops for formal vintage wear
- Tuxedo rentals for mænd
- Vintage shops for authentic stykker

## Hollywood-Mad og Drinks

### Classic Hollywood Glamour Menu

**Appetizerere: "Studio Commissary Starters"**
- **Starlet Canapes:** Smoked salmon på crackers
- **Leading Man Meatballs:** Mini meatballs i cocktail-sauce
- **Director's Cut Charcuterie:** Ost- og køds-servering
- **Casting Couch Crostini:** Assorted toppings på toasted brød

**Hovedrettere: "Tinseltown Entreés"**
- **Oscar-Worthy Prime Rib**
- **Golden Age Chicken:** Herb-roasted chicken
- **Film Noir Pasta:** Squid ink pasta (sort) eller fettuccine alfredo
- **Vegetarian Starlet:** Elegant vegetable wellington eller portobello stack

**Sider:**
- **Red Carpet Beets:** Roastede beets salat
- **Silver Screen Potatoes:** Garlic mashed potatoes
- **Premiere Night Greens:** Friske salat med citrus vinaigrette

**Desserter: "Closing Credits Sweets"**
- **Oscar Statue Cakes:** Små cakes formed eller decorated som statues
- **Film Reel Cookies:** Runde cookies med "holes" som film reels
- **Noir Chocolate Mousse:** Rich mørk chocolate
- **Hollywood Hills Cupcakes:** Glamorous frosted cupcakes

### Signature Hollywood Cocktails

**"The Silver Screen"** (hvid/sølv cocktail)
- Gin, elderflower liqueur, prosecco
- Ædelig sølv glimmer
- Serveret i coupe-glas

**"Femme Fatale"** (rød cocktail)
- Vodka, cranberry, St. Germain
- Rim med rød sukker
- Garnering med cherry

**"Film Noir"** (sort cocktail)
- Bourbon eller whiskey
- Activated charcoal eller squid ink for farve
- Smoky garnering (optional røgglas)

**"The Leading Man"** (classic martini)
- Gin eller vodka, dry vermouth
- Oliven eller lemon twist
- Serveret ultra-koldt

**"Paparazzi Flash"** (sparkling cocktail)
- Champagne
- Splash af peach schnapps
- Ædelig guld glimmer

**Non-Alkoholisk:**
- **"Starlet Sparkle":** Sparkling cider med frugtjuicer
- **"Director's Vise":** Iste med lemonade og friske urter
- **"Vintage Cola Float":** Root beer eller cola med vanilla iscream

## Ledtråd og Beviser: Hollywood-Style

### Klassiske Hollywood-Inspiredde Ledtråd

**Fysiske Beviser:**
- **Autograferet Fotografi:** Med passende skadende besked på bagsiden
- **Film Script-Sider:** Highlightede eller annoterede scener der afslører motiver
- **Contracte og Aftaler:** Juridiske dokumenter viser studio-dobbelt-krydsning
- **Gossip Column Klips:** Avisartikler der afslører skandaler
- **Telegram eller Notater:** Truende beskeder
- **Kostume-Pieces:** En tabt glove, knap, eller accessory ved crime-scenen
- **Film Reels:** "Missing footage" der indeholder kritiske information
- **Makeup og Props:** Rouge-flekket Kleenex, forgotten prop-våben

**Digitale eller Kreative Ledtråd:**
- **"Tape Recordings":** Audio-klip af conversations (spil på telefon eller speaker)
- **Fotografi-Negatives:** Holdede op til light for at afsløre skjulte scener
- **Studio Invoices:** Finansielle records viser udnyttelse eller blackmail
- **Call Sheets:** Dokumentere hvem var hvor på film sættet

### Fordeling af Ledtråd

**Metode 1: Rum-Baseret**

Hvis du har multiple rum:
- **Studio Office:** Kontrakter, finansielle records, casting-notes
- **Makeup Rum:** Personlige brev, diary-udgøelser, cosmetics som beviser
- **Filmsæt:** Props, script sider, call sheets
- **Premiere Lobby:** Gossip columns, fan beskeder, paparazzi fotos

**Metode 2: Tidsbaseret**

Distribuere nye ledtråd på intervaller:
- **7:00 PM:** Initial crime scene investigation
- **7:30 PM:** Studio-kontrakter afslører
- **8:00 PM:** Hemmeligheder gossip columns dukker op
- **8:30 PM:** Finansielle records bliver fundne
- **9:00 PM:** Final kritisk beviser appears

## Ekstra Hollywood-Touches

### Activities og Mini-Spil

**"Publicity Still" Photo Shoot:**
- Opsæt en professional-looking foto-baggrund
- Gæster tager "glamour shots" i character
- Brug som ice-breaker ved ankomst

**Script-Read:**
- Skrive en kort "scene" indføre mord eller offer
- Have select karakterer performe det live
- Sæt stage og dramakontekst

**Awards Ceremony:**
- Slut aftenen med "The Mystery Awards"
- Kategorier: Best Performance, Best Detective, Most Glamorous, Most Suspicious
- Præsenter lille "Oscar"-trofies eller certificates

### Atmosfæriske Elementer

**Music Playlist:**

**Før Mord (Glamour and Elegance):**
- Frank Sinatra - "Fly Me to the Moon"
- Ella Fitzgerald - "Summertime"
- Dean Martin - "That's Amore"
- Nat King Cole - "Unforgettable"

**Under Efterforskning (Noir og Suspense):**
- Film noir soundtrack musik
- Bernard Herrmann scores
- Jazz med saxaphone og bass
- Muted trumpet noir-standards

**Film Noir Touches:**
- Vise classic film noir clips på loop (stummet) på en skærm
- Virkelige filmplakater fra 1940-50'erne
- Vintage Hollywood fan-magasiner (efterligne)

## Facilitate Your Hollywood-Fest: Timeline Eksempel

### 3-Timer Hollywood Premiere Mord-Mysterium

**6:30 PM - Red Carpet Ankomster**
- Gæster ankommer i glamour-kostumet
- "Paparazzi" tager fotos
- Signatur cocktails serveret
- Karakterer mingel og introduktion

**7:00 PM - Premiere "Begynder" & Mord Opdages**
- Værten (som Studio President eller Event Emcee) byder velkommen
- Lige før filmen "starter", opdages kroppen
- Dramatisk afsløring og reaktioner

**7:15 PM - Efterforskning Act 1**
- Gæster interview hinanden
- Undersøg initial ledtråd
- Appetizer buffet åben

**8:00 PM - Middag & Midt-Film "Plot Twist"**
- Formal seated middag
- Halvvejs gennem, new kritiske information afslører (gossip columniste stands up og læser exposé, eller detective ankommer med update)

**8:45 PM - Efterforskning Act 2**
- Med ny information, gæster dig dipper ind i efterforskning
- Flere konfronterende samtaler

**9:15 PM - Final "Scene" og Afsløring**
- Karakterer præsentere deres accusations
- Gruppe-afstemning
- Værten afslører den sande historie og morder

**9:45 PM - Dessert og "After-Party"**
- Relax ude af karakter
- Servere Hollywood-themed dessertere
- Awards ceremony
- Fotos og memory-sharing

## Troubleshooting og Pro-Tips

### Håndterer Almindelige Udfordringer

**Udfordring: Gæster Usikre om Akkuratheden til Perioden**
- *Løsning:* Giv "Period Primer" dokument med slang, references, og kulturelle noter
- Inkluder "phrase cards" med period-korrekte speech ("That's swell!", "What's the big idea?", "Don't be a wet blanket!")

**Udfordring: Kostumer Alt For Dyret**
- *Løsning:* Fokus på KEY accessories frem for komplette outfits
- Giv budget-friendly rental eller DIY-ideer
- Offer at tilbringe low-cost accessories til gæster, der har brug for dem

**Udfordring: Kompleks Handling For Confusing**
- *Løsning:* Hold det simpelt - klassiske motiver (jalousi, greed, hævn)
- Giv hver karakter en "cheat sheet" sammenfattende deres nøgle-information
- Have vært eller "detective"-karakter summarize informationer periodeligt

**Udfordring: Energien Lagging Midtvejs**
- *Løsning:* Injicer en dramatisk new afsløring eller twist
- Have en plantede "papparazo" charge ind med en breaking story
- Show a kort film noir clip at re-inspire atmosfæren

### Pro Værts-Tips

**Læg-Om i Character:**
- Som værten, forblive i character som much som possible (Studio Præsident, Event Koordinator, Film Critic)
- Brug in-character announcements til at drive timing uden breaking illusion

**Sørg For Inklusivitet:**
- Par introverterede gæster med extroverted "scene partners"
- Give stillere karakterer critiske ledtråd de kan dele for at føle involveret
- Anerkend forskellige styles af participation (some vil dramatize, andre vil analize)

**Dokumenter The Night:**
- Udpeg someone som "Official Photographer" (kan være en karakter-rolle)
- Tag candid action shot og staged glamour fotos
- Skab en memory album efterfølgende

## Din Red Carpet Venter

At arrangere en Hollywood-mordmysteriefest dykker dine gæster ind i en verden af glamour, intriger, og klassisk film-magi. Ved at låne fra Hollywood's rigeste storytelling-traditioner - film noir's skygger, gyldne æras elegance, eller New Hollywood's rebellion - skaber du en oplevelse, der føles både nostalgisk og spændende.

Vælg din æra. Design dine karakterer med klassiske arketyper og moderne kompleksitet. Skab en autentisk setting gennem belysning, dekor, og musik. Klæd alle til nines. Og lad Hollywood-magien unfolde.

Din næste fest kunne være den, der får alle til at føle sig som filmstjerner - eller i det mindste som mistænkte i et Oscar-værdig mysterium.

**Klar til at rulle kameraer på din egen Hollywood-noir-forbrydelse?** Vælg dit offer, design dine skandaler, og skab en nat, hvor alle er både stjerner... og mistænkte.

Og klap! Det er a wrap... på mord.

---

*Denne guide er en del af vores omfattende Murder Mystery Party Planning-serie, baseret på analyse af 10.000+ vellykkede events og samarbejde med film historie-scholars og immersive entertainment professionelle.*`;

const { data, error } = await supabase
  .from('blog_posts')
  .insert({
    title: daTitle,
    slug: daSlug,
    content: daContent,
    meta_description: daMetaDesc,
    language: 'da',
    published_at: enPost.published_at,
    updated_at: enPost.updated_at
  })
  .select();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ 18/20: Danish translation inserted successfully');
console.log('Slug:', daSlug);
