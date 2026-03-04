#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = 'how-to-fix-confusing-murder-mystery-clues';
const IT_SLUG = 'how-to-fix-confusing-murder-mystery-clues-it';

async function main() {
  console.log('📥 Fetching English post...');
  const response = await fetch(`${SUPABASE_URL}?language=eq.en&status=eq.published&slug=eq.${EN_SLUG}&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });

  const data = await response.json();
  if (data.length === 0) throw new Error('English post not found');

  const englishPost = data[0];
  console.log('✅ English post fetched');
  console.log(`   Title: ${englishPost.title}`);
  console.log(`   Content: ${englishPost.content.length} chars\n`);

  const checkResponse = await fetch(`${SUPABASE_URL}?language=eq.it&slug=eq.${IT_SLUG}&select=id`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });

  const existing = await checkResponse.json();
  if (existing.length > 0) {
    console.log('⏭️  Italian version already exists. Skipping.');
    return;
  }

  const italianTitle = 'Come Risolvere gli Indizi Confusi nei Gialli: Guida alla Chiarezza';
  const italianMetaDescription = 'Scopri come identificare e correggere indizi confusi nelle tue feste a tema giallo. Tecniche pratiche per creare enigmi chiari, logici e risolvibili che i tuoi ospiti adoreranno.';

  const italianContent = `# Come Risolvere gli Indizi Confusi nei Gialli

Hai mai visto i tuoi ospiti fissare un indizio con quella espressione vuota e confusa? Quella sensazione frustrante quando nessuno riesce a progredire nel mistero perché l'indizio è semplicemente troppo oscuro, troppo vago o troppo complicato da decifrare?

Io sì. Troppe volte.

Dopo aver organizzato dozzine di feste a tema giallo e aver assistito a innumerevoli volte ospiti frustranti bloccati su indizi mal costruiti, ho imparato una verità fondamentale: gli indizi confusi non rendono il tuo mistero più intelligente o più impegnativo. Rendono solo i tuoi ospiti frustrati e disimpegnati.

La buona notizia? Gli indizi confusi sono incredibilmente facili da risolvere una volta che sai cosa cercare. In questa guida, ti mostrerò esattamente come identificare indizi problematici, perché non funzionano e, cosa più importante, come trasformarli in enigmi chiari e soddisfacenti che i tuoi ospiti ameranno davvero risolvere.

## Perché gli Indizi Confusi Rovinano le Feste a Tema Giallo

Prima di addentrarci nelle soluzioni, capiamo perché questo è importante. Gli indizi confusi creano un effetto domino di problemi:

### Il Ciclo della Frustrazione

1. **Gli Ospiti Si Bloccano**: Non riescono a risolvere l'indizio
2. **Il Slancio Si Ferma**: Il mistero si ferma
3. **Le Persone Si Disimpegnano**: Smettono di provare
4. **Inizia la Socializzazione Casuale**: Ignorano il gioco
5. **Il Mistero Muore**: Nessuno si preoccupa più del risultato

### L'Impatto Emotivo

Quando gli indizi sono confusi, gli ospiti:
- Si sentono stupidi (non lo sono - l'indizio è difettoso!)
- Perdono fiducia nelle proprie capacità deduttive
- Smettono di investire emotivamente nel mistero
- Si risentono per aver speso tempo su qualcosa che non ha senso

### La Differenza Tra Sfida e Confusione

**Indizi Impegnativi:**
- Richiedono pensiero critico
- Hanno soluzioni logiche
- Ricompensano l'attenzione ai dettagli
- Fanno sentire intelligenti le persone quando li risolvono

**Indizi Confusi:**
- Mancano informazioni necessarie
- Hanno logica difettosa
- Dipendono da conoscenze oscure
- Fanno sentire frustrate le persone

## I 7 Tipi di Indizi Confusi (E Come Risolverli)

### 1. Il Salto Logico Impossibile

**Il Problema:**
L'indizio richiede ai giocatori di fare una connessione che non ha fondamenta logiche stabilite.

**Esempio di Indizio Difettoso:**
"La vittima aveva un garofano rosso nella tasca. Questo indica chiaramente che l'assassino è il giardiniere."

Perché? I garofani rossi sono solo fiori. Perché indicherebbero il giardiniere specificamente? Potrebbero significare letteralmente chiunque ami i fiori, chiunque abbia regalato fiori, chiunque lavori in una fioreria, o semplicemente a qualcuno piacevano i garofani rossi.

**Come Risolverlo:**
Stabilisci connessioni chiare prima:

"Durante il cocktail party, il giardiniere si è vantato che i suoi garofani rossi avevano vinto il primo premio. 'Sono gli unici nella tenuta,' ha detto. Più tardi, un singolo garofano rosso è stato trovato nella tasca della vittima - fresco tagliato, con il terriccio ancora sul gambo."

**Checklist di Risoluzione:**
- [ ] L'informazione è stata stabilita prima nel gioco
- [ ] La connessione è logica, non speculativa
- [ ] Dettagli specifici rendono unica l'associazione
- [ ] Gli altri giocatori possono seguire il ragionamento

### 2. L'Indizio Che Richiede Conoscenza Oscura

**Il Problema:**
L'indizio presuppone conoscenze specialistiche che gli ospiti medi non avranno.

**Esempio di Indizio Difettoso:**
"Le fibre trovate sulla scena sono chiffon di seta tinta con tintura di cocciniglia. Solo la Signora Thornbury indossa tali tessuti."

A meno che i tuoi ospiti siano esperti tessili, non avranno idea di cosa significhi questo. L'hanno impostato per il fallimento.

**Come Risolverlo:**
Rendi le informazioni specialistiche accessibili:

"Le fibre rosso brillante trovate sulla scena del crimine sembrano familiari. Un indizio separato rivela: un programma dal catalogo di moda della Signora Thornbury. Cerchiato in rosso: 'Questo abito esclusivo da sera è realizzato in chiffon di seta tinto con tintura naturale di cocciniglia - non disponibile in nessun altro posto nella regione.'"

**Checklist di Risoluzione:**
- [ ] Informazioni specialistiche fornite nel gioco
- [ ] Molteplici indizi lavorano insieme
- [ ] Non è richiesta conoscenza esterna
- [ ] Dettagli contestuali aiutano la comprensione

### 3. L'Indizio Troppo Vago

**Il Problema:**
L'indizio è così ampio che potrebbe applicarsi a quasi chiunque.

**Esempio di Indizio Difettoso:**
"Un testimone ha visto qualcuno che indossava scuro lasciare la scena."

In una festa a tema giallo, specialmente se ambientata di sera o con abiti formali, TUTTI potrebbero indossare scuro. Questo indizio è inutile.

**Come Risolverlo:**
Aggiungi specifici che restringono le possibilità:

"Un testimone ha visto qualcuno che indossava un abito nero con bottoni d'argento distintivi lasciare la scena alle 22:15. Solo tre ospiti indossano bottoni d'argento: il Colonnello Blackwood, la Signora Sterling e il Dottor Graves. Ma il Colonnello Blackwood era alla sala da biliardo in quel momento, e la Signora Sterling era vista ballare. Questo lascia il Dottor Graves."

**Checklist di Risoluzione:**
- [ ] Dettagli specifici inclusi
- [ ] Campo di sospetti ristretto
- [ ] Informazioni temporali fornite
- [ ] Altre prove aiutano l'eliminazione

### 4. L'Indizio Contraddittorio

**Il Problema:**
Indizi diversi dicono cose diverse, non intenzionalmente come red herring ma per errore.

**Esempio di Indizi Difettosi:**
Indizio 1: "L'assassinio è avvenuto alle 22:00"
Indizio 2: "Il Maggiore Thompson era nella biblioteca alle 22:00, quindi non può essere l'assassino"
Indizio 3: "Il Maggiore Thompson ha lasciato impronte insanguinate lasciando la biblioteca alle 22:15"

Aspetta... se il delitto è stato alle 22:00 e ha lasciato sangue alle 22:15, com'è possibile che il suo alibi per le 22:00 funzioni?

**Come Risolverlo:**
Crea timeline accurate prima di scrivere indizi:

**Timeline Corretta:**
- 21:45: Il Maggiore Thompson entra nella biblioteca
- 21:55: Sparo sentito dalla biblioteca
- 22:00: Ospiti si radunano fuori dalla porta chiusa
- 22:15: Il Maggiore Thompson apre la porta, impronte insanguinate visibili

Ora tutti gli indizi lavorano insieme logicamente.

**Checklist di Risoluzione:**
- [ ] Crea timeline scritta
- [ ] Controlla tutti gli indizi contro la timeline
- [ ] Assicurati che gli alibi siano coerenti
- [ ] Traccia i movimenti di ogni personaggio

### 5. Il Red Herring Che È Troppo Herring

**Il Problema:**
I red herring (false piste) dovrebbero creare sfida, non confusione totale. Quando sono troppo convincenti rispetto alle prove reali, gli ospiti seguono la pista sbagliata e non riescono mai a trovare quella vera.

**Esempio di Indizio Difettoso:**
Creare un'elaborata catena di prove che punta alla Signora Peacock (10+ indizi), mentre l'assassino reale (Colonnello Mustard) ha solo 2 indizi oscuri.

**Come Risolverlo:**
Bilancia i tuoi red herring:

**Struttura Corretta:**
- **Assassino Reale**: 6-7 indizi solidi, alcuni richiedono pensiero
- **Red Herring Principale**: 4-5 indizi sospetti, ma con alibi chiaro se ispezionato
- **Red Herring Minori**: 2-3 indizi ciascuno, facilmente spiegabili

**Checklist di Risoluzione:**
- [ ] Conta gli indizi per ogni sospetto
- [ ] Assicurati che l'assassino reale abbia maggiori prove
- [ ] I red herring hanno spiegazioni chiare
- [ ] Crea "momenti aha" quando i red herring vengono smascherati

### 6. L'Indizio Fisicamente Impossibile

**Il Problema:**
L'indizio richiede qualcosa fisicamente impossibile o estremamente improbabile.

**Esempio di Indizio Difettoso:**
"L'assassino ha dovuto attraversare il salone principale senza essere visto, anche se 30 ospiti stavano ballando lì."

A meno che il tuo assassino abbia un mantello dell'invisibilità, questo non ha senso.

**Come Risolverlo:**
Crea opportunità logiche:

"L'assassino ha attraversato il salone principale durante l'esibizione di fuochi d'artificio alle 21:30. Tutti gli ospiti erano sul balcone guardando il display, lasciando il salone vuoto per esattamente 10 minuti - abbastanza tempo per raggiungere lo studio."

**Checklist di Risoluzione:**
- [ ] Le azioni sono fisicamente possibili
- [ ] Il timing funziona realisticamente
- [ ] Le opportunità sono stabilite
- [ ] Considera le capacità umane normali

### 7. L'Indizio Sovracomplicato

**Il Problema:**
L'indizio richiede così tanti passaggi o conoscenze interconnesse che anche ospiti intelligenti si perdono.

**Esempio di Indizio Difettoso:**
"Il cifrario usa sostituzione ROT-13, ma prima devi decodificare la prima lettera di ogni terza parola nella lettera, quindi applicare il codice Morse ai risultati, poi usare quei numeri come coordinate sulla mappa per trovare dove è nascosta la chiave vera, che apre la cassaforte con il vero indizio."

Questo non è un indizio; è un gioco di fuga di 3 ore.

**Come Risolverlo:**
Semplifica o dividi in passaggi:

**Opzione 1 - Semplifica:**
"La nota nella tasca della vittima è scritta in codice. Fortunatamente, una chiave di decifratura è stata trovata nel suo diario. Decodificata, legge: 'Incontra M a mezzanotte nella biblioteca.'"

**Opzione 2 - Dividi in Giri:**
- **Giro 1**: Trova lettera codificata
- **Giro 2**: Trova chiave di decifratura
- **Giro 3**: Combina per rivelare posizione
- **Giro 4**: Trova indizio finale

**Checklist di Risoluzione:**
- [ ] Massimo 2-3 passaggi per indizio
- [ ] Ogni passaggio è logico
- [ ] Fornisci strumenti di decodifica
- [ ] Testa con qualcuno non familiare

## Il Framework CLEAR per Scrivere Buoni Indizi

Ho sviluppato questo framework per assicurarmi che ogni indizio sia risolvibile:

### C - Connected (Connesso)
Ogni indizio si connette logicamente ad altre informazioni stabilite:
- Si basa su conoscenze precedentemente fornite
- Si collega a dettagli del personaggio stabiliti
- Si riferisce a eventi confermati

### L - Logical (Logico)
La catena di ragionamento ha senso:
- Nessun salto logico richiesto
- Causa ed effetto chiari
- Applicazione di deduzione del mondo reale

### E - Evidence-Based (Basato su Prove)
Informazioni concrete, non speculazione:
- Dettagli specifici, non generalizzazioni
- Prove fisiche quando possibile
- Testimonianze multiple si correlano

### A - Accessible (Accessibile)
Tutte le informazioni necessarie fornite:
- Nessuna conoscenza oscura richiesta
- Il contesto fornito nel gioco
- Strumenti di decodifica inclusi

### R - Reasonably Challenging (Ragionevolmente Impegnativo)
Difficile ma equo:
- Richiede pensiero, non indovinare
- Molteplici linee di ragionamento funzionano
- La soluzione è soddisfacente quando trovata

## Come Testare i Tuoi Indizi Prima della Festa

### Il Test del Partecipante Fresco

Chiedi a qualcuno non familiare con il tuo mistero di:

1. **Leggere Solo l'Indizio**: Possono capire cosa dice?
2. **Spiegare il Collegamento**: Possono articolare come si collega?
3. **Raggiungere una Conclusione**: Arrivano alla risposta prevista?

Se falliscono uno qualsiasi di questi, l'indizio ha bisogno di lavoro.

### Il Test della Logica Inversa

Lavora all'indietro dalla soluzione:

1. Scrivi cosa vuoi che i giocatori concludano
2. Elenca quali informazioni hanno bisogno
3. Identifica dove/come ottengono quelle informazioni
4. Assicurati che nessuna informazione manchi

### Il Test della Timeline

Traccia tutto cronologicamente:

1. Crea timeline ora per ora
2. Segna quando ogni indizio diventa disponibile
3. Verifica che i giocatori abbiano informazioni necessarie prima degli indizi che le richiedono
4. Assicurati che le tempistiche abbiano senso

### Il Test dei Passaggi Multipli

Per indizi complessi:

1. Scrivi ogni passaggio separatamente
2. Verifica che ogni passaggio sia risolvibile
3. Assicurati che gli strumenti/informazioni siano disponibili per ogni passaggio
4. Limita a massimo 3 passaggi totali

## Tecniche di Salvataggio Durante la Festa

Anche con preparazione, a volte gli indizi confondono ancora. Ecco come salvare la situazione:

### Sistema di Indizi a Livelli

Prepara indizi progressivamente più ovvi:

**Livello 1** (Sottile): L'indizio originale
**Livello 2** (Più Chiaro): Aggiunge contesto se bloccati per 10+ minuti
**Livello 3** (Diretto): Praticamente indica la risposta se ancora bloccati

**Esempio:**
- **Livello 1**: "Fibre rosse trovate sulla scena"
- **Livello 2**: "Fibre rosse dal raro abito da sera della Signora Thornbury"
- **Livello 3**: "Fibre rosse che corrispondono esattamente all'abito della Signora Thornbury - solo lei possiede questo tessuto"

### Il Sistema dei "Ricordi Convenienti"

Se gli ospiti sono bloccati, introduce nuove informazioni come flashback:

"Aspetta, mi ricordo ora! Prima durante il cocktail, ho visto il Colonnello vicino all'armadio delle armi..."

### Consultazioni di Personaggi

Permetti ai giocatori di chiedere a personaggi NPC (controllati da te) domande dirette. Fornisci risposte che spingono nella giusta direzione senza dare completamente.

### Il Metodo della Rivisitazione degli Indizi

Quando bloccati, fai rileggere tutti gli indizi insieme. A volte i pattern emergono vedendo tutto contemporaneamente.

## Esempi Prima e Dopo

### Esempio 1: L'Indizio dell'Arma

**PRIMA (Confuso):**
"L'arma era un oggetto contundente dalla biblioteca."

Problema: Ci sono dozzine di oggetti contundenti in una biblioteca (libri, fermalibri, statue, bastoni da passeggio, ecc.)

**DOPO (Chiaro):**
"L'arma era il fermalibri in marmo dalla scrivania della biblioteca - la coppia al leone. L'inventario mostra che solo il Professore aveva accesso alla scrivania chiusa. Il fermalibri mancante crea un vuoto evidente dove dovrebbe essere la coppia."

Perché Funziona:
- Oggetto specifico identificato
- Accesso limitato stabilito
- Prova visiva (coppia mancante)
- Si collega alla prova fisica

### Esempio 2: L'Indizio dell'Alibi

**PRIMA (Confuso):**
"Lady Ashford sostiene di essere nella sala da musica, ma qualcuno l'ha vista altrove."

Problema: Dove? Quando? Chi l'ha vista? Questo è troppo vago.

**DOPO (Chiaro):**
"Lady Ashford sostiene di essere stata nella sala da musica dalle 21:00 alle 22:00, suonando piano. Tuttavia, la cameriera testimonia di aver spolverato il piano alle 21:30 e era freddo al tatto - non suonato di recente. Inoltre, il guardiacaccia l'ha vista camminare nei giardini alle 21:15, indossando il suo distintivo mantello verde."

Perché Funziona:
- Tempi specifici forniti
- Molteplici testimoni
- Prova fisica (piano freddo)
- Dettagli identificativi (mantello verde)

### Esempio 3: L'Indizio del Movente

**PRIMA (Confuso):**
"Il Capitano Waverly aveva ragioni per volere morta la vittima."

Problema: Quali ragioni? Come lo sanno i giocatori?

**DOPO (Chiaro):**
"Una lettera nell'ufficio della vittima rivela che aveva scoperto che il Capitano Waverly vendeva segreti navali a potenze straniere. 'O mi paghi £10,000,' scrive la vittima, 'o invio questa prova all'Ammiragliato domani.' La lettera è datata ieri. Il Capitano sarebbe stato rovinato, imprigionato o peggio."

Perché Funziona:
- Prova fisica (lettera)
- Movente chiaro (ricatto)
- Tempistica urgente (domani)
- Conseguenze stabilite (rovina)

## Tecniche Avanzate di Scrittura degli Indizi

### La Tecnica della Triangolazione

Usa tre fonti indipendenti che puntano alla stessa conclusione:

**Indizio Fisico**: Fibra di tweed sulla scena
**Testimone**: Qualcuno visto in giacca di tweed
**Documentale**: Ricevuta del sarto per giacca di tweed personalizzata

Quando tutte e tre puntano alla stessa persona, la conclusione è solida.

### Il Metodo delle Informazioni a Strati

Rivela informazioni in strati che costruiscono comprensione:

**Strato 1**: "È stato usato veleno"
**Strato 2**: "Veleno specificamente da cicuta"
**Strato 3**: "La cicuta cresce nel giardino della Signora Blackwood"
**Strato 4**: "La Signora Blackwood è botanica specializzata in piante velenose"

Ogni strato aggiunge contesto e restringe possibilità.

### La Tecnica dell'Indizio Incrociato

Indizi che si verificano a vicenda:

**Indizio A**: "Il Maggiore Thompson aveva accesso al veleno"
**Indizio B**: "Il Maggiore Thompson era nell'ufficio della vittima alle 21:00"
**Indizio C**: "La vittima è morta alle 21:15 per avvelenamento"

Quando gli indizi si incrociano, formano prove più forti.

## Lista di Controllo Prima della Festa: Audit degli Indizi

Usa questa checklist per controllare ogni indizio:

### Chiarezza
- [ ] L'indizio può essere letto e compreso facilmente?
- [ ] Il linguaggio è chiaro, non ambiguo?
- [ ] I dettagli fisici sono descritti bene?

### Completezza
- [ ] Tutte le informazioni necessarie sono fornite?
- [ ] Nessuna conoscenza esterna richiesta?
- [ ] Il contesto è sufficiente?

### Connessione
- [ ] Si collega a informazioni stabilite?
- [ ] Corrisponde alla timeline?
- [ ] Si allinea con i dettagli dei personaggi?

### Logica
- [ ] La catena di ragionamento ha senso?
- [ ] Nessun salto logico impossibile?
- [ ] Causa ed effetto chiari?

### Equilibrio
- [ ] Impegnativo ma non impossibile?
- [ ] Abbinato al livello di abilità degli ospiti?
- [ ] Equo rispetto ad altri indizi?

## Errori Comuni da Evitare

### L'Indizio della Maledizione della Conoscenza

Quando sei l'autore, SAI tutte le risposte. Questo rende impossibile giudicare se gli indizi sono troppo facili o troppo difficili. Combatti questo:
- Testando con partecipanti freschi
- Aspettando una settimana, poi rivedendo
- Chiedendo a qualcun altro di verificare la logica

### La Trappola "Ho Pensato Era Ovvio"

Quello che è ovvio per te (che hai passato ore a pianificare) non è ovvio per ospiti che vedono indizi per 30 secondi. Sempre sbaglia sul lato di troppo chiaro piuttosto che troppo sottile.

### Il Problema del "Ma È Realistico!"

Sì, nella vita reale gli indizi sono spesso vaghi e confusi. Ma questo è un gioco, non investigazione reale. Scopo: divertimento, non frustrazione. Privilegia l'esperienza di gioco sopra il realismo.

### L'Errore "Troppo Intelligente"

Non rendere gli indizi intelligenti a scapito dell'usabilità. Giochi di parole intelligenti e riferimenti oscuri potrebbero impressionarti, ma se gli ospiti non possono risolverli, non importa quanto siano intelligenti.

## Riflessioni Finali: L'Arte di Indizi Equi

Al cuore, gli indizi confusi derivano da un mismatch tra le intenzioni dell'autore e l'esperienza del giocatore. Tu sai cosa intendi; loro devono scoprirlo con informazioni limitate.

L'obiettivo non è rendere il tuo mistero impossibile da risolvere. L'obiettivo è creare quel momento magico quando tutto si fa chiaro - quando gli indizi si incastrano, i pattern emergono, e i tuoi ospiti sentono l'emozione della vera deduzione.

Gli indizi perfetti sono come un percorso: abbastanza impegnativo da rendere il viaggio interessante, ma abbastanza chiaro che gli escursionisti non si perdono nella foresta.

Prima di ogni festa, chiediti: "Se fossi un ospite vedendo questo per la prima volta, potrei ragionevolmente risolverlo?" Se la risposta è no, lavora ancora un po'. I tuoi ospiti ti ringrazieranno.

Ora vai avanti e scrivi quegli indizi chiari e soddisfacenti. Il tuo prossimo mistero aspetta - e questa volta, i tuoi ospiti risolveranno davvero!`;

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
