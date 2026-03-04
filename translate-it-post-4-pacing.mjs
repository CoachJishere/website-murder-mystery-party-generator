#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EN_SLUG = 'how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murder-mystery-timing';
const IT_SLUG = 'how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murder-mystery-timing-it';

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

  const italianTitle = 'Come Risolvere i Problemi di Ritmo nei Gialli: Padroneggiare l\'Arte del Timing';
  const italianMetaDescription = 'Scopri come padroneggiare il ritmo perfetto per le tue feste a tema giallo. Tecniche pratiche per mantenere energia, slancio ed eccitazione dall\'inizio alla fine.';

  const italianContent = `# Come Risolvere i Problemi di Ritmo nei Gialli: Padroneggiare l'Arte del Timing

C'è un momento in ogni festa a tema giallo quando puoi sentire l'energia cambiare. Nei tuoi migliori eventi, quell'energia costruisce costantemente, gli ospiti sempre più coinvolti fino alla drammatica rivelazione finale. Nelle tue feste meno riuscite? L'energia si spegne a metà strada, gli ospiti iniziano a controllare i telefoni e la grande rivelazione finale sembra più un sollievo che un climax.

Dopo aver organizzato dozzine di feste a tema giallo, ho imparato che i misteri migliori non sono quelli con le trame più intelligenti o gli indizi più elaborati. Sono quelli con il ritmo perfetto - dove ogni momento fluisce naturalmente nel successivo, dove l'eccitazione costruisce invece di calare, e dove il timing ti tiene al limite del tuo posto dall'inizio alla fine.

I problemi di ritmo rovinano più feste a tema giallo di qualsiasi altro singolo fattore. La buona notizia? Sono completamente risolvibili una volta che capisci i principi del ritmo efficace. In questa guida, ti mostrerò esattamente come identificare problemi di ritmo, perché accadono e, cosa più importante, come risolverli per creare un'esperienza che tiene i tuoi ospiti completamente coinvolti.

## Perché il Ritmo È Importante nelle Feste a Tema Giallo

### La Psicologia del Coinvolgimento

Il coinvolgimento umano segue curve prevedibili. Quando pianifichi il tuo mistero con queste in mente, crei un'esperienza naturalmente avvincente:

**L'Arco di Coinvolgimento Ideale:**
1. **Hook Iniziale**: Cattura attenzione immediatamente
2. **Costruzione Costante**: Aumenta costantemente interesse
3. **Picchi e Valli**: Alterna intensità per evitare affaticamento
4. **Climax**: Punto massimo di eccitazione
5. **Risoluzione Soddisfacente**: Conclusione emotiva

**Ciò Che Accade Con Ritmo Scarso:**
1. **Inizio Lento**: Gli ospiti sono annoiati prima che il mistero inizi
2. **Slancio Incoerente**: L'energia sale e scende casualmente
3. **Tratti Lunghi e Morti**: Nessuna azione per lunghi periodi
4. **Climax Frettoloso**: La fine sembra affrettata
5. **Finale Piatto**: Nessuna soddisfazione emotiva

### L'Impatto Pratico

Il ritmo scarso crea problemi concreti:

- **Perdita di Attenzione**: Gli ospiti si disimpegnano durante le parti lente
- **Confusion**: I tratti lunghi morti fanno dimenticare dettagli importanti
- **Frustrazione**: Ritmo troppo veloce travolge i giocatori
- **Anticlimax**: Timing scarso rovina rivelazioni
- **Spreco di Preparazione**: Il tuo duro lavoro non viene apprezzato

## I 5 Problemi di Ritmo Più Comuni (E Come Risolverli)

### 1. Il Problema dell'Inizio Troppo Lento

**Il Problema:**
Il tuo mistero impiega troppo tempo per iniziare davvero. Gli ospiti arrivano, socializzano casualmente per 45 minuti, finalmente si siedono a cena altri 30 minuti, poi forse iniziano a ricevere schede dei personaggi... due ore dopo, l'omicidio effettivo non è ancora accaduto.

**Perché Accade:**
- Troppa socializzazione pre-mistero
- Tempi di cena troppo lunghi
- Distribuzione complessa delle schede dei personaggi
- Paura di affrettare gli ospiti

**Come Risolverlo:**

**La Regola dei 20 Minuti:**
Qualcosa di mistero-relato dovrebbe accadere entro 20 minuti dall'arrivo del primo ospite.

**Struttura Migliorata:**
- **0-15 minuti**: Arrivi, aperitivi veloci, distribuzione schede personaggio
- **15-20 minuti**: Brevi auto-presentazioni dei personaggi
- **20-25 minuti**: L'OMICIDIO ACCADE
- **25-45 minuti**: Reazioni iniziali durante aperitivi/cena

**Tecniche di Implementazione:**

**Pre-Party Prep:**
- Invia schede personaggio via email in anticipo
- Chiedi agli ospiti di arrivare in personaggio
- Fornisci "pre-show" sottile (musica, decorazioni, atmosfera)

**Integrazione Cena:**
Se servi cena, rendila parte del mistero:
- L'omicidio accade durante il primo piatto
- Le discussioni di mistero accadono tra i piatti
- Gli indizi vengono distribuiti con il cibo

**Esempio Prima/Dopo:**

**PRIMA (Lento):**
19:00 - Arrivi, socializzazione casuale
19:45 - Sedersi a cena
20:15 - Finire di mangiare
20:30 - Distribuire schede personaggio
21:00 - Presentazioni personaggi
21:30 - FINALMENTE l'omicidio accade

**DOPO (Migliorato):**
19:00 - Arrivi, ricevere schede personaggio
19:15 - Aperitivi, brevi presentazioni personaggi
19:20 - L'OMICIDIO ACCADE (drammatico!)
19:25 - Reazioni, cena inizia
20:00 - Prime indagini durante cena
20:45 - Investigazioni accelerano

### 2. Il Problema del Medio Fiacchente

**Il Problema:**
Il tuo mistero inizia forte, ma poi raggiunge un plateau nel mezzo dove sembra che non stia accadendo niente. Gli ospiti vagano, le conversazioni diventano ripetitive, l'energia diminuisce.

**Perché Accade:**
- Troppo tempo tra le rivelazioni degli indizi
- Nessun evento intermedio drammatico
- Investigazioni senza struttura
- Obiettivi poco chiari per i giocatori

**Come Risolverlo:**

**La Tecnica delle Bombe a Tempo:**
Programma eventi drammatici a intervalli regolari per mantenere energia alta.

**Programma dei 15 Minuti:**
Qualcosa di significativo dovrebbe accadere ogni 10-15 minuti:

**Esempio di Timeline Strutturata:**
- **Minuto 20**: Omicidio accade
- **Minuto 35**: Prima distribuzione indizi
- **Minuto 50**: Testimone ricorda dettaglio cruciale
- **Minuto 65**: Nuovo indizio fisico scoperto
- **Minuto 80**: Il sospetto confessa (falso!) red herring
- **Minuto 95**: Indizi finali distribuiti
- **Minuto 110**: Accuse finali
- **Minuto 120**: Rivelazione della verità

**Tipi di Eventi Programmati:**

**Rivelazioni Indizi:**
- Nuove prove fisiche appaiono
- Testimoni ricordano dettagli
- Documenti scoperti
- Scienze forensi risultati arrivano

**Eventi Drammatici:**
- Confronti accesi tra personaggi
- Confessioni (possibilmente false)
- Nuove morti (falsi allarmi o reali)
- Cambiamenti di alleanze
- Revelazioni di segreti

**Meccaniche di Gioco:**
- Giri temporizzati
- Sfide investigative
- Votazioni
- Opportunità di interrogatorio

**Esempio Prima/Dopo:**

**PRIMA (Fiacchente):**
Minuto 20: Omicidio
Minuto 25: Indizi distribuiti
Minuto 30-90: Niente di strutturato (60 minuti di deriva!)
Minuto 90: Rivelazione finale

**DOPO (Dinamico):**
Minuto 20: Omicidio
Minuto 25: Indizi iniziali
Minuto 40: Testimone scopre nuovo dettaglio
Minuto 55: Personaggio confessa (red herring)
Minuto 70: Prove forensi arrivano
Minuto 85: Confronto drammatico
Minuto 100: Indizi finali
Minuto 115: Rivelazione

### 3. Il Problema del Finale Affrettato

**Il Problema:**
Il tempo scappa, ti accorgi che hai solo 15 minuti rimasti, quindi affetti attraverso gli indizi finali e rivelazione in un rush frettoloso e insoddisfacente.

**Perché Accade:**
- Sottovalutazione del tempo necessario
- Sezioni precedenti durarono troppo
- Nessun sistema di gestione del tempo
- Troppo contenuto pianificato

**Come Risolverlo:**

**La Regola del 75%:**
Pianifica per il 75% del tuo tempo totale, lasciando il 25% come buffer.

**Esempio:** Festa di 3 ore (180 minuti)
- **Contenuto Pianificato**: 135 minuti
- **Buffer Tempo**: 45 minuti
- **Questo Permette**: Sovraccarico, conversazioni extra, aggiustamenti di ritmo

**Sistema di Gestione del Tempo:**

**Imposta Timer Checkpoint:**
- 25% attraverso l'evento: Dovresti aver finito intro e omicidio
- 50% attraverso: Dovresti essere a metà investigazioni
- 75% attraverso: Indizi finali distribuiti, preparare rivelazione
- 90% attraverso: Rivelazione completa
- 100%: Tempo socializzazione post-festa

**Crea Contenuto Modulare:**
Progetta sezioni che possono essere espanse o compresse:

**Flessibile vs. Fisso:**

**Fisso (Non Tagliabile):**
- Evento omicidio (10 minuti)
- Indizi core (30 minuti)
- Rivelazione finale (20 minuti)
- **Totale**: 60 minuti

**Flessibile (Regolabile):**
- Socializzazione iniziale (10-25 minuti)
- Investigazioni aperte (30-60 minuti)
- Eventi opzionali (0-30 minuti)
- Discussione post-rivelazione (10-20 minuti)
- **Range**: 50-135 minuti

**Tecniche di Accelerazione:**
Se ti accorgi di essere indietro:

1. **Combina Giri**: Unisci due distribuzioni indizi
2. **Aggiungi Urgenza**: Annuncia timer (es. "Polizia arriva in 30 minuti!")
3. **Riduci Socializzazione Aperta**: Metti struttura alle discussioni
4. **Salta Eventi Opzionali**: Taglia contenuto non essenziale
5. **Distribuisci Indizi Finali Prima**: Non aspettare il momento "perfetto"

### 4. Il Problema delle Informazioni Sovraccaricanti

**Il Problema:**
Scarichi troppe informazioni contemporaneamente. Gli ospiti ricevono 15 indizi in cinque minuti, diventano sopraffatti, non riescono a processare tutto, e paradossalmente fanno meno progressi che se avessero ricevuto meno informazioni.

**Perché Accade:**
- Voler fornire tutti gli indizi subito
- Paura che gli ospiti si annoino senza abbastanza da fare
- Gestione del tempo scarsa
- Non capire i limiti di processamento cognitivo

**Come Risolverlo:**

**La Regola dei 3-5:**
Non dare mai più di 3-5 pezzi di informazione contemporaneamente.

**Sistema di Distribuzione degli Indizi a Goccia:**

**Invece di:**
"Ecco 12 indizi tutti insieme!"

**Fare:**
**Giro 1 (Minuti 25-40):**
- Indizio fisico: Arma
- Testimone: Chi era dove
- Documento: Registro eventi sera

**Giro 2 (Minuti 55-70):**
- Indizio fisico: Fibra sulla scena
- Testimone: Conversazione ascoltata
- Documento: Lettera trovata

**Giro 3 (Minuti 85-100):**
- Indizio fisico: Prove finali
- Testimone: Testimonianza cruciale
- Documento: Prova che collega tutto

**Benefici del Pacing:**
- Gli ospiti hanno tempo di discutere ogni set
- Le informazioni costruiscono logicamente
- Ogni giro sembra progressivo
- Nessuno è sopraffatto

**Tecniche di Spaziatura degli Indizi:**

**Metodo Fisico:**
Indizi fisici nascosti in locazioni diverse - gli ospiti devono esplorare nel tempo

**Metodo Temporale:**
Indizi distribuiti a tempi specifici da te

**Metodo Basato su Evento:**
Nuovi indizi quando eventi specifici accadono:
- Dopo che tutti hanno interrogato almeno 3 persone
- Quando viene raggiunto consenso su qualcosa
- Dopo che passano X minuti
- Quando qualcuno chiede la domanda giusta

### 5. Il Problema della Violazione di Momentum

**Il Problema:**
L'eccitazione sta costruendo, gli ospiti sono coinvolti, poi... pausa cena di 45 minuti. O pausa bagno di gruppo. O intrattenimento non correlato. Qualsiasi cosa che interrompe il flusso e uccide slancio.

**Perché Accade:**
- Necessità pratiche (cibo, bagno)
- Intrattenimento mal programmato
- Transizioni scadenti tra sezioni
- Non capire dinamiche di slancio

**Come Risolverlo:**

**Integra Necessità con Mistero:**

**Cibo:**
**Invece di:** Pausa mistero, mangia, poi riprendi
**Fare:** Fare del cibo parte del mistero:
- Servire cibo durante le investigazioni (finger food, buffet)
- Fare accadere eventi chiave durante i pasti
- Usare i piatti come timer naturali
- Nascondere indizi nel servizio cibo

**Bagni:**
**Invece di:** "OK, tutti pausa bagno di 15 minuti"
**Fare:** Permettere naturali pause fluide:
- Gli ospiti escono individualmente mentre gli altri continuano
- Impostare indagini senza tutti presenti
- Usare giri temporizzati dove le persone possono muoversi liberamente

**Intrattenimento:**
**Invece di:** Esibizione separata che ferma il mistero
**Fare:** Integrare intrattenimento con trama:
- Il cantante è un personaggio che fornisce indizi
- L'esibizione contiene suggerimenti nel testo
- Accade qualcosa di drammatico durante l'esibizione
- L'intrattenimento imposta atmosfera, non ferma azione

**Tecniche di Gestione del Momentum:**

**La Tecnica del Cliffhanger:**
Se DEVI fare pausa, finisci su cliffhanger:
- "Prima che vi prendiate una pausa, c'è una cosa che dovreste sapere..."
- "Qualcuno ricorda di aver visto questo?" (mostra indizio intrigante)
- "Quando torniamo, scoprirete chi è davvero il Colonnello Blackwood..."

**Il Metodo della Transizione Ponte:**
Collegare sezioni con elementi di continuità:
- Sottofondo musicale continua
- Personaggio mantiene performance durante transizione
- Indizio visivo rimane in vista
- Discussioni continuano informalmente

**Esempio Prima/Dopo:**

**PRIMA (Momentum Rotto):**
20:30 - Omicidio accade, alta eccitazione
20:45 - "OK tutti, pausa cena!"
21:30 - Cercando di riaccendere eccitazione (difficile!)

**DOPO (Momentum Mantenuto):**
20:30 - Omicidio accade
20:35 - "La cena è servita - ma continuate le investigazioni! Nuovi indizi appariranno durante il pasto..."
21:30 - L'eccitazione ha costruito attraverso la cena

## Creazione del Tuo Piano di Pacing Perfetto

### Passo 1: Definire Lunghezza Evento Totale

Sii realistico:
- **Cena di 2 ore**: Mistero concentrato (60-90 minuti)
- **Festa di 3 ore**: Mistero completo (120-150 minuti)
- **Evento di 4 ore**: Mistero elaborato (180-210 minuti)

### Passo 2: Allocare Blocchi di Tempo

Usare questo template (festa di 3 ore):

**Fase 1: Setup (20 minuti)**
- Arrivi e distribuzione personaggi: 15 minuti
- Brevi intro: 5 minuti

**Fase 2: Incidente Incitante (10 minuti)**
- Evento omicidio: 10 minuti

**Fase 3: Investigazione Iniziale (45 minuti)**
- Distribuzione indizi iniziali: 5 minuti
- Investigazioni aperte: 30 minuti
- Primo evento drammatico: 10 minuti

**Fase 4: Investigazione Profonda (45 minuti)**
- Nuovi indizi: 5 minuti
- Investigazioni continuate: 25 minuti
- Grande rivelazione: 15 minuti

**Fase 5: Risoluzione (30 minuti)**
- Indizi finali: 5 minuti
- Accuse: 15 minuti
- Grande rivelazione: 10 minuti

**Fase 6: Conclusione (30 minuti)**
- Discussione post-mistero: 15 minuti
- Premi, foto: 15 minuti

**Totale**: 180 minuti (3 ore)

### Passo 3: Pianificare Punti Beat

Identificare momenti emotivi chiave:

**Beat 1** (Minuto 20): SHOCK - L'omicidio accade
**Beat 2** (Minuto 40): CONFUSIONE - Troppe possibilità
**Beat 3** (Minuto 65): BREAKTHROUGH - Grande indizio trovato
**Beat 4** (Minuto 85): TWIST - Tutto cambia
**Beat 5** (Minuto 100): CONVERGENZA - Tutto si unisce
**Beat 6** (Minuto 115): RIVELAZIONE - Verità rivelata

### Passo 4: Costruire Flessibilità

Creare punti di aggiustamento:

**Punti di Accelerazione** (se in ritardo):
- Minuto 45: Combina Giri 1 e 2 se necessario
- Minuto 90: Salta evento opzionale se in ritardo
- Minuto 105: Distribuisci indizi finali presto se necessario

**Punti di Espansione** (se avanti):
- Minuto 40: Aggiungi evento drammatico bonus
- Minuto 75: Permetti investigazioni più libere
- Minuto 110: Estendi periodo di accuse

### Passo 5: Testare e Aggiustare

**Test Run:**
Cronometra ogni sezione durante test di prova

**Aggiustamenti:**
- Sezioni che vanno lunghe: Tagliare 20%
- Sezioni che vanno corte: Aggiungere buffer
- Punti bassi di energia: Aggiungere eventi drammatici
- Sovraccarico informazioni: Separare in più giri

## Tecniche Avanzate di Pacing

### La Tecnica dell'Onda di Energia

Alterna tra intensità alta e bassa per evitare affaticamento:

**Alta Intensità:**
- Eventi drammatici
- Rivelazioni sorprendenti
- Confronti
- Distribuzioni indizi
- Decisioni urgenti

**Bassa Intensità:**
- Investigazioni aperte
- Discussioni tranquille
- Processamento informazioni
- Socializzazione
- Pasti

**Pattern Ideale:**
Alta → Bassa → Alta → Bassa → MOLTO ALTA (finale)

### Il Metodo della Rivelazione a Cascata

Rivelazioni costruiscono l'una sull'altra:

**Rivelazione 1**: Scoprire chi aveva accesso
**Rivelazione 2**: Scoprire chi aveva movente (basato su Riv 1)
**Rivelazione 3**: Scoprire chi aveva mezzi (basato su Riv 1+2)
**Rivelazione 4**: Unire tutto (basato su tutte precedenti)

Ogni rivelazione è soddisfacente E prepara la successiva.

### La Tecnica di Costruzione della Tensione

Aumentare gradualmente posta in gioco:

**Livello 1**: Curiosità ("È interessante...")
**Livello 2**: Coinvolgimento ("Voglio sapere...")
**Livello 3**: Investimento ("DEVO scoprirlo!")
**Livello 4**: Urgenza ("È QUESTA PERSONA?!")
**Livello 5**: Climax ("SAPEVO CHE ERA LEI!")

### Il Sistema delle Ricompense Multiple

Fornire piccole vittorie costantemente:

**Ogni 15 Minuti, Giocatori Dovrebbero:**
- Scoprire qualcosa di nuovo
- Escludere un sospetto
- Fare una connessione
- Risolvere un puzzle
- Avere un momento "aha"

Vittorie piccole e frequenti mantengono motivazione alta.

## Risoluzione dei Problemi Comuni di Pacing

### "Gli Ospiti Hanno Risolto Troppo Velocemente!"

**Soluzioni:**
- Aggiungere più red herring
- Rendere indizi leggermente più sottili
- Aggiungere più passaggi di ragionamento
- Includere twist sorprendente a metà strada

### "Gli Ospiti Sono Completamente Bloccati!"

**Soluzioni:**
- Distribuire indizi supplementari prima
- Avere personaggio NPC fornire suggerimenti
- Ridurre complessità indizi restanti
- Fornire sistema di suggerimenti a livelli

### "L'Energia È Bassa nel Mezzo!"

**Soluzioni:**
- Inserire evento drammatico improvvisato
- Introdurre nuovo indizio eccitante
- Creare momento di confronto
- Cambiare attività (investigazioni → discussioni di gruppo)

### "Correndo Fuori Tempo!"

**Soluzioni:**
- Combinare giri pianificati
- Tagliare contenuto opzionale
- Aggiungere urgenza di scadenza in-game
- Accelerare timer distribuzioni indizi

### "Troppo Tempo Rimasto!"

**Soluzioni:**
- Aggiungere contenuto bonus preparato
- Estendere discussioni investigative
- Includere eventi carattere aggiuntivi
- Permettere socializzazione post-rivelazione più lunga

## Lista di Controllo del Pacing Prima della Festa

### 2 Settimane Prima:
- [ ] Crea timeline dettagliata minuto per minuto
- [ ] Identifica tutti i beat emotivi chiave
- [ ] Pianifica punti di distribuzione indizi
- [ ] Prepara contenuto modulare opzionale
- [ ] Determina punti di aggiustamento

### 1 Settimana Prima:
- [ ] Esegui test cronometrato con amici
- [ ] Aggiusta sezioni lunghe/corte
- [ ] Prepara sistema di timer
- [ ] Crea foglio cheat di gestione tempo
- [ ] Pianifica segnali per mantenere slancio

### Giorno della Festa:
- [ ] Imposta timer multipli (telefono, assistente, visible clock)
- [ ] Prepara tutti i materiali in ordine temporale
- [ ] Informa co-host del tuo piano pacing
- [ ] Prepara contenuto backup per emergenze
- [ ] Stabilisci segnali per aggiustare pacing durante

### Durante la Festa:
- [ ] Controlla timer regolarmente
- [ ] Nota livelli energia ospiti
- [ ] Regola al volo quando necessario
- [ ] Mantieni buffer tempo in mente
- [ ] Resta flessibile ma guidato dall'obiettivo

## Riflessioni Finali: L'Arte dell'Invisibile Pacing

Il pacing perfetto è invisibile. Gli ospiti non dovrebbero mai sentire che stai gestendo il loro tempo - dovrebbero solo sentire che tutto fluisce naturalmente, che c'è sempre qualcosa di eccitante accadendo, che il mistero li trascina senza sforzo dall'inizio alla soddisfacente conclusione.

La differenza tra una buona festa a tema giallo e una fantastica spesso si riduce al pacing. Puoi avere la trama più brillante, i costumi più favolosi, le decorazioni più elaborate - ma se il ritmo è sbagliato, niente si sentirà giusto.

Al contrario, anche un mistero semplice con pacing perfetto può creare un'esperienza indimenticabile. I tuoi ospiti ricorderanno come si sono sentiti - quell'emozione crescente, quei momenti di scoperta, quella rivelazione drammatica - più di quanto ricorderanno qualsiasi dettaglio specifico.

Quindi prenditi tempo (gioco di parole!) per pianificare davvero il tuo pacing. Crea quella timeline, identifica quei beat emotivi, costruisci quella flessibilità. I tuoi ospiti potrebbero non realizzare coscientemente che il timing era perfetto, ma lo sentiranno.

E quella sensazione - di essere perfettamente coinvolti dall'inizio alla fine - è ciò che trasforma una festa in un'esperienza indimenticabile.

Ora vai avanti e padroneggia il tuo timing. Il tuo mistero perfettamente ritmato ti aspetta!`;

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
