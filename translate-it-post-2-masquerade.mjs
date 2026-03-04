#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless';
const IT_SLUG = '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless-it';

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
  const italianTitle = '5 Temi per Feste a Tema Giallo in Maschera Che Lasceranno i Tuoi Ospiti Senza Parole';
  const italianMetaDescription = 'Scopri 5 temi mozzafiato per feste a tema giallo in maschera, dal ballo veneziano alle storie gotiche, con consigli su costumi, decorazioni e misteri avvincenti.';

  const italianContent = `# 5 Temi per Feste a Tema Giallo in Maschera Che Lasceranno i Tuoi Ospiti Senza Parole

C'è qualcosa di innegabilmente affascinante in una festa in maschera. Le maschere elaborate, l'aria di mistero, le identità nascoste - è come se tutti i tuoi ospiti diventassero personaggi in una storia vivente. Ora, combina quella magia con un mistero da risolvere, e hai creato un'esperienza davvero indimenticabile.

Dopo aver organizzato dozzine di feste a tema giallo in maschera nel corso degli anni, ho scoperto che il tema giusto può trasformare una buona festa in una spettacolare. Non si tratta solo di dire alle persone di indossare maschere - si tratta di creare un mondo immersivo in cui mistero e masquerade si fondono perfettamente.

In questa guida, condividerò cinque temi straordinari per feste a tema giallo in maschera che ho perfezionato attraverso tentativi ed errori, ognuno con il suo sapore unico, i suoi consigli sui costumi e trame di mistero su misura. Che tu stia pianificando una serata intima per dieci o una grande festa per trenta, questi temi ti daranno tutto ciò di cui hai bisogno per creare una notte veramente magica.

## 1. Ballo in Maschera Veneziano: Mistero nel Carnevale

### Il Concetto

Trasporta i tuoi ospiti nell'opulenta Venezia del XVIII secolo, dove nobili, commercianti e spy si mescolano durante la famosa stagione del Carnevale. Le elaborate maschere veneziane forniscono la copertura perfetta per intrigo, inganno e, naturalmente, omicidio.

### Perché Funziona

I balli in maschera veneziani sono sinonimi di eccesso, lusso e segreti. La tradizione storica dell'anonimato dietro le maschere si traduce magnificamente in un mistero, dove le identità nascoste non sono solo tematiche ma integrali alla trama.

### Configurazione della Trama di Mistero

**La Scena:**
Durante un grande ballo in maschera a Palazzo Contarini, un ricco mercante veneziano viene trovato morto nella sua camera privata, apparentemente avvelenato durante i festeggiamenti.

**I Sospetti:**
- Una contessa decaduta con debiti di gioco
- Un commerciante rivale che vuole monopolizzare le rotte commerciali
- Un'amante scorned mascherata da nobildonna
- Una spia straniera sotto copertura
- Il medico della famiglia con conoscenza dei veleni
- Un gondoliere che ha sentito segreti
- La maschera maker con accesso a tutti
- Un erede impaziente

**Indizi Unici:**
- Piume specifiche delle maschere lasciate sulla scena
- Note cifrate nascoste nei programmi da ballo
- Versi di vino con residui di veleno
- Ricevute di transazioni da mascherai
- Messaggi segreti in maschere decorative

### Elementi di Costume Essenziali

**Per le Dame:**
- Abiti da ballo in stile rococò (noleggiabili o DIY con gonne ampie)
- Maschere veneziane elaborate (Colombina, Volto, o Bauta)
- Parrucche ornate o capelli powder-style
- Ventagli decorativi
- Guanti lunghi in satin
- Gioielli drammatici

**Per i Gentiluomini:**
- Abiti storici con gilet elaborate
- Maschere veneziane (Bauta o Medico della Peste per drammaticità)
- Cappelli a tricorno
- Bastoni da passeggio
- Mantelli o cappe
- Scarpe con fibbie

**Tip di Budget:** Le maschere veneziane di base possono essere acquistate online per €10-20, poi personalizzate con piume, perline e vernice spray oro.

### Decorazioni

**Elementi Must-Have:**
- Tessuti opulenti in rosso, oro e viola
- Pilastri o colonne finti per quel feeling da palazzo
- Candelabri (veri o a LED)
- Maschere decorative appese alle pareti
- Motivi a diamante dorati
- Tende di velluto o voilage
- Gondole in miniatura come centrotavola

**Illuminazione:**
Usa candelabri, applique e illuminazione ambrata calda. Evita le luci bianche dure - pensa al bagliore delle candele.

**Musica:**
Classica barocca (Vivaldi, ovviamente!), musica da camera veneziana, o interpretazioni moderne della musica rinascimentale.

### Menu

**Antipasti:**
- Cichetti (piccoli stuzzichini veneziani)
- Carpaccio
- Risotto al nero di seppia
- Fritole (frittelle veneziane)

**Bevande:**
- Bellini (prosecco e purea di pesca)
- Spritz veneziano
- Vini italiani
- Cioccolata calda speziata (storica a Venezia)

## 2. Ballo Gotico della Mezzanotte: Romanticismo Oscuro e Omicidio

### Il Concetto

Pensa a Edgar Allan Poe incontra Jane Austen. Questo tema combina l'eleganza dei balli dell'era della Reggenza con l'atmosfera inquietante del romanticismo gotico. È perfetto per chi ama la bellezza oscura e il dramma teatrale.

### Perché Funziona

L'estetica gotica si presta naturalmente al mistero. Le ombre, i segreti di famiglia e l'atmosfera lievemente sinistra creano tensione perfetta per una trama di omicidio.

### Configurazione della Trama di Mistero

**La Scena:**
Il signore di un castello decadente tiene il suo primo ballo da decenni. A mezzanotte, mentre l'orologio batte dodici, urla echeggiano dalla torre est - la padrona di casa è stata trovata morta, il suo corpo rigido in un vestito vittoriano.

**I Sospetti:**
- Il fratello estranged che vuole l'eredità
- La promessa sposa che ha sposato per denaro
- Il custode della tenuta con segreti oscuri
- Una medium che ha previsto la morte
- Il dottore di famiglia con collegamenti al passato
- Un cugino lontano recentemente riapparso
- La governante che sa troppo
- Un cacciatore di fantasmi che indaga la tenuta

**Indizi Unici:**
- Pagine strappate da un diario antico
- Ritratti di famiglia con dettagli rivelatori
- Chiavi scheletro da stanze sigillate
- Messaggi scritti in inchiostro scomparso
- Cimeli di famiglia con importanza nascosta
- Fotografie vittoriane con indizi
- Scatole musicali con scomparti segreti

### Elementi di Costume Essenziali

**Per le Dame:**
- Abiti neri, bordeaux o viola scuro in stile vittoriano/Reggenza
- Maschere ornate in merletto nero o argento
- Veli o copricapi
- Collane choker o gioielli in stile vittoriano
- Guanti in pizzo
- Ombrelli parasole decorativi

**Per i Gentiluomini:**
- Abiti neri con gilet riccamente decorati
- Camicie bianche con volant
- Maschere nere eleganti
- Mantelli o frac
- Bastoni da passeggio con teste decorate
- Cappelli a cilindro
- Spille da cravatta vittoriane

### Decorazioni

**Elementi Must-Have:**
- Candelabri con candele nere
- Rose scure (rosse profonde, bordeaux, nere)
- Specchi antichi con cornici ornate
- Ragnatele finte (sottili, non Halloween kitsch)
- Gabbie per uccelli vintage
- Libri antichi impilati
- Teschi decorativi (eleganti, non spaventosi)
- Tende di pizzo nero
- Ritratti in cornici dorate

**Illuminazione:**
Luci dim con illuminazione viola o blu. Usa candele senza fiamma abbondantemente. Crea ombre drammatiche.

**Musica:**
Piano dark, musica classica inquietante, valzer gotici, o band come Dead Can Dance, Sopor Aeternus.

### Menu

**Cibo:**
- "Pozioni" servite in boccette vintage
- Dessert neri (torta al cioccolato nero, macarons neri)
- Canapé serviti su vassoi argentati
- "Sangue" (vino rosso o succo) in calici
- Charcuterie gotica con formaggi scuri, frutti di bosco

**Bevande:**
- Vino rosso sangue
- Cocktail neri (carbone attivo o colorante nero)
- Absinthe servita tradizionalmente
- Velvet Hammer (vodka, crema di cacao)

## 3. Grande Ballo di Gatsby: Jazz Age Glamour e Tradimento

### Il Concetto

Porta il glamour degli anni '20 ruggenti a un livello successivo con un mistero in maschera in stile Great Gatsby. Combina lusso art déco, musica jazz e maschere elaborate per un'esperienza davvero opulenta.

### Perché Funziona

Gli anni '20 erano già pieni di segreti (Proibizione, speakeasy, moralità mutevole). Aggiungere maschere intensifica il tema dell'identità nascosta e della vita doppia.

### Configurazione della Trama di Mistero

**La Scena:**
Un magnate milionario tiene una grande festa in maschera nella sua tenuta di Long Island. Al culmine della festa, viene trovato morto nella sua biblioteca privata, ucciso con un vaso art déco.

**I Sospetti:**
- La moglie trofeo con un amante segreto
- Il partner commerciale al verde
- Una flapper che è segretamente sua figlia
- Il fornitore di contrabbando che è stato tradito
- Un giornalista mascherato da ospite
- La cantante di jazz gelosa
- Un rivale negli affari
- L'agente del Proibizionismo sotto copertura

**Indizi Unici:**
- Stemmi lasciati da maschere specifiche
- Cocktail avvelenati con prove identificabili
- Ricevute di contrabbando
- Foto compromettenti scattate durante la festa
- Note in linguaggio in codice
- Impronte di rossetto su bicchieri

### Elementi di Costume Essenziali

**Per le Dame:**
- Abiti flapper con paillettes e frange
- Maschere art déco (forme geometriche, oro, argento)
- Fasce per capelli con piume e perle
- Lunghe collane di perle
- Guanti lunghi
- Stole di pelliccia (finte)
- Bocchini da sigaretta

**Per i Gentiluomini:**
- Smoking con giacche a coda
- Gilet bianchi o dorati
- Papillon
- Cappelli fedora con maschere coordinate
- Scarpe in bianco e nero
- Orologi da tasca
- Gemelli da polso

### Decorazioni

**Elementi Must-Have:**
- Motivi geometrici art déco ovunque
- Oro, nero e argento palette di colori
- Palloncini neri e dorati
- Paillettes sparse sui tavoli
- Piume di pavone in vasi alti
- Perline appese come tendine
- Specchi sunburst vintage
- Poster art déco

**Illuminazione:**
Luci soffuse dorate, lampadine Edison, uplighting art déco, bagliori dorati.

**Musica:**
Jazz degli anni '20 (Louis Armstrong, Duke Ellington), swing, musica di Charleston, o versioni moderne Postmodern Jukebox.

### Menu

**Cibo:**
- Ostriche su ghiaccio
- Canapé decadenti
- Bistecche in miniatura
- Tartine caviale
- Petit fours
- Torte a strati art déco

**Bevande:**
- Cocktail classici anni '20 (Sidecar, Bee's Knees, French 75)
- Champagne servito in coppe
- Gin servito da fiasche decorative
- Mocktail per chi non beve

## 4. Ballo di Mezzanotte di Midsummer: Mistero Fatato

### Il Concetto

Combina la magia shakespeariana di Sogno di una Notte di Mezza Estate con un ballo in maschera. Pensa fae, foreste incantate e un mistero che sfuma i confini tra realtà e fantasia.

### Perché Funziona

L'elemento fatato permette creatività nelle maschere e nei costumi, mentre il tema del sogno vs. realtà aggiunge strati al tuo mistero. È perfetto per serate estive all'aperto.

### Configurazione della Trama di Mistero

**La Scena:**
Durante un ballo di midsummer in un giardino incantato, il re delle fate ospitante viene trovato morto in un boschetto di funghi magici. È stato un omicidio mortale, o qualcosa di più soprannaturale?

**I Sospetti:**
- La regina delle fate con secoli di risentimento
- Un changeling che cerca vendetta
- Un mortale che è inciampato sul regno delle fate
- Un folletto dispettoso andato troppo oltre
- Una ninfa dei boschi che protegge la natura
- Il miglior consigliere delle fate con ambizioni regali
- Un cacciatore di fate umano
- Un ex amante bannished

**Indizi Unici:**
- Polvere di fate magica (glitter) lasciata indietro
- Corone di fiori con fiori specifici
- Cibo incantato con effetti strani
- Messaggi in linguaggio delle fate
- Funghi disposti in pattern
- Ali di fata danneggiate
- Amuleti di protezione

### Elementi di Costume Essenziali

**Per le Dame:**
- Abiti fluidi eterei in tonalità pastello o gioiello
- Maschere adornate con fiori, foglie, rami
- Corone di fiori
- Ali (farfalla, libellula, o fata)
- Piedi nudi o sandali decorati
- Accessori floreali
- Glitter e body paint

**Per i Gentiluomini:**
- Tuniche o gilet in colori terrosi
- Maschere con elementi naturali (corna, foglie, muschio)
- Corone di foglie o rami
- Pantaloni o calzoni in toni naturali
- Ali (facoltativo)
- Stivali o piedi nudi
- Accessori in legno

### Decorazioni

**Elementi Must-Have:**
- Molti fiori (veri o di alta qualità finti)
- Viti e vegetazione che si arrampica
- Luci fatate ovunque
- Funghi decorativi
- Lanterne appese agli alberi
- Tessuti trasparenti fluttuanti
- Cristalli e pietre naturali
- Nidi di uccelli e piume
- Gabbie per uccelli vintage con vegetazione

**Illuminazione:**
Luci fatate, luci LED a cambiamento colore, lanterne, bagliore bioluminescente (luci UV con vernici), candele dappertutto.

**Musica:**
Musica celtica, arpe, flauti, band fantasy come Loreena McKennitt, musica ambientale della foresta.

### Menu

**Cibo:**
- Focaccine e torte al miele
- Frutta fresca (fragole, uva, bacche)
- Formaggi a pasta molle con noci
- Pasticcini floreali
- Torte fatate (cupcakes decorati)
- Gelatine e confetture
- Acqua floreale gelée

**Bevande:**
- Idromele o bevande ispirate al miele
- Tè floreali
- Cocktail lavanda
- Nectar di bacche
- Bevande glitterate
- Acqua infusa con fiori commestibili

## 5. Ballo in Maschera Steampunk: Mistero Vittoriano Futuristico

### Il Concetto

Combina l'eleganza vittoriana con la fantascienza retro-futuristica. Pensa ingranaggi, occhiali, dirigibili e omicidio. È perfetto per ospiti che amano creatività e immaginazione.

### Perché Funziona

Lo steampunk offre libertà creativa infinita mentre mantiene eleganza storica. Gli elementi fantascientifici permettono indizi e armi del delitto unici.

### Configurazione della Trama di Mistero

**La Scena:**
A bordo del dirigibile di lusso "Aether Queen", un famoso inventore tiene un ballo in maschera. A mezzanotte, viene trovato morto nel suo laboratorio, apparentemente ucciso da una delle sue stesse invenzioni.

**I Sospetti:**
- Un inventore rivale che ha rubato progetti
- Un pilota di dirigibile con un passato misterioso
- Un capitano di nave del cielo
- Una spia industriale sotto copertura
- Un meccanico con rancore
- Una baronessa che ha investito fortune
- Un ingegnere che è stato licenziato
- Un viaggiatore del tempo (forse!)

**Indizi Unici:**
- Progetti di macchine con modifiche
- Parti di ingranaggi da dispositivi specifici
- Messaggi codificati tramite telegrafo
- Foto sepia con indizi nascosti
- Accessori orologeria fermati a tempi specifici
- Residui di oli industriali
- Campioni di vapore con tracce chimiche

### Elementi di Costume Essenziali

**Per le Dame:**
- Abiti vittoriani con elementi steampunk (ingranaggi, cinture, cinghie)
- Corsetti su camicie
- Maschere con occhiali o ingranaggi attaccati
- Occhiali o occhiali da aviatore
- Cappelli da mini-cilindro
- Scarpe con stivaletti
- Armi giocattolo (pistole a vapore, spade)
- Gioielli in ingranaggi

**Per i Gentiluomini:**
- Abiti vittoriani con gilet ingranaggi
- Camicie con volant
- Maschere con elementi meccanici
- Cappelli a cilindro con occhiali
- Cappotti lunghi o mantelli
- Armi giocattolo steampunk
- Orologi da tasca multipli
- Accessori in pelle

### Decorazioni

**Elementi Must-Have:**
- Ingranaggi di tutte le dimensioni
- Tubi in rame e ottone
- Orologi vintage e parti di orologi
- Mappe e globi antichi
- Strumenti scientifici vintage
- Palette di colori in bronzo, rame, marrone
- Lampadine Edison esposte
- Vecchie macchine da scrivere e strumenti
- Dirigibili in miniatura o modelli

**Illuminazione:**
Luci Edison, illuminazione industriale, illuminazione ambrata, spotlight in ottone.

**Musica:**
Musica steampunk (Abney Park, Steam Powered Giraffe), valzer vittoriani con elementi moderni, electro-swing.

### Menu

**Cibo:**
- Cibo britannico vittoriano (meat pies, Scotch eggs)
- Servizio da tè con scones
- Formaggi e crackers
- Stuzzichini serviti in contenitori ingranaggi
- Dessert a tema ingranaggi
- Torte servite con vapore finto

**Bevande:**
- Tè e caffè in service da ingranaggi
- Cocktail steampunk (fumanti o con ghiaccio secco)
- Gin vittoriano e tonic
- Birre artigianali
- Succhi in bottiglie vintage

## Elementi Essenziali per Qualsiasi Festa in Maschera Mistero

Indipendentemente dal tema che scegli, questi elementi sono cruciali per il successo:

### La Grande Rivelazione delle Maschere

Pianifica un momento drammatico (di solito alla fine) quando le maschere vengono rimosse. Questo può rivelare:
- Identità nascoste
- Colpevoli in incognito
- Relazioni sorprendenti
- Indizi finali

### Concorso Maschere

Assegna premi per:
- Maschera più elaborata
- Migliore maschera tema
- Maschera più creativa
- Abbinamento migliore costume-maschera

### Elementi di Mistero Specifici per Maschere

- Usa le maschere come indizi (piume, colori, stili specifici)
- Permetti ai personaggi di cambiare maschere (confusione di identità!)
- Includi una "maschera dell'assassino" che appare in foto/descrizioni
- Crea identità segrete legate alle scelte di maschere

### Fotografia

Allestisci:
- Un backdrop tematico
- Accessori relativi al tema
- Illuminazione corretta per maschere (evita troppa ombra)
- Angolo Polaroid per ricordi istantanei

## Consigli per Organizzare il Tuo Ballo in Maschera Mistero

### 3 Mesi Prima
- Scegli il tema
- Definisci budget
- Crea lista ospiti
- Prenota location (se necessario)
- Ordina maschere personalizzate (se vuoi)

### 6 Settimane Prima
- Invia inviti con codice abbigliamento chiaro
- Scrivi trama mistero e schede personaggio
- Ordina decorazioni
- Pianifica menu

### 2 Settimane Prima
- Finalizza RSVP
- Assegna schede personaggio
- Crea tutti gli indizi
- Compra cibo non deperibile
- Testa playlist musicale

### 1 Settimana Prima
- Prepara decorazioni
- Stampa tutti i materiali mistero
- Prova costumi
- Crea programma dettagliato

### Giorno della Festa
- Allestisci decorazioni 4-6 ore prima
- Nascondi indizi appropriatamente
- Testa illuminazione e musica
- Preparazione finale cibo
- Vestiti completamente prima degli arrivi

## Errori Comuni da Evitare

### 1. Maschere Scomode
Assicurati che le maschere abbiano:
- Elastici corretti (non troppo stretti)
- Taglio occhi adeguato
- Peso bilanciato
- Capacità di respirare e parlare
- Opzioni per rimuoverle durante cena

### 2. Trame Troppo Complesse
Mantieni il mistero:
- Diretto (massimo 8 sospetti principali)
- Tematico (tutto si lega al tema maschera)
- Risolvibile (indizi chiari disponibili)
- Flessibile (se gli ospiti perdono cose)

### 3. Illuminazione Inadeguata
Bilancia atmosfera con praticità:
- Abbastanza buio per atmosfera
- Abbastanza chiaro per leggere indizi
- Illuminazione task per aree di gioco
- Bagno ben illuminato

### 4. Trascurare Chi Non Indossa Maschere
Fornisci:
- Maschere extra per chi dimentica
- Opzioni semplici (maschere domino)
- Alternative (veli, ventagli)
- Nessun giudizio!

### 5. Cattiva Gestione del Tempo
- Non lasciare che la cena duri troppo a lungo
- Programma rivelazioni indizi
- Pianifica transizioni tra giri
- Concludi prima che le persone si stanchino

## Riflessioni Finali

Una festa in maschera a tema giallo ben eseguita crea ricordi che durano tutta la vita. I tuoi ospiti ricorderanno la magia di entrare in un altro mondo, l'emozione di risolvere il mistero e l'assoluto divertimento di essere qualcun altro per una notte.

La chiave del successo non è solo scegliere un tema - è abbracciarlo completamente. Quando le tue decorazioni, costumi, cibo, musica e mistero lavorano tutti insieme per creare un'esperienza coesa, tutto diventa magico.

Quindi scegli il tuo tema, pianifica quella trama di omicidio, ordina quelle maschere e preparati a organizzare una festa che farà parlare le persone per anni. Dopotutto, c'è qualcosa di intrinsecamente trasformativo nell'indossare una maschera - ti permette di essere più audace, più misterioso, più teatrale.

E chi lo sa? Forse scoprirai che il vero mistero non è chi ha commesso l'omicidio, ma chi si nasconde davvero dietro ogni maschera.

Ora vai, crea il tuo mondo magico. Il ballo in maschera ti aspetta!`;

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
