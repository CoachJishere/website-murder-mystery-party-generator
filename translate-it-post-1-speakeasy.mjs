#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = '1920s-speakeasy-murder-mystery-party-guide';
const IT_SLUG = '1920s-speakeasy-murder-mystery-party-guide-it';

async function main() {
  // Fetch English post
  console.log('📥 Fetching English post...');
  const response = await fetch(`${SUPABASE_URL}?language=eq.en&status=eq.published&slug=eq.${EN_SLUG}&select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await response.json();
  if (data.length === 0) {
    throw new Error('English post not found');
  }

  const englishPost = data[0];
  console.log('✅ English post fetched');
  console.log(`   Title: ${englishPost.title}`);
  console.log(`   Content: ${englishPost.content.length} chars\n`);

  // Check if Italian version exists
  const checkResponse = await fetch(`${SUPABASE_URL}?language=eq.it&slug=eq.${IT_SLUG}&select=id`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const existing = await checkResponse.json();
  if (existing.length > 0) {
    console.log('⏭️  Italian version already exists. Skipping.');
    return;
  }

  // Italian translations
  const italianTitle = 'Guida alla Festa a Tema Giallo in Stile Speakeasy anni \'20';
  const italianMetaDescription = 'Scopri come organizzare una festa a tema giallo in stile speakeasy anni \'20 con atmosfera proibizionista, costumi vintage, decorazioni autentiche e un mistero da risolvere.';

  const italianContent = `# Guida alla Festa a Tema Giallo in Stile Speakeasy anni '20

Immagina questo: i tuoi ospiti bussano tre volte a una porta segreta, sussurrano una parola d'ordine e scivolano in un elegante speakeasy dove il jazz suona dolcemente, i cocktail scorrono liberamente e l'omicidio è appena avvenuto. Benvenuto nel mondo mozzafiato delle feste a tema giallo in stile speakeasy anni '20, dove proibizionismo incontra mistero!

Dopo aver organizzato dozzine di queste soirée eleganti, ho perfezionato l'arte di trasportare gli ospiti nel tempo, direttamente nel cuore dell'America della Proibizione. Che tu stia pianificando una festa intima per otto o un evento stravagante per venti, questa guida ti mostrerà come creare un'esperienza indimenticabile che avrebbe fatto invidia a Jay Gatsby stesso.

## Perché gli Speakeasy anni '20 Sono Perfetti per le Feste a Tema Giallo

Gli anni '20 ruggenti forniscono lo sfondo perfetto per un mistero:

- **Intrigo Storico**: L'era della Proibizione era piena di segreti, attività criminali organizzate e ambiguità morale
- **Estetica Straordinaria**: Dalla moda flapper alle decorazioni art déco, tutto ha un aspetto favoloso
- **Personalità Indimenticabili**: Gangster, cantanti di jazz, poliziotti corrotti e flapper creano personaggi avvincenti
- **Atmosfera Coinvolgente**: Speakeasy, musica jazz e cocktail proibiti creano l'ambiente perfetto
- **Semplicità di Costume**: I vestiti anni '20 sono iconici, accessibili e sempre eleganti

## Ambientare la Scena: Trasformare il Tuo Spazio in uno Speakeasy Autentico

### Creazione dell'Ingresso Segreto

L'esperienza inizia prima che i tuoi ospiti varchino la soglia. Ecco come creare un ingresso da vero speakeasy:

**Elementi Essenziali per la Porta Segreta:**
- Appendi un cartello all'ingresso principale che dice "Lavanderia Chen" o "A.B. Smith - Scarpe da Uomo"
- Posiziona un piccolo cartello "Riservato ai Soci" sulla porta
- Chiedi a qualcuno di fare da "portiere" che verifica le parole d'ordine
- Usa illuminazione soffusa vicino all'ingresso per creare atmosfera

**Parole d'Ordine Divertenti:**
- "Joe mi ha mandato"
- "I fiori sono in fiore"
- "L'uccello canta a mezzanotte"
- "Riesci a vedere il fiume da qui?"

*Consiglio Pro*: Invia le parole d'ordine con gli inviti o falle scoprire come primo indizio!

### Illuminazione e Atmosfera

L'illuminazione giusta trasforma uno spazio ordinario in un affascinante speakeasy:

- **Luci Soffuse**: Usa lampadine Edison o luci ambrate a basso wattaggio
- **Candele**: Metti candele senza fiamma ovunque per quel bagliore da tavolo di carte da poker clandestino
- **Illuminazione d'Accento**: Illumina le aree chiave come il bar e il palco con faretti sottili
- **Proiettori**: Aggiungi modelli art déco alle pareti per profondità visiva

### Decorazioni Essenziali per lo Speakeasy

**Da Avere Assolutamente:**
- Tovaglie in velluto o raso in tonalità oro, nere o bordeaux
- Vasi geometrici art déco con piume di pavone o rose rosse profonde
- Poster vintage di jazz, gin o dell'era della Proibizione
- Paillettes nere e oro sparse sui tavoli
- Vecchie valigette, macchine da scrivere o telefoni a disco
- Manifesti "Ricercato" dei tuoi personaggi del giallo

**Tocco da Bar Clandestino:**
Allestisci un'area bar con:
- Bottiglie vintage (o etichette fai-da-te su bottiglie moderne)
- Strumenti da cocktail esposti
- Un cartello "Gin da Bagno" o "La Speciale di Oggi"
- Vassoio per sigari (anche se finti)
- Tazze da tè per servire i "cocktail" (così sembrano innocenti se arrivano le autorità!)

## Il Mistero: Creare la Tua Trama dello Speakeasy

### Ambientazioni Popolari da Speakeasy

Scegli uno scenario che si adatti ai tuoi ospiti:

**1. Il Club di Mezzanotte**
- Un rinomato speakeasy dove si esibiscono i migliori artisti di jazz
- La stella principale viene trovata morta nel camerino
- I sospetti includono cantanti rivali, investitori del club e amanti gelosi

**2. L'Impero del Contrabbando**
- Si riuniscono gangster rivali per discutere territori
- Un capo viene avvelenato durante una trattativa
- Potenziali assassini includono gangster rivali, una talpa delle forze dell'ordine e familiari traditori

**3. La Speakeasy Society**
- Membri dell'alta società che si mescolano con il mondo criminale
- Viene scoperto il corpo di un ricattatore
- Tutti hanno segreti da nascondere

### Personaggi Essenziali

Ogni giallo in uno speakeasy ha bisogno di questi archetipi:

- **Il Proprietario dello Speakeasy**: Carismatico ma misterioso, con collegamenti sia in alto che in basso
- **La Flapper**: Affascinante, spensierata, ma forse più astuta di quanto sembri
- **Il Gangster**: Pericoloso, potente e sempre sospetto
- **La Cantante di Jazz**: Talentuosa e appassionata, con molti ammiratori e nemici
- **Il Barista**: Vede tutto, sa tutto, dice poco
- **L'Agente della Proibizione**: Ufficiale della legge sotto copertura o corrotto che si gode i privilegi?
- **La Socialite**: Ricchezza antica, nuovi vizi
- **Il Contrabbandiere**: Fornitore di alcol illegale con collegamenti pericolosi

### Struttura del Mistero

**Giro 1: La Scoperta (30 minuti)**
- Gli ospiti arrivano, ricevono schede dei personaggi
- Mescolarsi e stabilire relazioni
- Il corpo viene scoperto!

**Giro 2: Le Indagini (45 minuti)**
- Distribuisci i primi indizi
- Permetti agli ospiti di interrogarsi a vicenda
- Rivelazioni drammatiche emergono

**Giro 3: La Risoluzione (30-45 minuti)**
- Indizi finali distribuiti
- Gli ospiti fanno le loro accuse
- La grande rivelazione!

## Costumi: Vestirsi per il Successo dello Speakeasy

### Per le Signore

**Il Look Flapper Classico:**
- Vestito con frange o paillettes (lunghezza al ginocchio o più corto)
- Fascia per capelli o cerchietto con piume o perle
- Lunghe collane di perle (perfette per far girare)
- Stola di pelliccia (finta!)
- Scarpe Mary Jane o T-strap
- Calze a rete
- Bocchino da sigaretta lungo (accessorio, non funzionale!)

**Trucco e Capelli:**
- Rossetto rosso scuro o bordeaux
- Sopracciglia sottili e arcuate
- Ombretto fumoso
- Onde a dito o capelli bob lisci
- Rossetto o neo fatto con matita

### Per i Gentiluomini

**Il Look Gangster Dapper:**
- Abito a righe gessate (strisce larghe)
- Panciotto
- Cravatta o papillon
- Cappello fedora o cappello a bombetta
- Bianchi e neri in bianco e nero
- Gemelli da polso
- Orologio da tasca con catena
- Spilla da bavero o garofano

**Tocchi da Gangster:**
- Finto sigaro
- Fondina per pistola giocattolo
- Coppola da giornalaio (per i tirapiedi)
- Ghette

*Consiglio Budget*: I negozi dell'usato sono tesori per i costumi anni '20. Cerca vestiti neri con perline, camicie bianche e panciotti!

## Cocktail e Menu: Speakeasy Autentico

### Bevande in Stile Proibizione

**Cocktail Classici anni '20:**
- **Bee's Knees**: Gin, miele, limone
- **Sidecar**: Cognac, Cointreau, succo di limone
- **French 75**: Gin, champagne, succo di limone, zucchero
- **Mary Pickford**: Rum bianco, succo d'ananas, granatina, maraschino
- **Gin Rickey**: Gin, lime, soda
- **Old Fashioned**: Whiskey, angostura, zucchero, arancia

**Mocktail per Chi Non Beve:**
- "Gin" di Bagno Analcolico: Acqua tonica con lime e gin botanico analcolico
- Shirley Temple con una svolta: Ginger ale, granatina, ciliegia, lime
- Limonata al Mirtillo: Limonata frizzante con sciroppo di mirtillo

**Presentazione:**
- Servi in coppette vintage o tazze da tè
- Guarnisci con nastri di scorza di limone e ciliegie
- Usa shaker cocktail d'argento
- Etichetta le bevande con nomi creativi che si collegano al tuo mistero

### Menu Alimentare

**Finger Food in Stile anni '20:**
- **Tartine**: Pane tostato con paté, salmone affumicato o tartare di bistecca
- **Uova alla Diavola**: Classiche con paprika
- **Ostriche Rockefeller**: Se ti senti stravagante
- **Olive e Formaggio**: Serviti su assi di legno
- **Crocchette**: Gamberi, granchio o pollo
- **Vol-au-vent**: Bocconcini di pasta sfoglia con ripieni salati
- **Fette di Manzo Wellington**: Porzioni piccole
- **Salatini e Olive Marinate**

**Dolci:**
- Piccole fette di torta al cioccolato
- Macarons
- Praline e cioccolatini in scatole decorative
- Tartufi al cioccolato
- Petit fours

*Consiglio per Servire*: Usa vassoi d'argento, alzate a strati e piatti d'argento per quella sensazione di lusso underground!

## Musica: La Colonna Sonora Perfetta dello Speakeasy

### Playlist Essenziale

**Jazz Classico degli anni '20:**
- Louis Armstrong - "West End Blues"
- Duke Ellington - "Mood Indigo"
- Bessie Smith - "St. Louis Blues"
- Jelly Roll Morton - "Black Bottom Stomp"
- King Oliver's Creole Jazz Band - "Dippermouth Blues"

**Musica da Ballo:**
- "Charleston" - varie versioni
- "Ain't Misbehavin'" - Fats Waller
- "Puttin' on the Ritz" - Harry Richman
- "I Wanna Be Loved by You" - Helen Kane

**Opzioni Moderne con Atmosfera anni '20:**
- Postmodern Jukebox (versioni jazz di canzoni moderne)
- Caravan Palace (electro swing)
- Caro Emerald
- Tape Five

*Consiglio Pro*: Mantieni la musica abbastanza bassa da permettere la conversazione ma abbastanza alta da creare atmosfera. Durante le rivelazioni drammatiche, abbassa completamente la musica!

## Attività e Intrattenimento

### Oltre il Mistero

**Gioco d'Azzardo Clandestino:**
Allestisci tavoli da gioco con:
- Blackjack (usa chip di poker come valuta)
- Roulette
- Poker
- Liar's Dice

*Nota*: Usa soldi falsi, non veri!

**Angolo Fotografico:**
Crea uno sfondo in stile speakeasy con:
- Tendine di velluto o muro di mattoni finto
- Accessori: cappelli fedora, boa di piume, finti soldi, pistole giocattolo
- Cartelli con citazioni anni '20
- Poltrone vintage o divano

**Intrattenimento dal Vivo:**
Se il budget lo permette:
- Cantante di jazz o band
- Ballerini di Charleston
- Mago (molto popolare negli speakeasy!)
- Pianista che suona ragtime

### Concorso Costumi

Assegna premi per:
- Miglior Costume Maschile
- Miglior Costume Femminile
- Coppia Meglio Abbinata
- Costume Più Autentico
- Personaggio Più Creativo

## Indizi e Meccaniche di Gioco

### Tipi di Indizi per il Tuo Mistero Speakeasy

**Indizi Fisici:**
- Biglietti da visita con scritte criptiche
- Registri del contrabbando
- Foto compromettenti
- Lettere di ricatto
- Ricevute da tabacchi (coperture per speakeasy)
- Biglietti d'ingresso con note sul retro
- Bottiglie di veleno etichettate
- Petali di garofano rosso (firma del gangster?)

**Indizi Interattivi:**
- Il barista ha visto qualcuno manomettere un drink
- La cantante ha sentito una discussione nel camerino
- Il buttafuori ricorda chi è partito quando
- Il pianista ha notato qualcosa di strano

### Sistemi di Distribuzione degli Indizi

**Metodo 1: Posizionamento Nascosto**
- Nascondi gli indizi in tutta la festa
- Gli ospiti li trovano durante i giri

**Metodo 2: Distribuzione Programmata**
- Consegna nuovi indizi all'inizio di ogni giro
- Assicurati che tutti abbiano le stesse informazioni

**Metodo 3: Approccio Basato sui Personaggi**
- Ogni personaggio riceve informazioni uniche
- Devono condividere (o nascondere) ciò che sanno

*Consiglio Pro*: Usa tutti e tre i metodi per varietà e coinvolgimento!

## Tempistica: Pianificare la Tua Serata Perfetta

### Programma di Esempio (Festa di 4 Ore)

**19:00 - 19:30**: Arrivi e Cocktail
- Gli ospiti danno le parole d'ordine
- Ricevono le schede dei personaggi
- Prendono il primo drink

**19:30 - 20:00**: Cena e Presentazioni dei Personaggi
- Buffet o pasti serviti
- Ogni ospite presenta il proprio personaggio

**20:00 - 20:15**: Il Delitto!
- Messa in scena drammatica della scoperta del corpo
- Lettura della scena del delitto

**20:15 - 21:00**: Primo Giro Investigativo
- Distribuzione indizi
- Interrogatori
- Raccolta informazioni

**21:00 - 21:15**: Pausa con Intrattenimento
- Esibizione musicale
- Aggiornamenti
- Ricarica cocktail

**21:15 - 21:45**: Secondo Giro Investigativo
- Nuovi indizi rivelati
- Intensificazione del dramma
- Formazione delle alleanze

**21:45 - 22:15**: Accuse Finali e Rivelazione
- Ogni ospite fa la sua accusa
- Rivelazione drammatica dell'assassino
- Spiegazione del movente

**22:15 - 23:00**: Festeggiamenti Post-Rivelazione
- Premiazione
- Ballo aperto
- Dessert e digestivi

## Consigli di Budget: Glamour Speakeasy Economico

### Decorazioni Economiche

- **DIY Art Déco**: Stampa motivi geometrici, incornicia in cornici economiche
- **Libri dell'Usato**: Impila vecchi libri con copertina rigida come decorazione
- **Illuminazione da Dollar Store**: Luci natalizie dorate o lampadine vintage economiche
- **Piume Fai-da-Te**: Acquista piume sfuse online, crea centrotavola
- **Tenda di Frange Nere**: Fai le tue con nastro nero e orli sfrangiati

### Costumi Economici

- **Base Nera**: Inizia con un vestito o abito nero semplice
- **Aggiungi Scintillio**: Attacca paillettes o frange con la pistola per colla a caldo
- **Accessorizza**: Negozi dell'usato per perle, cappelli, guanti
- **DIY Fascia**: Usa elastico nero e un fermaglio decorativo

### Risparmi su Cibo e Bevande

- **Bevande Batch**: Fai grandi lotti di un cocktail invece di singole porzioni
- **Dita Semplici**: Concentrati su 2-3 finger food fatti bene piuttosto che molte opzioni
- **Fornitori Economici**: Trader Joe's, Costco e Aldi hanno ottime opzioni da festa

## Errori Comuni da Evitare

### Cosa Non Fare

**1. Sovraccaricare il Mistero**
- Non rendere la trama troppo complicata
- Limitati a 8-12 sospetti principali
- Mantieni i moventi chiari

**2. Illuminazione Insufficiente**
- L'atmosfera soffusa è fantastica, ma le persone devono vedere gli indizi
- Posiziona luci da lettura vicino alle aree indizio

**3. Cattiva Gestione del Tempo**
- Non lasciare che i giri durino troppo a lungo
- Mantieni slancio con rivelazioni programmate
- Impostare timer per ogni fase

**4. Dimenticare Chi Non Beve**
- Offri sempre mocktail altrettanto belli
- Non far sentire nessuno escluso dall'esperienza speakeasy

**5. Dettagli Storici Imprecisi**
- Fai ricerca di base (gli speakeasy non suonavano musica rock!)
- Ma non essere eccessivamente preciso - il divertimento viene prima

## Lista di Controllo Finale: Una Settimana Prima

### 7 Giorni Prima:
- [ ] Finalizza lista ospiti e conferma partecipazione
- [ ] Completa tutte le schede dei personaggi
- [ ] Prepara tutti gli indizi
- [ ] Ordina eventuali decorazioni dell'ultimo minuto
- [ ] Pianifica menu e lista della spesa

### 3 Giorni Prima:
- [ ] Compra tutti i viveri non deperibili
- [ ] Testa le ricette dei cocktail
- [ ] Allestisci decorazioni che non rovinano
- [ ] Prepara playlist musicale
- [ ] Stampa cartelli e accessori

### 1 Giorno Prima:
- [ ] Compra cibi deperibili
- [ ] Prepara quanto più cibo possibile
- [ ] Completa tutte le decorazioni
- [ ] Allestisci angolo foto
- [ ] Carica tutti i dispositivi

### Giorno della Festa:
- [ ] Preparazione finale del cibo
- [ ] Luci e musica di prova
- [ ] Nascondi indizi se applicabile
- [ ] Vestiti prima che arrivino gli ospiti
- [ ] Ultimo controllo dell'ingresso segreto

## Riflessioni Finali

Creare una festa a tema giallo in stile speakeasy anni '20 riguarda più che semplici costumi e decorazioni: si tratta di trasportare i tuoi ospiti in un'altra era, dove glamour incontra pericolo e tutti hanno qualcosa da nascondere. Le feste speakeasy di maggior successo che ho organizzato hanno condiviso un filo comune: attenzione ai dettagli che conta.

Non serve un budget enorme o uno spazio gigantesco. Serve passione per l'era, volontà di abbracciare il dramma e impegno a creare esperienze memorabili per i tuoi ospiti. Quando quella porta segreta si apre e i tuoi amici entrano nel tuo speakeasy accuratamente preparato, quando quel primo indizio viene rivelato e vedi i loro occhi brillare di eccitazione, saprai che ne è valsa la pena.

Quindi raccogli le tue piume, lucida i tuoi bianchi e neri, raffredda quello champagne (o ginger ale!), e preparati a organizzare una festa che i tuoi ospiti ricorderanno per anni. L'era dei ruggenti anni venti attende!

Ora, se mi scusi, ho un omicidio da pianificare e un contrabbandiere da accusare. Tutta in una notte di lavoro in uno speakeasy!

*Saluti dalle profondità clandestine!*`;

  const italianPost = {
    title: italianTitle,
    slug: IT_SLUG,
    content: italianContent,
    meta_description: italianMetaDescription,
    language: 'it',
    status: 'published',
    author: 'Mystery Maker Party Team',
    tags: englishPost.tags,
    theme: englishPost.theme,
    featured_image_url: englishPost.featured_image_url,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('📤 Inserting Italian post...');

  const insertResponse = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(italianPost)
  });

  if (!insertResponse.ok) {
    const error = await insertResponse.text();
    throw new Error(`Failed to insert: ${error}`);
  }

  const result = await insertResponse.json();
  console.log('✅ SUCCESS! Italian post inserted:');
  console.log(`   ID: ${result[0].id}`);
  console.log(`   Slug: ${result[0].slug}`);
  console.log(`   Title: ${result[0].title}`);
}

main().catch(console.error);
