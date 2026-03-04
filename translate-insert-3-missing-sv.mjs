#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const POSTS_TO_TRANSLATE = [
  'how-to-fix-confusing-murder-mystery-clues',
  'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party',
  'how-to-fix-overly-complex-murder-mysteries'
];

async function fetchEnglishPost(slug) {
  const url = `${SUPABASE_URL}?slug=eq.${slug}&language=eq.en&status=eq.published&select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch post ${slug}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.length === 0) {
    throw new Error(`Post not found: ${slug}`);
  }

  return data[0];
}

async function checkSwedishExists(slug) {
  const svSlug = `${slug}-sv`;
  const url = `${SUPABASE_URL}?slug=eq.${svSlug}&select=id,slug`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to check Swedish post: ${response.statusText}`);
  }

  const data = await response.json();
  return data.length > 0;
}

async function translateToSwedish(text, context = '') {
  // This is a placeholder - in production, you would use a translation API
  // For now, I'll provide the translations directly in the script
  console.log(`[Translation needed for: ${context}]`);
  return text;
}

async function insertSwedishPost(post, translatedTitle, translatedContent, translatedMetaDescription) {
  const svSlug = `${post.slug}-sv`;

  const swedishPost = {
    title: translatedTitle,
    slug: svSlug,
    content: translatedContent,
    meta_description: translatedMetaDescription,
    language: 'sv',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: post.tags,
    theme: post.theme,
    featured_image_url: post.featured_image_url,
    published_at: new Date().toISOString()
  };

  const response = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(swedishPost)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert Swedish post: ${error}`);
  }

  return await response.json();
}

// Manual translations for the 3 posts
const TRANSLATIONS = {
  'how-to-fix-confusing-murder-mystery-clues': {
    title: 'Hur man fixar förvirrande ledtrådar i mordgåtan',
    meta_description: 'Lär dig hur du förhindrar att förvirrande ledtrådar förstör din mordgåtafest. Expertråd för att skapa tydliga, logiska ledtrådar som håller gästerna engagerade utan frustration.',
    content: `# Hur man fixar förvirrande ledtrådar i mordgåtan

Har dina gäster någonsin stirrat tomt på en ledtråd under din mordgåtafest, uppenbart förvirrade och frustrerade? Du är inte ensam. Förvirrande ledtrådar är ett av de vanligaste problemen som kan förvandla en spännande fest till en frustrerande upplevelse.

Den goda nyheten? Med rätt strategi kan du skapa ledtrådar som är utmanande men rättvisa, som håller gästerna engagerade utan att lämna dem vilsna. Låt oss dyka in i hur man fixar förvirrande ledtrådar och skapar en smidigare, roligare upplevelse för alla.

## Varför ledtrådar blir förvirrande

Innan vi dyker in i lösningar, låt oss förstå varför ledtrådar ofta blir förvirrande:

### För mycket information på en gång

När spelare överöses med information tidigt, kämpar de för att veta vad som är relevant. En typisk början på en mordgåta kan innehålla:
- 8-12 karaktärsbakgrunder
- Flera tidslinjor
- Dussintals relationer att spåra
- Flera potentiella motiv
- Olika bevis

Utan vägledning blir spelare överväldigade innan de ens börjar.

### Otydlig koppling mellan ledtrådar

Vissa ledtrådar pekar mot ett bevis, men sambandet mellan dem är inte uppenbart. Till exempel:
- En ledtråd nämner "en speciell doft"
- Ett annat bevis beskriver en parfymflaska
- Spelare kopplar inte de två tillsammans eftersom språket är olika

### Flera giltiga tolkningar

En ledtråd kan läsas på flera sätt, vilket leder till olika slutsatser:
- "Jag såg någon lämna biblioteket klockan midnatt" - var det offret eller mördaren?
- "Dokumentet undertecknades i hemlighet" - hemligt från vem?

### Tidsmässiga logikproblem

När tidslinjerna inte stämmer skapar det förvirring:
- Vittnesförklaringar som motsäger varandra
- Karaktärer som är på två ställen samtidigt
- Händelser som sker i omöjliga sekvenser

### Kulturella eller kunskapsantaganden

Ledtrådar som kräver specifik kunskap kan utesluta vissa spelare:
- Hänvisningar till obskyra historiska händelser
- Specialiserad yrkeskunskap
- Kulturella referenser som inte är universella

## Hur man identifierar problemledtrådar

Innan du kan fixa ledtrådar måste du identifiera vilka som orsakar problem. Här är hur:

### Testspela grundligt

Det bästa sättet att hitta förvirrande ledtrådar är att faktiskt spela igenom mysteriet:

1. **Genomför en provomgång**: Samla några vänner (inte din vanliga spelgrupp) och gör en fullständig genomspelning
2. **Observera utan att vägleda**: Motstå frestelsen att ge ledtrådar när spelare kämpar
3. **Anteckna förvirrningsmoment**: Markera exakt när och var spelare blir vilsna
4. **Tidmät varje del**: Spåra hur lång tid varje ledtråd tar att lösa

### Be om specifik feedback

Efter varje testomgång, fråga:
- "Vilka ledtrådar var mest förvirrande?"
- "Fanns det någon punkt där du kände dig helt vilsen?"
- "Vilken information önskar du att du haft tidigare?"
- "Fanns det några hopp i logiken du inte kunde följa?"

### Granska med färska ögon

Efter att ha skrivit ditt mysterium, lägg det åt sidan i några dagar. Kom sedan tillbaka och läs varje ledtråd som om du såg den för första gången:
- Är sambandet uppenbart?
- Skulle någon utan din kunskap förstå det?
- Finns det nödvändig kontext?

### Skapa en ledtrådskarta

Kartlägg visuellt hur ledtrådar kopplas samman:
1. Skriv varje ledtråd på ett kort eller post-it-lapp
2. Ordna dem i den ordning spelare hittar dem
3. Rita linjer mellan relaterade ledtrådar
4. Leta efter luckor eller svaga kopplingar

## Strategier för att fixa förvirrande ledtrådar

Nu när du har identifierat problemområden, här är hur du fixar dem:

### 1. Skapa en tydlig informationshierarki

Organisera information från mest till minst viktig:

**Dåligt exempel:**
"Doktor Matthews arriverade till festen klockan 20:00. Han hade på sig en marin kostym. Han studerade tillsammans med offret på Harvard. Hans fru kunde inte komma eftersom hon var sjuk. Han hade en diskussion med offret om en affärstransaktion för tre år sedan."

**Bättre exempel:**
"Doktor Matthews hade en hetsig dispyt med offret om pengar strax innan mordet. Vittnen hörde honom säga: 'Du är skyldig mig, och jag tänker få det jag förtjänar.' Dispyten rörde en affärstransaktion från tre år tillbaka."

Den andra versionen prioriterar det mest relevanta – motivet – och ger specifika detaljer utan onödig information.

### 2. Använd konsekvent språk

Håll terminologi enhetlig genom hela mysteriet:

**Dåligt exempel:**
- Ledtråd 1: "Ett glas fanns på skrivbordet"
- Ledtråd 2: "Det kristallklara kärlet innehöll gift"
- Ledtråd 3: "Dryckesartikeln testades för fingeravtryck"

**Bättre exempel:**
- Ledtråd 1: "Ett vinglas fanns på skrivbordet"
- Ledtråd 2: "Vinglaset innehöll spår av arsenik"
- Ledtråd 3: "Vinglaset hade offrets fingeravtryck plus en oidentifierad uppsättning"

### 3. Introducera information gradvis

Dela upp komplexa ledtrådar i mindre, smältbara stycken:

**Dåligt exempel (allt på en gång):**
"Doktor Matthews hade tillgång till gift genom sitt arbete, ett motiv relaterat till en dålig investering, möjlighet eftersom han var ensam med offret, och han ljög om sin vistelseort."

**Bättre exempel (gradvis avslöjande):**
- **Omgång 1**: "Doktor Matthews arbetade som farmaceut innan han blev läkare"
- **Omgång 2**: "Inventering av sjukhusförnödenheter visar att arsenik saknas"
- **Omgång 3**: "Finansiella register visar att Doktor Matthews förlorade $200,000 i en affär med offret"

### 4. Skapa tydliga beviskedjor

Säkerställ att varje ledtråd kopplar logiskt till nästa:

**Exempel på tydlig beviskedja:**
1. **Ledtråd A**: "En trasig vigselring hittades nära kroppen"
2. **Ledtråd B**: "Fru Blackwood bars vita märke där en ring brukade vara"
3. **Ledtråd C**: "En juvelerare bekräftar att han reparerade Fru Blackwoods ring förra veckan"
4. **Ledtråd D**: "Reparationen slutfördes inte - ringen lämnades aldrig tillbaka"

Varje stycke bygger naturligt på det föregående, vilket skapar en tydlig berättelse.

### 5. Lägg till bekräftelseledtrådar

När spelare gör framsteg, bekräfta deras resonemang med ytterligare bevis:

**Exempel:**
Om spelare börjar misstänka Doktor Matthews baserat på hans finansiella motiv, introducera en bekräftande ledtråd:
- "Ett vittne såg Doktor Matthews prata med offret aggressivt"
- "Offrets dagbok nämner: 'Orolig för Matthews' senaste beteende'"

Detta försäkrar spelarna att de är på rätt spår och hindrar dem från att tvivla på korrekt resonemang.

### 6. Eliminera dubbeltydig formulering

Omformulera ledtrådar som kan tolkas på flera sätt:

**Dåligt exempel:**
"Jag såg dem lämna tillsammans"

**Bättre exempel:**
"Jag såg Doktor Matthews och offret lämna biblioteket tillsammans klockan 23:45, gå mot trädgården"

Den andra versionen specificerar:
- Vilka "dem" är
- Varifrån de lämnade
- När de lämnade
- Vart de gick

### 7. Tillhandahåll referensmaterial

Hjälp spelare att hålla reda på information:

**Skapa ett karaktärsreferensblad:**
```
DOKTOR MATTHEWS
Roll: Läkare, f.d. affärspartner
Relation till offret: Tidigare affärspartner
Motiv: Förlorade $200,000 i dålig investering
Möjlighet: Ensam med offret 23:45-midnatt
Medel: Tillgång till gift genom sjukhusarbete
Alibi: Påstår att han var i sitt rum - obestyrt
```

**Skapa en tidslinje:**
```
20:00 - Gäster anländer
21:30 - Middag serveras
22:45 - Offret sist sett levande
23:45 - Doktor Matthews och offret lämnar biblioteket
Midnatt - Kropp upptäckt i trädgården
```

### 8. Använd visuella hjälpmedel

Vissa ledtrådar fungerar bättre visuellt:

**I stället för att beskriva:**
"Plantriturningen visar tre sovrumsfönster vända mot trädgården, två som vetter mot gatan, och ett mot bakgården. Biblioteket är mitt i huset."

**Tillhandahåll en enkel karta:**
[Inkludera en grundläggande ritning som visar rumslayout och relation]

### 9. Testa för logiska motsägelser

Granska varje kombination av ledtrådar för konflikter:

**Kontrollera:**
- Kan alla vittnesförklaringar vara sanna samtidigt?
- Överensstämmer tidslinjer över karaktärer?
- Är fysiska bevis möjliga givet lägena?
- Strider någon information mot etablerade fakta?

### 10. Skapa en "om de fastnar" ledtrådsbank

Förbered ytterligare ledtrådar du kan introducera om spelare är vilsna:

**Exempel:**
Om spelare inte kopplar samman giftledtråden, ha en backup redo:
- "Farmaciinventariet visar att arsenik beställdes förra veckan"
- "En vittnesutsaga nämner att de såg någon nära giftskåpet"
- "En receptbok med bokstavsmarkering för Arsenik hittades i Doktor Matthews rum"

## Skapa ett flöde av progressiv svårighet

En väldesignad mordgåta balanserar utmaning med tillgänglighet genom att gradvis öka komplexiteten:

### Tidig fas ledtrådar (Första 30 minuter)

**Mål:** Bygg förtroende och etablera grundläggande fakta

**Egenskaper:**
- Enkel att hitta
- Tydliga kopplingar
- Objektiv information
- Direkt relevant för fallet

**Exempel:**
- "Kroppen hittades i biblioteket klockan midnatt"
- "Offret dog av giftvergiftning"
- "Fyra människor var i huset när mordet inträffade"

### Mellanfas ledtrådar (30-60 minuter)

**Mål:** Börja integrera information och bygga misstänkta

**Egenskaper:**
- Kräver att koppla samman 2-3 informationsstycken
- Kan innehålla lite förledande information
- Börjar peka på motiv och möjligheter

**Exempel:**
- "Doktor Matthews ekonomiska register visar stora förluster"
- "Ett vittne hörde en dispyt mellan offret och en manlig röst"
- "Arsenikbehållaren på sjukhuset är tom"

### Sen fas ledtrådar (60+ minuter)

**Mål:** Tillhandahåll avgörande bevis för att lösa mysteriet

**Egenskaper:**
- Kräver syntes av flera ledtrådar
- Kan innehålla subtila detaljer
- Utesluter oskyldiga misstänkta
- Pekar definitivt på mördaren

**Exempel:**
- "Doktor Matthews fotavtryck matchar de som hittades nära kroppen"
- "Hans fingeravtryck på giftflaskan"
- "Ett vittne såg honom hälla något i offrets drink"

## Specialfall: Att hantera röda sillar

Röda sillar kan tillsätta djup, men måste hanteras försiktigt:

### När man använder röda sillar

**Bra användning:**
- Skapa flera rimliga misstänkta
- Lägga till komplexitet för erfarna spelare
- Göra lösningen mer tillfredsställande när den avslöjas

**Dålig användning:**
- Göra mysteriet omöjligt att lösa
- Frustrera spelare med irrelevant information
- Förlänga speltiden artificiellt

### Hur man designar effektiva röda sillar

**1. Gör dem plausibla men uteslutbara:**

En misstänkt kan ha motiv och möjlighet men sakna medel:
- "Fru Blackwood hatade offret (motiv) och var i närheten (möjlighet)"
- "Men hon har allergi mot kemikalier och skulle aldrig hantera gift (inget medel)"

**2. Använd dem för att avslöja karaktär:**

Röda sillar kan berika historien:
- "Lord Ashton låtsades vara rik men var i själva verket bankrutt"
- "Detta förklarar hans beteende men är inte relaterat till mordet"

**3. Lämna tydliga ledtrådar för uteslutning:**

**Exempel:**
- Rödhasselning: "Lady Pemberton hade blod på sin klänning"
- Uteslutningsledtråd: "Hon får ofta näsblod, bekräftat av vittnen"

**4. Begränsa antal:**

**Tumregel:**
- 4-6 spelare: Max 1 röd sill
- 8-10 spelare: Max 2 röda sillar
- 12+ spelare: Max 3 röda sillar

## Testa och förfina

När du har reviderat dina ledtrådar, testa igen:

### Genomför flera testomgångar

**Testa med olika grupper:**
- Erfarna mordgåtespelare
- Nybörjare
- Blandade erfarenhetsnivåer

**Spåra:**
- Hur lång tid tar det att lösa?
- Vilka ledtrådar orsakar fortfarande förvirring?
- Hitta spelare alla ledtrådar?
- Är lösningen tillfredsställande?

### Samla detaljerad feedback

**Fråga specifika frågor:**
- "Vilken ledtråd var mest användbar?"
- "Vilken var mest frustrerande?"
- "Fanns det en punkt där du kände dig vilsen?"
- "Vad fick dig att komma på svaret?"
- "Fanns det ledtrådar du aldrig använde?"

### Iterera baserat på data

**Analysera mönster:**
- Om flera grupper kämpar med samma ledtråd, skriv om den
- Om en ledtråd aldrig används, gör den mer framträdande eller ta bort den
- Om lösningen kommer för enkelt, lägg till komplexitet
- Om ingen löser det, förenkla kritiska ledtrådar

## Verkliga exempel: Före och efter

Låt oss se en komplett ledtrådssekvens förbättrad:

### Original (förvirrande) version

**Ledtråd 1:**
"Någon var i studion sen på kvällen. Olika människor såg olika saker. Lampan var på ibland."

**Ledtråd 2:**
"En behållare hittades. Den hade något i sig tidigare."

**Ledtråd 3:**
"Matthews hade pengar problem. Eller han kanske inte hade det. Hans företag har gjort transaktioner."

**Problem:**
- Otydligt språk
- Tvetydig information
- Inga specifika detaljer
- Ingen tydlig koppling

### Reviderad (tydlig) version

**Ledtråd 1:**
"Tre vittnen såg ljus i studion:
- 22:30: Fru Chen såg ljus
- 23:15: Herr Rodriguez såg att rummet var mörkt
- 23:45: Butler sawg ljus igen
Detta tyder på att någon var där två separata gånger."

**Ledtråd 2:**
"En arsenik-behållare hittades i Doktor Matthews väska. Behållaren är tom nu, men märkning visar att den innehöll 100mg - tillräckligt för att döda någon. Hennes fingeravtryck är de enda på behållaren."

**Ledtråd 3:**
"Bankhandlingar visar att Doktor Matthews företag förlorade $200,000 förra året i en investering med offret. E-postmeddelanden visar att hon bad offret om återbetalning flera gånger, med det sista meddelandet förra veckan som sa: 'Om du inte betalar tillbaka kommer jag att vidta åtgärder.'"

**Förbättringar:**
- Specifika tider och namn
- Exakta mängder och mätningar
- Tydliga implikationer
- Direkta beviskedjor

## Checklist: Är dina ledtrådar tydliga?

Använd denna checklista för varje ledtråd:

### Klarhet
- [ ] Kan ledtråden läsas endast på ett sätt?
- [ ] Är all nödvändig kontext tillhandahållen?
- [ ] Används konsekvent terminologi?
- [ ] Är specifika detaljer inkluderade (tider, platser, namn)?

### Relevans
- [ ] Framför ledtråden mysteriet?
- [ ] Kopplar den till minst en annan ledtråd?
- [ ] Är den nödvändig för lösningen?
- [ ] Tillför den värde till berättelsen?

### Tillgänglighet
- [ ] Kan spelare med olika bakgrunder förstå den?
- [ ] Kräver den ingen specialiserad kunskap?
- [ ] Är den fri från kulturella antaganden?
- [ ] Använder den enkelt språk?

### Timing
- [ ] Dyker den upp vid rätt tid i mysteriet?
- [ ] Bygger den på tidigare information?
- [ ] Är spelare redo för denna komplexitetsnivå?

### Integration
- [ ] Kopplar den logiskt till andra ledtrådar?
- [ ] Stöder den beviskedjan?
- [ ] Finns det inga motsägelser med annan information?

## Slutliga tankar

Att fixa förvirrande ledtrådar handlar om att respektera dina spelares tid och intelligens. Du vill att de ska känna sig smarta när de löser ditt mysterium, inte frustrerade av otydlig information.

Kom ihåg:

1. **Testa grundligt**: Inga mängder teori kan ersätta faktisk testning med riktiga spelare
2. **Var specifik**: Vaga ledtrådar skapar förvirring; specifika detaljer skapar klarhet
3. **Bygg gradvis**: Börja enkelt och öka komplexiteten
4. **Ge sammanhang**: Varje ledtråd ska kopplas till den större bilden
5. **Tillhandahåll hjälpmedel**: Referenser, kartor och tidslinjer hjälper spelare att organisera information
6. **Lyssna på feedback**: Dina testare berättar vad som fungerar och vad som inte gör det

Med dessa strategier skapar du ledtrådar som är utmanande men rättvisa, engagerande men inte överväldigande. Dina gäster kommer att lämna din fest och känna sig som de löste ett riktigt mysterium - istället för att de bara överlevde en förvirrande upplevelse.

Lycklig mysterieskapande!`
  },
  'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party': {
    title: 'Hur man får gäster som inte vill delta i din mordgåtafest',
    meta_description: 'Gäster som inte deltar kan förstöra din mordgåtafest. Upptäck beprövade strategier för att engagera även de mest motvilliga deltagarna och skapa en uppslukande upplevelse för alla.',
    content: `# Hur man får gäster som inte vill delta i din mordgåtafest

Du har planerat den perfekta mordgåtafesten. Mysteriet är spännande, karaktärerna är intressanta, och scenen är perfekt. Men när festen börjar står några gäster vid sidan och vägrar att engagera sig. De läser inte sina karaktärsinstruktioner, undviker rollspel, och drar helt enkelt inte sitt strå till stacken.

Det kan döda energin på din fest snabbare än du kan säga "Vem gjorde det?"

Den goda nyheten? Med rätt strategi kan du engagera även de mest motvilliga deltagarna. Låt oss utforska varför gäster inte deltar och, viktigast av allt, hur man får dem att engagera sig.

## Varför gäster inte deltar

Innan vi dyker in i lösningar måste vi förstå orsaken till motviljande:

### Rädsla för förlägenhet

**Rotorsak:** Många människor fruktar att se dåliga ut framför andra

**Vanliga tankar:**
- "Tänk om jag inte är bra på detta?"
- "Jag har aldrig gjort något sånt här förut"
- "Alla andra verkar veta vad de gör"
- "Jag vill inte vara i centrum"

**Tecken att se efter:**
- Undviker ögonkontakt
- Håller sig vid kanterna av rummet
- Ger korta, enkla svar när de tillfrågas
- Döljer sig i gruppdiskussioner

### Missförstånd om vad som förväntas

**Rotorsak:** De vet inte vad rollspel betyder i detta sammanhang

**Vanliga missförstånd:**
- De tror att de måste vara professionella skådespelare
- De tror att de måste memorera manus
- De tror att alla tittar och dömer deras prestation
- De förstår inte reglerna

**Tecken att se efter:**
- Uttryckliga utsagor som "Jag är ingen skådespelare"
- Överväldigande läsning av material utan att agera
- Frågor som "Vad ska jag säga exakt?"
- Väntar på att bli instruerad i varje steg

### Social ångest

**Rotorsak:** Interaktion med främlingar eller grupper känns överväldigande

**Vanliga utmaningar:**
- Känner inte alla väl
- Osäker på gruppdynamik
- Bekvämare med 1-mot-1-interaktioner
- Behöver tid att värma upp

**Tecken att se efter:**
- Klamrar sig till en känd person
- Stannar i hörn eller trånga utrymmen
- Uttrycker förtvivlan när de blir ensamma
- Slår på telefonen för bekvämlighet

### Personlighetsskillnader

**Rotorsak:** Inte alla är naturligt extroverta eller teatraliska

**Introverta kan:**
- Föredra att observera innan de deltar
- Känna sig uttröttade av intensiv social interaktion
- Behöva tystare, mer intima moment
- Bearbeta information internt innan de svarar

**Tecken att se efter:**
- Tar frekventa pauser från huvudgruppens aktivitet
- Lyssnar mer än de pratar
- Verkar fundersamma eller distraherade
- Föredrar små konversationer över stora gruppscener

### Förvirring om mysteriet

**Rotorsak:** Om de inte förstår mysteriet kan de inte effektivt delta

**Vanliga problem:**
- För mycket information på en gång
- Komplexa karaktärsbakgrunder
- Förvirrande ledtrådar
- Osäker på mål

**Tecken att se efter:**
- Frågar upprepade gånger om grundläggande information
- Verkar förlorad under diskussioner
- Ger inte relevant information när de uppmanas
- Stannar tyst när de uppmanas att dela

## Proaktiva strategier: Sätt upp alla för framgång

De bästa lösningarna börjar innan festen ens börjar:

### 1. Sätt förväntningar tidigt

**Skicka ut detaljerad information före festen:**

**I din inbjudan, inkludera:**
```
VIKTIG INFORMATION OM DIN KARAKTÄR

Du kommer att spela en karaktär i vår mordgåta! Här är vad det betyder:

- Du får en karaktärsbakgrund att läsa (10-15 minuter läsning)
- Du behöver inte memorera något - bara bekanta dig med din karaktär
- Det finns inget "rätt" sätt att spela - ha kul med det!
- Du kommer att prata med andra gäster i karaktär (ingen prestation inför publik)
- Målet är att ha roligt, inte att vara en professionell skådespelare

FÖRVÄNTNINGAR:
- Planera att stanna hela evenemanget (ungefär 3 timmar)
- Klä dig som din karaktär om du vill (valfritt men roligt!)
- Kom redo att interagera med andra gäster
- Var beredd på att utforska, ställa frågor och lösa mysteriet

VI HAR GJORT DET ENKELT:
- Alla karaktärsinstruktioner är tydliga och enkla att följa
- Du får ledtrådsblad att hjälpa dig följa med
- Jag kommer att guida alla genom varje steg
- Ingen kommer att sättas på plats eller uppmanas att "framträda"
```

**Varför detta fungerar:**
- Tar bort överraskningselementet
- Klargör förväntningar
- Lugnar vanliga farhågor
- Sätter en bekväm ton

### 2. Matcha karaktärer med personligheter

**Strategiskt val:**

**För introverta/blyga gäster:**
- Tilldela observatörskaraktärer (butler, sekreterare, bibliotekarie)
- Ge dem specifika jobb (anteckna ledtrådar, hantera bevis)
- Skapa karaktärer som kan vara tysta och fundersamma
- Tillhandahåll legitima skäl att lyssna mer än att prata

**Exempel:**
"Du är bibliotekarien. Din karaktär är naturligt reserverad och observant. Du har viktig information, men du delar den endast när du blir tillfrågad direkt eller när det passar logiskt."

**För extroverta/entusiastiska gäster:**
- Tilldela karaktärer i centrum (detektiv, partyvärd, dramatisk arvtagare)
- Ge dem anledningar att interagera med alla
- Skapa dynamiska karaktärer med stora personligheter
- Ge dem ledtrådar som kräver att dela information

**För nya spelare:**
- Undvik alltför komplexa karaktärer med flera hemligheter
- Ge enkla mål
- Tillhandahåll tydliga interaktionsanledningar
- Slå ihop dem med erfarna spelare

**För erfarna spelare:**
- Tilldela mördaren eller komplexa karaktärer
- Ge dem flera hemligheter att hantera
- Skapa utmaningar som kräver subtilitet
- Lita på att de hjälper nya spelare

### 3. Skapa en välkomnande miljö

**Fysisk utrymme:**

**Designa layouten för interaktion:**
- Undvik en enda stor cirkel (för skrämmande)
- Skapa flera samtalsutrymmen
- Sätt upp "stationärer" som uppmuntrar till rörelse
- Inkludera tysta utrymmen för läsning/reflektion

**Exempel på layout:**
```
HUVUDRUM (Social hub)
- Bekväma sittplatser
- Bevisplansch
- Misstänktlista

BIBLIOTEK (Tyst zon)
- Karaktärsinformation
- Ledtrådsmaterial
- Plats för privata samtal

TRÄDGÅRD/BALKONG (Omväxling)
- Färre människor
- Färsk luft
- Casual konversationer
```

**Atmosfär:**

**Från det ögonblick gäster anländer:**
- Hälsa alla entusiastiskt
- Introducera nyanlända till andra gäster
- Bryt isen innan mysteriet börjar
- Spela tematisk bakgrundsmusik (inte för högt)
- Erbjud drinkar/snacks omedelbart

### 4. Tillhandahåll tydlig vägledning

**Börja med en grundlig introduktion:**

**Din öppningsanförande (5-10 minuter):**

"Välkomna till Mystery Manor! Innan vi börjar, låt mig förklara exakt vad som kommer att hända ikväll:

**VAD VI GÖR:**
Ni kommer alla att spela en karaktär. Ett mord har ägt rum, och vi kommer att ta reda på vem som gjorde det.

**HUR DET FUNGERAR:**
1. Ni har redan fått er karaktärsinformation - ni behöver inte memorera den
2. När jag säger "börja" kommer ni att mingla och prata med varandra i karaktär
3. Ni kommer att dela ledtrådar, ställa frågor och försöka lista ut vem mördaren är
4. Det finns inga skriptmanus - säg bara vad som känns naturligt för er karaktär

**REGLER:**
- Håll er i karaktär medan ni pratar med andra
- Dela den information som står i era karaktärsinstruktioner
- Ni kan ljuga om ni vill - det är en del av spelet!
- Om ni är vilsna, fråga mig eller leta efter en ledtråd som ger vägledning

**TIDSLINJE:**
- 20:00-20:30: Mingel och börja utforska
- 20:30-21:00: Första ledtrådsavslöjandet
- 21:00-21:45: Fritt utforskande
- 21:45-22:00: Slutgissningar och avslöjande

**VIKTIGT:**
- Det finns inget "rätt" sätt att göra detta
- Målet är att ha roligt, inte vara perfekt
- Om ni inte vet vad ni ska göra, följ en annan karaktär runt en stund
- Jag kommer att ingripa om något inte går som det ska

Några frågor innan vi börjar?"

**Varför detta fungerar:**
- Tar bort mysteriet om vad som förväntas
- Ger en tydlig struktur
- Försäkrar nervösa deltagare
- Sätter en lekfull, lågtrycks-ton

### 5. Skapa strukturerade interaktioner

**I stället för "mingla fritt" (kan vara överväldigande):**

**Använd styrda aktiviteter:**

**Rundning 1: Snabbmöten (15 minuter)**
"Alla kommer att spendera 3 minuter med varje person i sitt tilldelade område. När timern går av, byter ni till nästa person."

**Fördelar:**
- Garanterar att alla pratar med alla
- Tidspress minskar onödigt prat
- Inget val om vem man ska närma sig
- Jämlika möjligheter för alla

**Omgång 2: Gruppfrågestund (20 minuter)**
"Nu kommer alla att samlas. Jag kommer att ställa frågor, och var och en kommer att svara i karaktär."

**Exempelfrågor:**
- "Var var du när mordet hände?"
- "Hur kände du offret?"
- "Har du märkt något ovanligt ikväll?"

**Fördelar:**
- Ger struktur
- Säkerställer att alla pratar
- Minskar pressen att initiera konversationer
- Låter tystare spelare delta i ett format de känner till

**Omgång 3: Detektivarbete (30 minuter)**
"Nu har ni fritt att utforska, men jag vill att alla hittar och pratar med minst tre andra karaktärer."

**Fördelar:**
- Mer frihet men fortfarande styrt
- Tydligt mål
- Byggt självförtroendet från tidigare ronder
- Gradvis övergång till fritt spel

## Strategier under evenemanget: Hantera motstånd

Även med perfekt förberedelse kan vissa gäster fortfarande hålla sig tillbaka. Här är hur man hanterar det i realtid:

### 1. Identifiera tecken tidigt

**Titta efter:**

**Fysisk positionering:**
- Gäster ensamma i hörn
- Dem som inte rör sig eller interagerar
- De som konstant håller sig med telefoner
- Gäster som lämnar rummet ofta

**Socialt beteende:**
- Svarar bara när de blir tillfrågade direkt
- Ger korta, enslaviga svar
- Undviker att göra ögonkontakt
- Verkar distraherade eller ointresserade

**Agera tidigt:**
Ju längre någon står utanför, desto svårare är det att få in dem.

### 2. Privata individuella ingripanden

**Närma dig diskret:**

**Dåligt exempel:**
"Hej alla! Låt oss se till att Sarah deltar!" (Offentligt förlägen)

**Bättre exempel:**
(Ta Sarah åt sidan privat)
"Hej Sarah, hur mår du? Följer du med? Jag märkte att du kanske känner dig lite osäker. Är det något jag kan hjälpa till med?"

**Upptäck grundorsaken:**

**Om de är förvirrade:**
"Låt mig snabbt gå igenom vad din karaktär vet och vad ditt mål är."

**Om de är nervösa:**
"Det är helt okej att känna sig nervös. Ingen bedömer - alla är upptagna med sina egna karaktärer. Vill du att jag introducerar dig till någon som har samma karaktärskoppling?"

**Om de är uttråkade:**
"Jag märker att du kanske inte är så engagerad. Skulle det vara mer intressant om du hade en specifik uppgift? Vad sägs om att du blir den som samlar in och organiserar alla ledtrådar?"

**Om de bara inte gillar rollspel:**
"Det är helt okej om rollspel inte är din grej. Vill du istället hjälpa till med logistik? Du kan hjälpa till att hålla reda på tiden, dela ut ledtrådar eller hantera bevisområdet."

### 3. Para ihop dem strategiskt

**Buddy-systemet:**

**Identifiera naturliga kopplingar:**
- Gäster som redan känner varandra
- Karaktärer med relaterade bakgrunder
- Kompletterande personligheter (introvert + extrovert)

**Skapa formella partnerskap:**
"Doktor Matthews och Detektiv Jones, era karaktärer arbetade tillsammans tidigare. Varför gör ni inte en gemensam undersökning?"

**Fördelar:**
- Tar bort pressen att hitta någon att prata med
- Skapar ansvarighet
- Tillhandahåller stöd
- Erbjuder en naturlig ursäkt för interaktion

### 4. Tilldela specifika uppgifter

**Ge konkreta ansvarsområden:**

**För den tysta personen:**
"Du är officiell anteckningsförare. Kan du dokumentera alla alibin vi hör? Vi behöver dig för att hålla allt organiserat."

**För den analytiska personen:**
"Kan du skapa en tidslinje av alla händelser? Vi behöver någon med uppmärksamhet på detaljer."

**För den sociala personen som inte deltar:**
"Kan du intervjua alla och rapportera tillbaka vad du lärde dig? Du är bra på att prata med människor."

**För den skeptiska personen:**
"Jag behöver någon att ifrågasätta alla. Kan du vara den som utmanar alibin och letar efter motsägelser?"

**Varför detta fungerar:**
- Ger ett mål
- Använder deras styrkor
- Får dem att känna sig behövda
- Kräver interaktion utan att kräva rollspel

### 5. Använd ledtrådar strategiskt

**Designa ledtrådar som kräver deltagande:**

**Personliga ledtrådar:**
"Denna ledtråd är bara för dig. Du måste bestämma om du vill dela den med gruppen eller hålla den hemlig."

**Fördelar:**
- Ger dem exklusiv information
- Skapar beslutsansvar
- Får dem att känna sig viktiga

**Interaktiva ledtrådar:**
"För att öppna detta kuvert måste två karaktärer samarbeta - Doktor Matthews och Lady Pemberton."

**Fördelar:**
- Tvingar till interaktion
- Skapar delade upplevelser
- Bygger allianser

**Fysiska ledtrådar:**
"Det finns gömda ledtrådar runt rummet. Målet är att alla hittar minst en."

**Fördelar:**
- Aktivitet utan rollspel
- Fysisk rörelse bryter isen
- Känsla av prestation

### 6. Justera mysteriet på språng

**Var flexibel:**

**Om engagemangsnivån är låg:**
- Förkorta fria utforskningssegment
- Lägg till fler strukturerade aktiviteter
- Introducera chockerande vändningar för att återaktivera intresse
- Påskynda tidslinjen för avslöjande

**Om vissa karaktärer ignoreras:**
- Skapa scener som kräver deras inblandning
- Ge dem avgörande information
- Knyt deras karaktär till större avslöjande

**Om folk är förvirrade:**
- Pausa och återsam nyckelfakta
- Förenkla komplexa ledtrådar
- Tillhandahåll ytterligare vägledning
- Erbjud spoiler för de som är helt vilsna

### 7. Erkänn och fira deltagande

**Positiv förstärkning:**

**Offentligt erkännande:**
"Wow, Doktor Matthews ställde precis en riktigt insiktsfull fråga!"

**Privat uppmuntran:**
(Till en tyst spelare efter att de delat något)
"Det var perfekt! Ser du hur det hjälpte gruppen att komma framåt?"

**Grupp high-fives:**
När gruppen gör framsteg: "Fantastiskt detektivarbete, alla! Vi kommer närmare!"

**Varför detta fungerar:**
- Bygger självförtroende
- Visar att deltagande uppskattas
- Uppmuntrar fortsatt engagemang
- Skapar positiva kopplingar

## Specialfall: Olika typer av motstånd

### Den öppet motvilliga gästen

**Scenario:** De sa outright "Jag vill inte göra detta" eller "Det här är dumt"

**Omedelbar respons:**
1. **Validera deras känslor:**
   "Jag förstår att detta kanske inte är din grej, och det är helt okej."

2. **Erbjud alternativ:**
   "Skulle du föredra att hjälpa till bakom kulisserna? Jag kan verkligen använda någon för att hantera musik, mat eller ledtrådutdelning."

3. **Ge en väg ut:**
   "Om du verkligen inte vill delta är det ok att bara mingla och hänga. Ingen press."

**Långsiktig strategi:**
- Tvinga dem inte - det gör alla obekväma
- Ge dem icke-rollspels-uppgifter
- Ibland kan de värmas upp när de ser att andra har kul
- Acceptera att vissa människor inte kommer att delta

### Den överväldigade gästen

**Scenario:** De vill delta men känner sig paralyserade av information eller förväntningar

**Omedelbar respons:**
1. **Förenkla deras roll:**
   "Glöm allt du läste. Det enda du behöver veta just nu är: du är en läkare, och du var i biblioteket vid mordtillfället. Det är allt."

2. **Tillhandahåll en enkel första åtgärd:**
   "Gå bara och presentera dig för två personer. Berätta ditt namn och vad du gör för att leva. Det är det."

3. **Bygga gradvis:**
   Efter första interaktion: "Bra jobbat! Nu försök fråga någon var de var när mordet hände."

**Långsiktig strategi:**
- Bryt ner i små steg
- Fira små vinster
- Bygg självförtroende gradvis
- Para ihop dem med en tålmodig, stödjande spelare

### Den distraherade gästen

**Scenario:** De är fysiskt närvarande men mentalt frånvarande (telefon, konversationer utanför karaktär)

**Omedelbar respons:**
1. **Fånga deras uppmärksamhet:**
   "Alex, jag behöver dig för något viktigt."

2. **Ge dem något omedelbart att göra:**
   "Kan du ta denna ledtråd och visa den för Doktor Matthews? Se vad han säger."

3. **Skapa brådska:**
   "Vi har bara 15 minuter kvar innan nästa stora avslöjande. Vi behöver alla för att lösa detta!"

**Långsiktig strategi:**
- Ge dem frekventa uppgifter
- Håll dem aktiva
- Sätt ihop dem med mycket engagerade spelare
- Skapa FOMO (fruktan att missa) genom spännande avslöjanden

### Den självmedvetna gästen

**Scenario:** De vill delta men är förlägen över sina rollspelsförmågor

**Omedelbar respons:**
1. **Normalisera osäkerhet:**
   "Nästan alla känner så i början. Det kommer kännas mer naturligt inom några minuter."

2. **Ge tillstånd att vara ofullkomlig:**
   "Det finns inget 'rätt' sätt att göra detta. Din tolkning är perfekt exakt som den är."

3. **Peka på andra:**
   "Ser du hur alla andra bara har det kul? Ingen bedömer någon."

**Långsiktig strategi:**
- Para ihop dem med icke-bedömande spelare
- Starta dem i låg-insatts-interaktioner
- Erkänn deras deltagande positivt
- Glid in avslappnat rollspel gradvis

## Skapande av en kultur av inkludering

Bortom individuella interventioner, skapa en övergripande atmosfär som uppmuntrar deltagande:

### 1. Sätt tonen från toppen

**Som värd modellerar du beteende:**

**Visa sårbarhet:**
"Jag ska vara ärlig, jag är lite nervös också! Men låt oss bara ha kul med det."

**Gör misstag med nåd:**
När du glömmer en detalj: "Hoppsan, glömde den delen! Ser ni, det är inga problem om man gör fel."

**Fira nybörjaråtgärder:**
När någon provar: "Jag älskar hur du tolkar din karaktär!"

**Var entusiastisk men inte skrämmande:**
Energi är smittsam, men överväldigande entusiasm kan skrämma bort blyga spelare.

### 2. Upprätthåll en dömande-fri zon

**Sätt tydliga förväntningar:**

"En viktig regel ikväll: Vi är alla här för att ha kul. Det finns inget 'rätt' sätt att spela din karaktär. Om någon försöker, uppmuntrar vi det. Inget hånande, inget utskrattande, inget kritiserande. Okej?"

**Ingrip omedelbart om någon är dömande:**

Om någon säger "Det är inte hur du ska spela den karaktären":
"Faktiskt, det finns inget 'ska'. Alla tolkning är giltig. Låt oss stödja varandras kreativitet."

### 3. Blanda erfarenhetsnivåer

**Jämn fördelning:**

**Gruppsammansättning:**
- 2-3 erfarna mordgåte-veteraner
- 3-4 människor som provat det en gång
- 2-3 totala nybörjare

**Fördelar:**
- Veteraner modellerar beteende
- Nybörjare känner sig inte ensamma
- Mellannivåspelare hjälper till att överbrygga klyftan

**Undvik:**
- Alla nybörjare (ingen att följa)
- Alla experter (kan vara skrämmande för några)

### 4. Erbjud olika deltagandenivåer

**Inte alla behöver delta på samma sätt:**

**Nivå 1: Observatör**
"Du kan bara titta på och lyssna. Dela information när du blir tillfrågad men inget tryck att söka upp interaktioner."

**Nivå 2: Deltagare**
"Engagera dig när det känns bekvämt. Dela ledtrådar, ställ frågor, men gå i din egen takt."

**Nivå 3: Full rollspel**
"Gå all-in på karaktären. Använd accenter, uttryck, dramatiska gester - ha kul med det!"

**Viktigt:**
Alla nivåer är giltiga. Kommunicera detta tydligt.

## Efter festen: Lär och förbättra

### 1. Samla in feedback

**Skicka en uppföljningsenkät:**

**Frågor att ställa:**
- Hur bekväm kände du dig med att delta? (1-10 skala)
- Vad kunde ha fått dig att känna dig mer bekväm?
- Var det något som hindrade dig från att delta fullt ut?
- Vad tyckte du bäst om?
- Vad skulle du ändra?

**Anonymitetsfråga:**
Några är mer ärliga om de kan svara anonymt.

### 2. Reflektera över vad som fungerade

**Analysera:**
- Vilka strategier fick icke-deltagare engagerade?
- Vilka karaktärer fungerade bäst för blyga gäster?
- Vilka aktiviteter hade högst deltagande?
- Vilka moment hade lägst engagemang?

### 3. Justera för nästa gång

**Baserat på feedback:**

**Om människor kände sig förvirrade:**
- Förenkla karaktärsbakgrunder
- Tillhandahåll tydligare instruktioner
- Skapa lättare att följa ledtrådar
- Lägg till mer struktur

**Om människor kände sig pressade:**
- Minska rollspelsförväntningar
- Erbjud fler icke-rollspels-uppgifter
- Skapa fler tysta tidsperioder
- Ge mer valfri vs obligatorisk aktivitet

**Om människor kände sig uttråkade:**
- Öka tempot
- Lägg till fler överraskningar
- Skapa mer dynamisk interaktion
- Förkorta den totala längden

## Checklista: Maximera deltagande

### Före festen
- [ ] Skicka tydlig, detaljerad information om vad som förväntas
- [ ] Matcha karaktärer med gästpersonligheter
- [ ] Ge tillval för dräkt/rollspel-intensitet
- [ ] Skapa flera deltagandenivåer
- [ ] Förbered extra uppgifter för icke-rollspelare
- [ ] Designa en välkomnande, lågstress-miljö

### Vid starten
- [ ] Ge en grundlig, lugnande introduktion
- [ ] Förklara tydligt vad som förväntas (och vad som inte förväntas)
- [ ] Börja med strukturerade aktiviteter
- [ ] Modellera entusiasm utan press
- [ ] Upprätta en bedömande-fri zon

### Under evenemanget
- [ ] Övervaka för tecken på disengagemang
- [ ] Ingrip tidigt och privat
- [ ] Para ihop motvilliga gäster strategiskt
- [ ] Tilldela specifika uppgifter
- [ ] Använd ledtrådar för att uppmuntra interaktion
- [ ] Fira deltagande
- [ ] Var flexibel och justera på språng

### Efter festen
- [ ] Samla in ärlig feedback
- [ ] Reflektera över vad som fungerade
- [ ] Identifiera förbättringsområden
- [ ] Justera strategi för framtida fester

## Slutliga tankar

Att få gäster att delta handlar inte om att tvinga alla att vara extroverta skådespelare. Det handlar om att skapa en miljö där alla känner sig bekväma att engagera sig på sin egen nivå.

Kom ihåg:

1. **Förberedelse är nyckeln**: Sätt förväntningar tidigt och matcha karaktärer med personligheter
2. **Strukturen hjälper**: Styrda aktiviteter är mindre skrämmande än fritt mingel
3. **Varje person är olika**: Erbjud flera sätt att delta
4. **Ingrip tidigt**: Ju snabbare du engagerar motvilliga gäster, desto bättre
5. **Var flexibel**: Justera på språng baserat på gruppens energi
6. **Skapa säkerhet**: En icke-bedömande atmosfär uppmuntrar till risktagande
7. **Fira ansträngning**: Erkänn allt deltagande, oavsett nivå

Med dessa strategier kan du förvandla även de mest motvilliga gästerna till entusiastiska deltagare. Ditt mål är inte perfektion - det är inkludering. När alla känner sig välkomna och bekväma skapar du oförglömliga upplevelser som håller människor som pratar långt efter mysteriet är löst.

Lycklig mysterieskapande!`
  },
  'how-to-fix-overly-complex-murder-mysteries': {
    title: 'Hur man fixar alltför komplexa mordgåtor',
    meta_description: 'Är din mordgåta för komplicerad? Lär dig hur du förenklar komplexa mysterier utan att förlora spänningen. Praktiska tips för att skapa engagerande men hanterbara mordgåtor.',
    content: `# Hur man fixar alltför komplexa mordgåtor

Du har skapat den ultimata mordgåtan. Den har komplicerade karaktärsbakgrunder, flerfaldiga plot-twists, ingående bevis, och en lösning som kräver detektiv-nivå deduktionsförmåga. Du är så stolt.

Sedan börjar festen. Inom 30 minuter ser du förvirrade ansikten. Vid 60 minuter har folk slutat försöka. Vid 90 minuter hör du någon viska "Jag fattar ingenting av det här."

Din briljanta, intrikata mordgåta har blivit en överväldigande, frustrerande upplevelse.

Här är sanningen: Komplexitet är inte detsamma som kvalitet. De bästa mordgåtorna är sofistikerade men tillgängliga, utmanande men inte förvirrande. Låt oss utforska hur man identifierar och fixar alltför komplexa mysterier så att dina gäster faktiskt kan njuta av den briljans du har skapat.

## Tecken på att ditt mysterium är för komplext

Innan vi dyker in i lösningar, låt oss identifiera problemet. Din mordgåta kan vara för komplex om:

### För många karaktärer

**Varningssignaler:**
- Mer än 10-12 karaktärer för 8-10 spelare
- Flera karaktärer som låter eller agerar liknande
- Karaktärer som inte är nödvändiga för berättelsen
- Spelare blandar ihop vem som är vem

**Verklig konsekvens:**
Spelare kan inte hålla reda på alla och missar viktiga samband.

**Exempel:**
En mordgåta med:
- 12 spelkaraktärer
- 5 icke-spelkaraktärer (NPC:er)
- Flera omnämnda men icke-närvarande karaktärer
- Historiska figurer refererade i bakgrunder

**Resultat:** Spelare överösta med 20+ namn att komma ihåg

### Alltför invecklade karaktärsbakgrunder

**Varningssignaler:**
- Karaktärsbakgrunder längre än 2-3 sidor
- Flera lager av hemliga identiteter
- Komplexa familjeträd med generationer av historia
- Yrkesanvändningar som kräver specialiserad kunskap

**Verklig konsekvens:**
Spelare kan inte processa all information och missar kritiska detaljer.

**Exempel på alltför komplex bakgrund:**
"Du är Lady Blackwood, född Anastasia von Rothschild i Österrike 1895. Du flydde till England under första världskriget och antog en falsk identitet som Isabella Fairfax. Du gifte dig med Lord Blackwood, men han vet inte ditt riktiga förflutna. Du har en hemlig dotter från ditt första äktenskap i Wien, som nu bor i Frankrike under ett annat namn. Du är också en hemlig agent för den brittiska kronan, och din verkliga mission..."

**Problem:**
- För mycket bakgrund
- För många hemligheter
- För många namn att komma ihåg
- Kräver omfattande historisk kunskap

### För många plot-trådar

**Varningssignaler:**
- Flera orelaterade mysterier som händer samtidigt
- Sidoplottar som inte kopplar till huvudmordet
- Varje karaktär har 3+ hemliga agendor
- Ingen enkel huvudberättelse att följa

**Verklig konsekvens:**
Spelare vet inte vad de ska fokusera på.

**Exempel:**
En mordgåta som innehåller:
- Huvudmordet
- En hemlig affär
- En utpressningsplan
- Stulen konst
- Finansiell bedrägeri
- En hemlig arvinge
- Ett spionuppdrag

**Problem:** Spelare vet inte vilken tråd som faktiskt leder till mordet

### Överdrivet komplexa ledtrådar

**Varningssignaler:**
- Ledtrådar som kräver att lösa pussel eller koder
- Hänvisningar till obskyra historiska händelser
- Komplexa vetenskapliga eller medicinska termer
- Ledtrådar som kräver information från 5+ andra ledtrådar

**Verklig konsekvens:**
Spelare fastnar på en ledtråd och kan inte gå vidare.

**Exempel:**
"Den krypterade dagboksinmatningen använder en Caesar-chiffer med 13-stegs rotation, men endast på varje tredje ord. När den dekrypterats avslöjar den latinska namn på tre växter, vars första bokstäver bildar initialerna för den riktiga mördaren - men bara om du vet den botaniska taxonomin från 1800-talet."

**Problem:**
- Kräver specialiserad kunskap
- Flera steg för att lösa
- Alltför teknisk
- Kan stoppa framsteg helt

### För många möjliga lösningar

**Varningssignaler:**
- Flera karaktärer kan logiskt vara mördaren
- Bevis pekar på olika misstänkta
- Ingen tydlig "aha!"-ögonblick
- Lösningen kräver gissning mer än deduktion

**Verklig konsekvens:**
Spelare blir frustrerade eftersom deras logiska slutsatser leder till fel svar.

**Exempel:**
Tre olika karaktärer har:
- Motiv (alla hatade offret)
- Möjlighet (alla var i närheten)
- Medel (alla hade tillgång till gift)
- Ingen solid alibi

Men bara en är "rätt" mördare baserat på en subtil detalj spelare lätt kan missa.

### Tidslinjeforvirring

**Varningssignaler:**
- Händelser som sker i icke-kronologisk ordning
- Flashbacks blandade med realtid
- Flera parallella tidslinjer
- Motsägelsefulla vittnesförklaringar om timing

**Verklig konsekvens:**
Spelare kan inte etablera en klar sekvens av händelser.

**Exempel:**
- "Ledtråd A säger att mordet hände vid midnatt"
- "Ledtråd B säger att offret sågs levande kl 00:30"
- "Ledtråd C nämner att kroppen hittades vid 23:45"

**Problem:** Omöjlig tidslinje skapar förvirring, inte mysterium

## Varför komplexitet känns lockande (Men sällan fungerar)

Innan vi fixar problemet, låt oss förstå varför vi skapar alltför komplexa mysterier:

### Myten om "svårare = bättre"

**Övertygelse:**
"Om det är lätt att lösa har jag misslyckats som mysterieskapare."

**Verklighet:**
Ett mysterium bör vara utmanande men lösbart. Om ingen kan lösa det, spelar det ingen roll hur smart det är.

**Analogi:**
Att skapa ett omöjligt mysterium är som att skapa ett pussel med bitar som inte passar ihop. Det är inte imponerande - det är frustrande.

### Rädsla för förutsägbarhet

**Övertygelse:**
"Om jag inte lägger till flera vändningar kommer det att vara uppenbart vem mördaren är."

**Verklighet:**
En välutförd, enkel lösning är mer tillfredsställande än en överdrivet komplicerad som ingen förstår.

**Exempel:**
Agatha Christie's mysterier är ofta relativt enkla i struktur, men briljant utförda. Lösningen är rättvis och logisk, inte artificiellt komplex.

### Författarkunskap vs spelarkunskap

**Problem:**
Du vet allt om ditt mysterium, så det känns enkelt för dig.

**Verklighet:**
Spelare upptäcker information gradvis. Vad som känns uppenbart för dig är helt nytt för dem.

**Blind punkt:**
Du underskattar hur svårt ditt mysterium faktiskt är eftersom du kan inte uppleva det med färska ögon.

### Visning av kreativitet

**Övertygelse:**
"Ju mer jag lägger till, desto mer imponerande kommer mysteriet att vara."

**Verklighet:**
Elegans i enkelhet är ofta mer imponerande än kaotisk komplexitet.

**Citat att komma ihåg:**
"Perfektion uppnås inte när det inte finns mer att lägga till, utan när det inte finns mer att ta bort." - Antoine de Saint-Exupéry

## Hur man förenklar ditt mysterium

Nu till lösningar. Så här kan du ta ett alltför komplext mysterium och göra det tillgängligt:

### 1. Reducera antalet karaktärer

**Optimal karaktärsantal:**
- 6-8 spelare: 6-8 karaktärer
- 8-10 spelare: 8-10 karaktärer
- 10-12 spelare: 10-12 karaktärer
- Maximalt 12-15 karaktärer totalt (inklusive NPC:er)

**Hur man minskar:**

**Kombinera liknande karaktärer:**

**Före:**
- Lady Blackwood (aristokrat)
- Duchess of Somerset (aristokrat)
- Baroness Whitmore (aristokrat)

**Efter:**
- Lady Blackwood (aristokrat som representerar alla tre:s motiv och roller)

**Ta bort icke-nödvändiga karaktärer:**

Fråga för varje karaktär:
- Är denna karaktär nödvändig för att lösa mysteriet?
- Tillför de unik information?
- Kan deras roll ges till någon annan?

**Exempel:**
"Butlern" har ledtrådar om mördarens rörelser. Kan dessa ledtrådar istället ges till "Husnyckla" som redan är en karaktär?

**Använd omnämnda men frånvarande karaktärer sparsamt:**

**Dåligt:**
Ständiga referenser till 10+ människor som inte är närvarande

**Bättre:**
Max 2-3 omnämnda karaktärer, endast om de är absolut nödvändiga

### 2. Förenkla karaktärsbakgrunder

**Idealisk längd:**
- 1-2 sidor för huvudkaraktärer
- 1 sida för stödkaraktärer
- En halv sida för mindre karaktärer

**Struktur för tydlighet:**

**Mall för karaktärsbakgrund:**
```
NAMN & GRUNDLÄGGANDE INFO:
- Namn, ålder, yrke
- En mening relation till offret

MOTIV (om relevant):
- En klar anledning att de kan vara misstänkta

NYCKELHEMLIGSTER (max 1-2):
- Endast hemligheter relevanta för mysteriet

VÄD DU VET:
- 3-5 punkter med viktig information du kan dela

VÄD DU INTE VET:
- 2-3 saker du försöker ta reda på

DITT MÅL:
- Ett enkelt mål för kvällen
```

**Före (alltför komplex):**
"Du är Doktor Harrison Matthews, född 1885 i Cardiff, Wales. Du utbildade dig vid Oxford University där du studerade medicin och filosofi. Under dina år där mötte du offret, Lord Ashford, som också studerade där men läste juridik. Ni blev vänner men hade en fallande ut över en kvinna, Miss Elizabeth Thornbury, som du älskade men som valde Lord Ashford. Du gifte dig så småningom med någon annan, men ditt äktenskap är olyckligt. Du har också en hemlighet: du är inte riktigt en doktor - du blev utslängd från läkarutbildningen för att fuska, men du har låtsats vara kvalificerad i 20 år. Du har också en gamblingproblematik som har fått dig att förlora mängder av pengar, och du är skyldig Lord Ashford £50,000 från en dålig investering. Dessutom..."

**Efter (förenklad):**
"Du är Doktor Matthews, en lokal läkare.

**Din relation till offret:** Lord Ashford var din gamla universitetsvän, men ni fick en fallande ut över pengar.

**Ditt motiv:** Han vägrade betala tillbaka £50,000 han är skyldig dig från en affärstransaktion som gick snett.

**Din hemlighet:** Du har en gamblingproblematik som förklarar varför du behöver pengarna desperalt.

**Vad du vet:**
- Du var i biblioteket när mordet hände
- Du såg Lady Pemberton gå in i studion strax före midnatt
- Offret drack brandy kvällen innan han dog

**Ditt mål:** Ta reda på vem som mördade Lord Ashford, men undvik att avslöja din gamblingproblematik."

**Förbättringar:**
- Kortare (1/4 av längden)
- Tydlig struktur
- Bara relevanta detaljer
- Konkreta mål

### 3. Skapa en enda huvudplot

**Fokusera strategin:**

**Identifiera kärnmysteriet:**
Vad är den ENKLA berättelsen du berättar?

**Exempel:**
"En rik lord mördades under hans egen middagsparty. Någon av gästerna gjorde det för pengar, hämnd, eller hemligheter."

**Sidoplottar måste stödja huvudberättelsen:**

**Dålig sidoplott:**
En hemlig affär som inte har någonting att göra med mordet

**Bra sidoplott:**
En hemlig affär som ger mördarens motiv

**Test för relevans:**
För varje sidoplott, fråga: "Om jag tar bort detta, kan spelare fortfarande lösa mysteriet?"
- Om JA: Överväg att ta bort det
- Om NEJ: Behåll det men se till att det tydligt kopplas till huvudmordet

**Exempel på plottfärenkling:**

**Före (för många plottar):**
1. Huvudplott: Vem mördade Lord Ashford?
2. Sidoplott A: Vem stjäl juveler från gästerna?
3. Sidoplott B: Vem utpressar Lady Pemberton?
4. Sidoplott C: Vem är den hemliga arvingen till godset?
5. Sidoplott D: Vem är en hemlig spion?

**Efter (fokuserad):**
1. Huvudplott: Vem mördade Lord Ashford?
2. Stödjande plott: Den hemliga arvingen hade motiv (kopplar till mordet)
3. Stödjande plott: Utpressningen gav ett annat motiv (kopplar till mordet)

Juvelstölden, spionuppdraget tas bort helt eftersom de inte kopplar till mordet.

### 4. Förenkla ledtrådar

**Principen för tydlig ledtråd:**
Varje ledtråd ska vara begriplig utan att kräva specialiserad kunskap.

**Omformulera komplexa ledtrådar:**

**Före (alltför komplex):**
"Den kemiska analysen av reagens visar närvaron av C₉H₁₃NO₃ i höga koncentrationer, förenligt med oral förtäring av en katekolaminprotoalkoid-förenings derivat som vanligtvis extraheras från Lophophora williamsii, en psykedelisk kaktusart endemisk till Chihuahuanöknen."

**Efter (förenklade):**
"Toxikologirapporten visar att offret förgiftades med ett sällsynt gift från en ökenväxt. Endast en person vid festen har rest till sydvästra USA nyligen."

**Förbättringar:**
- Inget krav på kemisk kunskap
- Enkel språk
- Tydligt vad det betyder för utredningen

**Skapa tydliga bevisskedjor:**

**Princip:**
Varje ledtråd ska koppla till nästa i en logisk ordning.

**Exempel:**
1. **Ledtråd 1:** Offret dog av arsenikvergiftning
2. **Ledtråd 2:** Arsenikflaska saknas från laboratorieskåpet
3. **Ledtråd 3:** Doktor Matthews har nyckel till laboratorieskåpet
4. **Ledtråd 4:** Doktor Matthews fingeravtryck på den tomma arsenikflaskan
5. **Ledtråd 5:** Vittne såg Doktor Matthews hälla något i offrets drink

**Varför detta fungerar:**
Varje steg är logiskt och bygger på det föregående. Inga hopp, inga krångliga deduktioner krävs.

**Ta bort pussel och koder (eller gör dem valfria):**

**Problem med pussel:**
- Stoppar framsteg om ingen kan lösa det
- Kräver specifik kompetens
- Kan ta hela tiden från mysteriet själv

**Lösning:**

**Dåligt:**
"Du måste lösa detta korsord för att få nästa ledtråd."

**Bättre:**
"Här är ett korsord som ger extra kontext, men huvudledtråden står i klartext längst ner."

**Bäst:**
Gör pussel till en bonusaktivitet, inte en nödvändighet.

### 5. Skapa en tydlig tidslinje

**Etablera klara händelser:**

**Skapa en enkel händelsesekvens:**
```
19:00 - Gäster anländer till godset
20:00 - Middag serveras
21:30 - Lord Ashford lämnar middagsbordet (sist sett levande)
22:00 - Skott hörs från studion
22:15 - Kroppen upptäckt av butler
22:30 - Polis kallas (spelare börjar utredningen)
```

**Varför detta fungerar:**
- Kronologisk ordning
- Specifika tider
- Tydliga milstolpar
- Lätt att följa

**Undvik flashbacks och icke-linjär berättelse:**

**Problem:**
Hoppar fram och tillbaka i tiden förvirrar spelare som redan jonglerar mycket information.

**Lösning:**
Håll allt i kronologisk ordning. Om bakgrund behövs, presentera den tydligt som "Det här hände innan festen."

**Tillhandahåll en tidslinjreferens:**

**Skapa en visuell tidslinje för spelare:**
```
KL 21:30 ————> KL 22:00 ————> KL 22:15
Lord Ashford    Skott hörs     Kroppen
lämnar                         upptäckt
```

**Inkludera i spelpaket:**
Ge varje spelare en tidslinjereferens de kan konsultera.

### 6. Begränsa möjliga lösningar

**Princip:**
Det bör finnas EN klar mördare som kan identifieras genom logisk deduktion.

**Hur man uppnår detta:**

**Ge mördaren unika beviskedjor:**

**Endast mördaren ska ha alla tre:**
1. **Motiv:** En tydlig anledning att vilja offret död
2. **Möjlighet:** Var ensam med offret vid rätt tid
3. **Medel:** Hade tillgång till mordvapnet/metoden

**Andra misstänkta kan ha 1-2, men inte alla tre.**

**Exempel:**

**Doktor Matthews (mördaren):**
- Motiv: Skuld £50,000
- Möjlighet: Ensam i studion med offret 21:30-22:00
- Medel: Tillgång till arsenik från laboratorium

**Lady Pemberton (röd sill):**
- Motiv: Utpressad av offret
- Möjlighet: Inget alibi, men någon kan bevittna att hon var någon annanstans
- Medel: Ingen tillgång till arsenik

**Reverend Thompson (oskyldig):**
- Motiv: Ingen
- Möjlighet: Har solid alibi
- Medel: Ingen tillgång

**Skapa en utslagningsprocess:**

**Designa ledtrådar som gradvis utesluter misstänkta:**

**Omgång 1:** Alla 6 karaktärer är misstänkta
**Omgång 2:** Ledtrådar om alibin utesluter 2 karaktärer
**Omgång 3:** Ledtrådar om medel (tillgång till gift) utesluter 2 fler
**Omgång 4:** Slutliga motiv-ledtrådar pekar på den sista personen

**Varför detta fungerar:**
Spelare känner att de gör framsteg medan listan av misstänkta minskar.

### 7. Testa med färska ögon

**Genomför testomgångar:**

**Hitta testare som:**
- Aldrig sett mysteriet förut
- Representerar din målgrupp (vänner, familj, medarbetare)
- Kommer att ge ärlig feedback

**Under testet:**

**Gör:**
- Observera tyst
- Anteckna var spelare blir förvirrade
- Spåra hur lång tid varje del tar
- Notera vilka ledtrådar ignoreras eller missförstås

**Gör inte:**
- Ingrip för att förklara saker (ännu inte)
- Ge ledtrådar
- Försvara ditt mysterium när spelare klagar

**Efter testet:**

**Fråga specifika frågor:**
- "Vilka delar var mest förvirrande?"
- "Vilken information önskade ni att ni hade fått tidigare?"
- "Fanns det ledtrådar ni aldrig förstod?"
- "Var mysteriet för svårt, lagom, eller för lätt?"
- "Vad skulle ni ändra?"

**Iterera baserat på feedback:**

**Om flera testare kämpar med samma sak:**
- Det är ett riktigt problem, inte bara en personlig preferens
- Förenkla eller förtydliga den delen

**Om ingen kan lösa mysteriet:**
- Det är för svårt - förenkla ledtrådar eller lägg till fler

**Om alla löser det omedelbart:**
- Kanske för lätt - lägg till en röd sill eller subtilitet (men inte för mycket!)

## Verkliga exempel: Före och efter

Låt oss se ett komplett mysterium förenklas:

### Original (alltför komplex) version

**Karaktärer:** 15 spelade karaktärer + 8 NPC:er

**Plot:**
- Huvudmord + stöldjuveler + spionring + hemlig arvinge + finansiell bedrägeri

**Karaktärsbakgrundslängd:** 4-5 sidor vardera

**Exempelledtråd:**
"Det krypterade meddelandet använder Playfair-chiffer med nyckelordet 'DYNASTY'. När det dekrypteras avslöjar det koordinater till en gömd plats i godsets bibliotek, som innehåller ett dokument skrivet på latin som beskriver en 300-årig gammal släkthistoria som avslöjar den sanna identiteten för den fjärde arvingen, vars bortfall skulle indikera ett ekonomiskt motiv kopplat till den austro-ungerska arvssuccessionstraditioner från 1800-talet."

**Tidslinje:** Icke-linjär med flashbacks från flera decennier

**Testresultat:**
- Ingen löste det
- Genomsnittligt frustrationsnivå: 9/10
- Kommentarer: "För komplext", "Gav upp", "Förvirrad från början"

### Reviderad (förenklad) version

**Karaktärer:** 8 spelade karaktärer, 2 omnämnda NPC:er

**Plot:**
- Huvudmord (de andra plotterna togs bort eller kopplades till huvudmordet)
- Den hemliga arvingen ger motiv för mordet
- Finansiell bedrägeri ger ett annat motiv
- Juveler- och spionplottar togs bort helt

**Karaktärsbakgrundslängd:** 1-2 sidor

**Exempelledtråd (samma information, förenklad):**
"Ett gömt dokument i biblioteket avslöjar att Lady Blackwood inte är Lord Ashfords systerdotter som alla tror - hon är en bedragare. Den riktiga arvtagaren skulle ärva allt, ge någon anledning att vilja Lord Ashford död innan sanningen kom ut."

**Tidslinje:** Linjär kronologisk ordning med tydliga tider

**Testresultat:**
- 75% löste det
- Genomsnittlig tillfredsställelse: 8/10
- Kommentarer: "Utmanande men rättvist", "Roligt att lista ut", "Gillade komplexiteten utan att kännas överväldigad"

**Förbättringar sammanfattning:**
- Halverade antal karaktärer
- Tog bort 3/5 plottar
- Minskade karaktärsbakgrund med 60%
- Förenklade ledtrådar genom att ta bort koder/pussel
- Skapade linjär tidslinje
- Resultat: Högre lösningsgrad och högre gästnöjdhet

## Balansera enkelhet och sofistikering

Förenkla betyder inte att dumma ner. Här är hur man behåller djup medan man förbättrar tillgänglighet:

### 1. Lager istället för komplexitet

**Princip:**
Enkel yta med djupare lager för dem som vill utforska.

**Exempel:**

**Första lagret (alla kan förstå):**
"Lord Ashford mördades för pengar eller hämnd."

**Andra lagret (för uppmärksamma spelare):**
"Ekonomiska handlingar visar flera människor hade ekonomiska motiv."

**Tredje lagret (för dedikerade spelare):**
"Subtila ledtrådar tyder på att motivet inte var pengar utan något personligt."

**Slutligt lager (för bästa detektiverna):**
"Mördaren dödade inte för pengar eller hämnd utan för att skydda en hemlighet."

**Varför detta fungerar:**
- Alla kan följa grundberättelsen
- Erfarna spelare kan gräva djupare
- Flera nivåer av tillfredsställelse

### 2. Elegant enkelhet

**Princip:**
Enkla lösningar kan fortfarande vara raffinerade och tillfredsställande.

**Exempel:**

**Komplex men osnodig:**
En mördare som använde en komplicerad timing-mekanism med klockor, trådar och kemiska reaktioner för att skapa ett alibi.

**Enkel men elegant:**
En mördare som skapade ett alibi genom att be någon ljuga för dem - en enkel plan som fungerade på grund av mänsklig natur, inte Rube Goldberg-maskiner.

**Varför enkel är bättre:**
- Begripligt
- Relaterat till verkliga mänskliga beteenden
- Tillfredsställande när de avslöjas
- Ingen specialkunskap krävs

### 3. Karaktärsdrivet mysterium

**Princip:**
Komplexiteten kommer från mänskliga relationer, inte invecklade mekanismer.

**Fokusera på:**
- Känslomässiga motiv (svartsjuka, kärlek, hämnd)
- Relationsdinamik (vem litar på vem)
- Psykologi (varför gjorde de det?)

**Istället för:**
- Komplicerade tekniska planer
- Obskyra historiska fakta
- Komplexa pussel eller koder

**Exempel:**

**Teknisk komplexitet (mindre engagerande):**
"Mördaren använde en sällsynt sydamerikansk växtgift som bara kan upptäckas med gas-kromatografi-masspektrometri."

**Känslomässig komplexitet (mer engagerande):**
"Mördaren hatade offret i 20 år efter att ha blivit förråddi men dölde det bakom ett vänligt yttre. Ledtrådar avslöjar gradvis den gamla såren."

**Varför känslomässig är bättre:**
- Alla förstår mänskliga känslor
- Skapar empati och djup
- Mer tillfredsställande lösning

## Checklista: Är ditt mysterium för komplext?

Använd denna checklista för att utvärdera ditt mysterium:

### Karaktärer
- [ ] Har jag färre än 12 totala karaktärer?
- [ ] Kan varje karaktär lätt särskiljas från andra?
- [ ] Är varje karaktär nödvändig för att lösa mysteriet?
- [ ] Är karaktärsbakgrunder 2 sidor eller mindre?

### Plot
- [ ] Finns det en enda tydlig huvudberättelse?
- [ ] Kopplar alla sidoplottar till huvudmordet?
- [ ] Kan jag sammanfatta plottet i 2-3 meningar?
- [ ] Har jag färre än 3 sidoplottar?

### Ledtrådar
- [ ] Kan varje ledtråd förstås utan specialiserad kunskap?
- [ ] Kopplar ledtrådar logiskt till varandra?
- [ ] Finns det inga nödvändiga pussel eller koder (eller är de valfria)?
- [ ] Leder ledtrådar tydligt till lösningen?

### Tidslinje
- [ ] Är händelser i kronologisk ordning?
- [ ] Finns det specifika tider för nyckelhändelser?
- [ ] Finns det inga motsägelser i timing?
- [ ] Har jag en visuell tidslinjereferens för spelare?

### Lösning
- [ ] Finns det EN tydlig mördare?
- [ ] Kan mördaren identifieras genom logisk deduktion?
- [ ] Har endast mördaren alla tre (motiv, möjlighet, medel)?
- [ ] Är lösningen rättvis baserad på tillhandahållna ledtrådar?

### Testning
- [ ] Har jag testat med minst 2 olika grupper?
- [ ] Kunde testare lösa mysteriet?
- [ ] Rapporterade testare att det var utmanande men rättvist?
- [ ] Har jag reviderat baserat på testfeedback?

## Slutliga tankar

Att förenkla ett alltför komplext mysterium handlar inte om att göra det mindre intressant - det handlar om att göra det mer tillgängligt. De bästa mordgåtorna är sådana där spelare känner sig smarta när de löser dem, inte förvirrade av onödig komplexitet.

Kom ihåg:

1. **Mer är inte alltid bättre**: Fokusera på kvalitet över kvantitet
2. **Enkelhet är inte dumhet**: Eleganta, enkla lösningar kan vara djupt tillfredsställande
3. **Känslor över mekanik**: Människors komplexitet är mer engagerande än teknisk komplexitet
4. **Testa, testa, testa**: Du kan inte veta om det är för komplext utan att se andra spelare försöka lösa det
5. **Var villig att skära**: Ibland måste du ta bort briljanta element om de gör mysteriet ohanterligt
6. **Tillgänglighet först**: Om spelare inte kan följa med kan de inte njuta av din historia

Med dessa strategier kan du skapa mysterier som är sofistikerade och tillgängliga, utmanande men inte frustrande, minnesvärda av rätt skäl.

Din roll som mysterieskapare är inte att visa hur smart du är - det är att skapa en upplevelse där dina spelare kan känna sig smarta. När du hittar den balansen skapar du något verkligt magiskt.

Lycklig mysterieskapande!`
  }
};

async function main() {
  console.log('Starting translation and insertion of 3 missing Swedish posts...\n');

  for (const englishSlug of POSTS_TO_TRANSLATE) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${englishSlug}`);
      console.log('='.repeat(60));

      // Check if Swedish version already exists
      const svSlug = `${englishSlug}-sv`;
      console.log(`Checking if ${svSlug} already exists...`);
      const exists = await checkSwedishExists(englishSlug);

      if (exists) {
        console.log(`⚠️  Swedish version already exists: ${svSlug}`);
        console.log('Skipping to avoid duplicate.');
        continue;
      }

      // Fetch English post
      console.log(`\nFetching English post: ${englishSlug}...`);
      const englishPost = await fetchEnglishPost(englishSlug);
      console.log(`✓ Found English post: "${englishPost.title}"`);
      console.log(`  - Tags: ${englishPost.tags?.join(', ') || 'none'}`);
      console.log(`  - Theme: ${englishPost.theme || 'none'}`);

      // Get translations
      const translation = TRANSLATIONS[englishSlug];
      if (!translation) {
        throw new Error(`No translation found for ${englishSlug}`);
      }

      console.log(`\n✓ Translation ready:`);
      console.log(`  - Title: ${translation.title}`);
      console.log(`  - Content length: ${translation.content.length} chars`);
      console.log(`  - Meta description: ${translation.meta_description.substring(0, 60)}...`);

      // Insert Swedish post
      console.log(`\nInserting Swedish post: ${svSlug}...`);
      const result = await insertSwedishPost(
        englishPost,
        translation.title,
        translation.content,
        translation.meta_description
      );

      console.log(`✅ Successfully inserted Swedish post!`);
      console.log(`  - ID: ${result[0].id}`);
      console.log(`  - Slug: ${result[0].slug}`);
      console.log(`  - Language: ${result[0].language}`);
      console.log(`  - Status: ${result[0].status}`);

    } catch (error) {
      console.error(`\n❌ Error processing ${englishSlug}:`, error.message);
      console.error('Stack:', error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Translation and insertion complete!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
