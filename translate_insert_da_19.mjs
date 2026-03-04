import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: enPost } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue')
  .eq('language', 'en')
  .single();

const daSlug = 'saadan-arrangerer-du-et-middelalderborg-mordmysterium-regn-dit-rige-med-kongelig-intriger';
const daTitle = 'Sådan Arrangerer Du et Middelalderborg-Mordmysterium: Regn Dit Rige med Kongelig Intriger';
const daMetaDesc = 'Skab en episk middelalderborg-mordmysteriefest med komplet guide til at designe kongerig intriger, ridder-koder, og forræderiske sammensvorne. Trone-spil venter.';

const daContent = `*Udgivet: 16. februar 2026 | Opdateret: 20. februar 2026 | Forfatter: Mystery Maker Party Team | Næste gennemgang: 20. maj 2026*

*Baseret på analyse af mere end 10.000 mordmysteriefester og forskning i middelalderhistorie*

## Middelalder-Mordmysterier: Markedstendenser & Popularitet

Middelalder-temaer viser stærk kulturel appel:

| Statistik | Værdi | Kilde |
|-----------|-------|-------|
| Middelalder-tilpassnings marked | $2,8 mia. årligt (fester, renæssance-festivaler, SCA-events) | Medieval Recreation Market Analysis, 2024 |
| Fantasy-genre popularitet | 67% af voksne nyder middelalder-inspirerede fortællinger (bøger, film, spil) | Publishing Industry Research, 2024 |
| Tematiske spiseoplevelser | 89% stigning i middelalder-banket restaurants (2019-2024) | National Restaurant Association, 2024 |
| Historisk genindføring deltagelse | 2,3M+ mennesker deltar årligt i middelalder-events i USA alene | Society for Creative Anachronism / Event Data, 2024 |

> "Middelalder-periode fascinerer, fordi den repræsenterer en tid med klart definerede sociale strukturer, men også enorm social mobilitet gennem list, mod, og strategi. Det perfekte fundament for intriger-baseret fortælling." - Dr. Helen Castor, Middelalder Historiker og Forfatter (2023)

Drømmer du om ridder i rustning, kongelige sammensvorne, og slot-intriger? En middelalderborg-mordmysteriefest fordyber dine gæster i en verden af herskere og vasaller, ridderkodekser og forræderiske plots. Fra tronsale til banket-sale får du denne komplette guide til at arrangere en kongelig fest værdigt for historiens annaler.

**Læsetid: 14 minutter**

## Vælg Din Middelalder-Setting

### Option 1: Royal Court Intriger

**Setting:** Kongens eller dronningens slot, en stor fest eller banket

**Karakterer:**
- Kongen/Dronningen (hersker)
- Prinser og prinsesser (arvekonkurrenter)
- Hertuger, jarler, baronier (adelige med magt)
- Kongerådsmedlemmer
- Riddere og kampioner
- Præster eller kirkelige rådgivere
- Hofdamer og attendants
- Court jester eller entertainer
- Ambassadører fra fremmede lande

**Centrale Konflikter:**
- Succession-kriser (hvem arver tronen?)
- Politiske alliancer og forræderi
- Territorial disputes
- Religiøse konflikter
- Romantiske intriger og skandaler

**Historical Inspiration:** English Wars of the Roses, French Court of Louis XI, Byzantine Court intriger

### Option 2: Knight's Tournament Drama

**Setting:** En stor tournament, med lodging i borg

**Karakterer:**
- Competing riddere fra forskellige familier
- Squires og attendants
- Tournament sponsors (adelige herskere)
- Judges og heralds
- Ladies tilbyde tokens eller favors
- Våbenhandlere og armorers
- Traveling minstrels
- Spies fra rival kongeriger

**Centrale Konflikter:**
- Rival ridder-familier
- Romantiske trekantsforhold (ridder konkurrerende for lady's favør)
- Sabotage af våben eller armor
- Political stakes (vinderen får land, title, giftermål)
- Gamble-gæld og svindel

**Historical Inspiration:** Tournament tradition fra 11.-15. århundrede, Richard Lionheart-era, jousting culture

### Option 3: Border Castle Under Siege

**Setting:** En grænse-borg truet af fjendtlige kræfter

**Karakterer:**
- Castle castellan (administrator)
- Militære captains
- Soldiers og guards
- Refuges fra nærliggende landsbyer
- Suspected spies eller forræderere
- Supply merchants
- Wounded knights
- Religiøse figurer tilbyde spirituel guidance

**Centrale Konflikter:**
- Mistanke om forræderere blandt defenderes
- Resourcer-mangel (mad, våben)
- Command-disputes
- Alliances med usikre loyaliteter
- Desperationen af prolonged siege

**Historical Inspiration:** Hundred Years' War sieges, Crusader castles, Scottish border konflikter

## Design Dine Middelalder-Karakterer

### Principper for Character-Skabelse

**1. Sociale Hierarki er Built-In**

Middelalder-samfund havde stiv class-struktur:

**Royalty (Kongen/Dronningen, Prinser/Prinsesser):**
- Højeste magt og privilège
- *Motiver:* Bevare magt, sikre succession, eliminere trusler

**Høj Adelige (Hertuger, Jarler, Grever):**
- Besidder land og armier
- *Motiver:* Øge indflydelse, skifte loyaliteter, erobre territory

**Lesser Nobility (Baronier, Riddere):**
- Tjener higher lords men har egen ambition
- *Motiver:* Rise i status, vinde land eller titler, sikre giftermål

**Clerical (Bisper, Abbots, Præster):**
- Religiøs autoritet og politisk indflydelse
- *Motiver:* Kontrollere spirituel magt, akkumulere rigdom, påvirke policy

**Common Folk (Squires, Tjenster, Merchants):**
- Ofte overser men ser og hører alt
- *Motiver:* Overleve, beskytte familie, stikke opportunities for advancement

### Skab Motiver fra Historisk Realiteter

**Succession Konflikter:**
- Primogenitur (først-fødte son arver) skabte jalousi blandt yngre søskende
- Kvindelige arvesætter ofte passeret over, skabte bitterness
- Illegitimate børn kæmpede for anerkendelse

**Land og Resources:**
- Land var magt og wealth i middelalderen
- Giftermål var politiske alliancer ikke romantik
- Kontrol af handelsveje eller resources (salter, ores) var vital

**Hænge og Loyalitet:**
- Personlig hængdes til lords kunne kollidere med kingdom-loyalitet
- Forræderere kunne købes eller presses
- Family forbindelser complicerede alliancer

**Religiøs Magt:**
- Kirken havde enorm indflydelse
- Excommunication var en frygtelig trussel
- Religious relics og authority gav legitimitet

### Eksempel Karaktersæt: "Døden ved Duke's Banket"

**Ofret:** **Lord Reginald the Bold**, en powerful duke kontrollere strategisk region

**Mistænkte:**

1. **King Edward the Stern**
   - *Hemmeligt:* Lord Reginald discovered kongen's illegitimate son og truede at støtte rivalkrav til tronen
   - *Motiv:* Beskytte tronen for sin legitimate heir

2. **Prince Thomas** (King's son og heir)
   - *Hemmeligt:* Lord Reginald kendte til prinset's hemmelige giftermål til en commoner
   - *Motiv:* Forhindre skandale der kunne diskvalificere ham fra succession

3. **Lady Catherine de Montfort** (Duke's widow)
   - *Hemmeligt:* Havde en affære med Bishop Aldric; Duke var ved at understøtte hende
   - *Motiv:* Frihed til at giftes med elsket og beholde hendes dower lands

4. **Sir William the Black Knight**
   - *Hemmeligt:* Lord Reginald cheated i tidligere tournament, ruinering Sir William's reputation
   - *Motiv:* Hævn og restaureret hænge

5. **Bishop Aldric**
   - *Hemmeligt:* Lover til Lady Catherine; også embezzled church-fonds med Duke's vidende
   - *Motiv:* Være fri af blackmail-trussel og vinne Lady Catherine

6. **Baron Henry of Ashford** (Rival noble)
   - *Hemmeligt:* Ville arve Duke's lands hvis succession linie failed
   - *Motiv:* Ekspandere territory og magt

7. **Sir Geoffrey the Loyal** (Duke's mest trusted knight)
   - *Hemmeligt:* Følte forrådt efter Duke refuserede hans søster's giftermålsanmodning til en wealthy merchant
   - *Motiv:* Familieære og økonomisk nødvendighed

8. **Isabelle the Minstrel**
   - *Hemmeligt:* Faktisk en spy fra rival kingdom; Duke opdagede hendes identitet
   - *Motiv:* Selvforsvar (Duke ville execute hende)

## Craft Din Middelalder-Handling

### Structure Through Medieval Events

**Phase 1: The Grand Feast (20-30 min)**

Åbn med a ceremoniel banket:

*Eksempel Åbning:*
> "My lords og ladies! Velkommen til Castle Blackmoor for det års Grand Banket i honor af Our Gracious Sovereign, King Edward! Let feasting begynde og alle rivalries pauseres under Truce of the Table. May this night bring... (trumpet interrupts) What news, herald? ...Nej. Lord Reginald the Bold er blevet fundet i North Tower... død. Guards, seal gatesne. INGEN forlade før sandheden er uncovered!"

**Phase 2: The Investigation "Quest" (45-60 min)**

Frame efterforskningen som en quest:

*Herald announces:*
> "Hans Majestæt kommanderer, at alle med information kommer freward! Den King's Justice vil blive served. Du have til midnatsklokken ringe til at uncover morderen, eller ALLE skal være mistænkte i kongens øjne!"

**Middelalder-Specifikke Ledtråd:**
- Seals og voksfragmenter på hemmeligheder-breve
- Våbenfragmenter (dagger-pommel, arrow-feathers matching specific heraldry)
- Fabric torn fra distinctive garments
- Religious artifacts (rosary beads, prayer book) left behind
- Witness accounts fra tjenster who "såg intet men hørte alt"
- Heraldry symbols linking karakterer til crimescenen

**Phase 3: The Trial by Accusation (20-30 min)**

Konkludere med medieval-stil offentlig accusation:

*Format:*
- Hver mistænke stand-før samling
- Præsentere deres defense
- Others kan challenge eller accuse
- King (eller senior noble) render final judgment
- Reveal true murderer

### Design Layered Intriger

Middelalder-mysterier fungere bedst med multiple overlappende plots:

**Central Mystery:** Hvem dræbte Lord Reginald?

**Subplot 1:** Succession krise - Prince Thomas's hemmelige giftermål
**Subplot 2:** Romantic triangle - Lady Catherine, Bishop Aldric, og Lord Reginald
**Subplot 3:** Political alliance - Baron Henry's land-grab scheme
**Subplot 4:** Espionage - Isabelle's spiemission
**Subplot 5:** Honor-dispute - Sir William's tournament-grudge

Hver subplot giver motiver og distractions, making mysteriet richer.

## Middelalder-Dekorationer og Castle Atmosphere

### Transform Din Space ind i a Medieval Castle

**Entry Område: The Castle Gates**

Sæt medievalen tone immediately:
- Arched dørvej (bygge med cardboard eller draperet fabric)
- Faux stone walls (gray-painted cardboard eller fabric)
- Torcher (battery-operated flicker-candles i wall sconces)
- "Guards" ved entrance (early-ankommende gæster i costume)
- Welcome-banner med faux-medieval calligraphy

**Main Hall: The Great Banquet Hall**

**Væg Dekorationer:**
- Tapestries (inexpensive fabric med printed medieval scenes, eller DIY painted sheets)
- Heraldry banners og shields (printable templates, mounted på cardboard)
- Faux stone eller brick wallpaper/fabric
- Crossed swords eller axes on walls (foam eller plastic)
- Family crest displays

**Ceiling Decorations:**
- Hængende banners i kongelige farver
- Fabric draped from ceiling til at skabe tent-like effect
- Iron chandelier (eller cheap black chandelier styled som medieval)

**Gulv og Seating:**
- Lang banket-style tables
- Wooden benches eller chairs covered med fabric
- "Rushes" på gulvet (høy eller straw-colored fabric) - optional og messy, kun hvis du er adventurous!

**Belysning:**
- Maksimere candles (battery-operated for safety)
- Dim overhead-lys for atmosfære
- Torc-style wall sconces
- Fireplace (real eller fake med flickering lights)

**Trone Område:**
- Elevated platform for kongen/dronningen
- Ornate chair draped med royal fabrics
- Banner bag tronen
- Guarding knights ved siden af

### Tablescapes og Servering

**Middelalder-Stil Tabel:**
- Heavy fabric table-runners (velvet-style eller burlap)
- Wooden trenchers eller platters (chargers)
- Goblets (metal-looking plastic cups)
- No forks! (Forks were ikke comum i Medieval Europa - brug knive og spoons, eller fingers!)
- Bread bowls eller træplatters som "plates"

**Centerpieces:**
- Candelabras med multiple-candles
- Fruit arrangements (apples, grapes, pears)
- Floral med dybe farver
- Faux legs of meat (hvis du er kreativ!)

**Navnekort:**
- Scroll-style med calligraphy
- Små heraldry shields
- "Seating ved Order of His Majesty"-framing

## Middelalder Kostumer: Dress-Code

### Kostume-Guidelines for Gæster

Giv specifikke men opnåelige vejledninger:

**For Royalty og Høj Nobility:**
- **Kvinder:** Lange kjoler (præferably med lange mouver, layered look), crowns eller circlets, rich colors (golds, reds, purples)
- **Mænd:** Tunik over pants, capes eller cloaks, crowns eller coronets, fancy belts

**For Riddere:**
- **Basic:** Tunik med cross or heraldry symbol, belt, stofører eller toy sword
- **Advanced:** Chainmail (køb costume chainmail), tabard, shield, helmet

**For Clergy:**
- Mørke robes (monk-style), crucifixes, rope belts, hoods

**For Ladies-in-Waiting og Court Attendants:**
- Simpel men elegant kjoler
- Headpieces (veils, circlets, eller flowers)
- Lys colors

**For Common Folk:**
- Enkle tunics og pants
- Earth tones (browns, greens, tans)
- Skørter for kvinder
- Linen-look fabrics

### Budget Kostume-Alternativer

**DIY Tunik:**
- Brug en oversized T-shirt
- Tilføj a belt at cinch waist
- Cut sleeves til at være loose eller add ribbons til at tie dem

**Crowns og Circlets:**
- Foam eller cardboard, covered med guld eller sølv folie
- Add faux gems (glue plastic jewels)
- Flower crowns for naturlig medieval look

**Heraldry:**
- Print heraldry designs
- Glue til a old shirt eller vest
- Opret unique family crests for hver karakter

## Middelalder-Mad og Drinks

### Autentisk Medieval Feast (Modernized)

**Appetizers: "Fyrste-Gang"**
- **Medieval Meat Pies:** Små hand-pies med beef eller pork
- **Cheese og Frugt-Servering:** Aged cheeses med grapes, apples, pears
- **Bread med Honey-Smør**
- **Pickled Vegetables**

**Main Course: "Konge-Gang"**
- **Roasted Meats:** Roast chicken, pork loin, eller beef
- **"Peasant Stew":** Hearty vegetable og meat stew serveret i bread bowls
- **Roasted Root Vegetables:** Carrots, parsnips, turnips
- **Barley eller Wheat Porridge/Risotto**

**Sides:**
- **Medieval Sallat:** Greens med vinegar og herb dressing
- **Braised Cabbage**
- **Bread Loaves** (served hele, guests rip stykker)

**Desserts: "Søde Efterlader"**
- **Honey Cakes**
- **Fruit Tarts**
- **Custards og Puddings**
- **Sugared Nuts**
- **Apple eller Pear Pastries**

### Drinks: Medieval-Style

**Alkoholisk:**
- **Mead (Honey Wine):** Autentisk middelalder drink
- **Red Wine:** Served i goblets
- **Ale:** Medieval-equivalent til beer
- **"Mulled Wine":** Warmed wine med spices (cinnamon, cloves)

**Non-Alkoholisk:**
- **Apple Cider**
- **Herbal Teas**
- **Honey-Lemonade**
- **Fruit-Infused Water** (medieval "fruit ales" approximation)

**Serving-Style:**
- Serve i pewter-stil eller wooden goblets
- Pitchers for communal-serving
- Tilbyde bread og cheese at "cleanse palate" mellem courses

## Aktiviteter og Underholdning

### Medieval Entertainment

**Minstrel Performance:**
- Hyr (eller få en talentfuld gæst til) perform medieval music på lute, flute, eller sing ballads
- Fortælle tales eller epic poems relateret til mysteriet

**Jester:**
- Komisk relief mellem intense efterforsknings-momenter
- Jonglering, jokes, fysisk comedy

**Dancing:**
- Simple middelalder-dances (YouTube har tutorials)
- Line-dances eller circle-dances gæster kan deltage i

**Contests og Challenges:**
- **"Joust":** Toy horses, gæster "joust" med pool noodles
- **Archery:** Nerf bows eller Velcro-dart målskydning
- **Sword Fighting:** Foam swords, simple duels
- **Riddles og Brain Teasers:** Medieval-themed

### Middelalder Oath-Ceremoni

Åbn eller lukke festen med en ceremony:

*Eksempel:*
> "All knights og nobles skal swear oath of truth før denne undersøgelse proceeds. Repeat efter mig: 'I swear på min hænge, før Gud og King, at tale sandheden this night, at uncover den, der har wronged Lord Reginald, and to uphold justice i dette realm.'"

Dette adds solemnity og forteller gæster med importance af efterforskningen.

## Facilitation: Running Din Middelalder-Fest

### Timeline Eksempel (3-Timer Fest)

**6:30 PM - Arrival og Greeting**
- Gæster ankomme, greeted ved "castle gates"
- Herald announces each guest som de enter ("Lord So-and-So of Such-and-Such!")
- Mingle med drinks

**7:00 PM - Opening Feast og Toasts**
- Alle seated for banket
- King (eller vært) delivers welcome
- Toasts til kingdom, honour, etc.

**7:30 PM - Murder Discovered**
- Midt i feast, servant rushes ind med news
- Dramatisk scene

**7:45 PM - Investigation Begins**
- Gæster free til at roam, interview, examine clues
- Minstrel spiller i baggrunden

**8:30 PM - Intermezzo og "New Evidence"**
- Herald announces new-discovered information
- Opfriskning af drinks og appetizerere

**8:45 PM - Continued Investigation**
- Mere intense interrogationer med ny info

**9:15 PM - Trial Accusations**
- Hver mistænke presentere defense
- Gruppe accusations

**9:45 PM - Verdict og Reveal**
- Kongen (eller vært) render judgment
- Sande morder revealed
- Kort epilogue om hvad happened til everyone

**10:00 PM - Dessert og Socializing**
- Relax out-of-character
- Desserter served
- Toast til den bedste detektiv eller roleplayer

### Værts-Tips

**Maintain Middelalder-Sprog:**

Brug period-appropriate (eller period-inspired) speech:
- "My lord/lady" i stedet for "hey you"
- "Pray tell" i stedet for "please tell me"
- "By mine honor" i stedet for "honestly"
- Formel "thee" og "thou" (optional - kan være confusing)

**Håndter Anachronisms Gracefully:**

Hvis nogen bryder period (mentions smartphones, etc.):
- Gently-redirect in-character: "My lord, I know not of this 'smart-phone' thou speakest of. Dost thou mean a herald?"
- Eller ignorere minor slips

**Embrace Dramatic-Stil:**

- Stor gestures og theatrical line-delivery
- Formale bowing og curtsying
- Physical placement-symbolism (højere-rang seated on platform)

## Variation og Skalering

### For Små Grupper (4-6)

- Fokuser på single-plot med few karakterer
- Court-intrigue-style med all high-nobility
- Simplified clue-system

### For Store Grupper (15-20)

- Multi-factioned-play (rival noble houses)
- Teams-investigating together
- Multiple-"castles" eller rum representerer forskellige-locations

### Familievennlig Versioner

- Tone ned political brutality og violence
- Fantasy-elements (drag dragons, wizards)
- "Mystery" i stedet for "murder" (hvem stjal Crown Jewels?)

### Adult Dark-Versioner

- Politiske coups og betrayal
- Kompleks romantisk/sexual intriger
- Rå historisk realism (class-oppression, religiøs forfølgelse)

## Din Kongelige Command

At arrangere en middelalderborg-mordmysteriefest immerserer dine gæster i en world af hænge, loyalty, intriger og strategi. Ved at låne fra historiens mest dramatiske period - hvor single-beslutninger kunne alter kingdoms og enkle rumors kunne starter-wars - skaber du a mystery worthy af episke ballader.

Vælg din setting. Design karakterer gennemsyret med den period's values og konflikter. Transform din space ind i a castle. Serv en feast worthy af kings. Og lad intrigen unfold.

Din næste fest kunne være den, hvor all feel som nobility - struggling for magt, navigating loyalties og uncovering secrets der kunne shake den realm.

**Klar til at claime din trone... eller solve-the-murder af den, der sit på det?** Vælg dine noble houses, forge dine alliancer og betrayals, og skab en nat af kongelige mysterier.

For tonight, du reigns over mysteriet.

---

*Denne guide er en del af vores omfattende Murder Mystery Party Planning-serie, baseret på analyse af 10.000+ vellykkede events og samarbejde med middelalder-historians og immersive entertainment professionelle.*`;

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

console.log('✅ 19/20: Danish translation inserted successfully');
console.log('Slug:', daSlug);
