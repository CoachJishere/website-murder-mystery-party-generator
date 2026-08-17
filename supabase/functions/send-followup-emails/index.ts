import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type Locale, normalizeLocale, pickByLocale, getUserLanguage } from "../_shared/email-i18n.ts";

/**
 * Edge Function: send-followup-emails
 *
 * Called by a daily pg_cron job. Processes pending rows in followup_emails
 * where scheduled_for <= now. Rendered in the host's preferred language
 * (profiles.language) — falls back to 'en'.
 *
 * Dispatches by email_type:
 *   - how_did_it_go (+21d post-generation): Trustpilot review request,
 *     with social proof if any guest left positive feedback.
 *   - invite_friends (+14d post-generation): light "share with friends"
 *     prompt, sent only to paid hosts who haven't unsubscribed.
 *   - character_removal_announcement: one-time backfill, not a recurring
 *     scheduled type. English only, no unsubscribe footer (it's a single
 *     send, not a follow-up series) — see docs/adr/0078 and the 2026-08-16
 *     announcement to the 33 buyers who purchased before the paid character
 *     removal feature (ADR-0088) existed.
 *
 * All types honor conversations.unsubscribed_from_followups.
 */

const TRUSTPILOT_REVIEW_URL = "https://ca.trustpilot.com/evaluate/mysterymaker.party";

interface FollowupStrings {
  // subject lines
  subjectGuestsLoved: (title: string) => string;
  subjectStandard: (title: string) => string;
  subjectInviteFriends: (title: string) => string;
  // shared shell
  greeting: (name: string) => string;
  // guest-triggered email
  guestTriggeredHeadline: (title: string) => string;
  guestLineSingle: (guestName: string, starsHtml: string) => string;
  guestLineMany: (count: number, avg: number) => string; // returns "<count> of your guests rated… <avg>/5 stars" with bolding
  askReview: string;
  // standard email
  standardHeadline: (title: string) => string;
  standardBody: string;
  // shared CTAs
  reviewCta: string;
  feedbackLink: string;
  // share section
  shareTitle: string;
  shareBody: string;
  shareCta: string;
  // invite friends body
  inviteBody1: (title: string) => string;
  inviteBody2: string;
  inviteCopyLink: string;
  // unsub
  unsub: string;
}

const T: Record<Locale, FollowupStrings> = {
  en: {
    subjectGuestsLoved: (t) => `Your guests loved ${t}!`,
    subjectStandard: (t) => `How was ${t}?`,
    subjectInviteFriends: (t) => `Friends keep asking about ${t}?`,
    greeting: (n) => `Hi ${n},`,
    guestTriggeredHeadline: (t) => `Great news &mdash; your guests enjoyed <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} rated their experience <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} of your guests rated their experience &mdash; average <strong style="color: #f59e0b;">${avg}/5 stars</strong>`,
    askReview: "If you had a great time hosting, we'd really appreciate a quick Trustpilot review. It takes about 30 seconds and helps other hosts find us.",
    standardHeadline: (t) => `How was <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: "We hope you and your guests had an amazing time! If you enjoyed hosting, we'd really appreciate a quick Trustpilot review. It takes about 30 seconds and helps other hosts discover Mystery Maker.",
    reviewCta: 'Leave a Trustpilot Review ★',
    feedbackLink: 'Or share detailed feedback with us directly',
    shareTitle: 'Friends will love this too',
    shareBody: 'If your guests asked "where did you get this?" &mdash; send them here. Each mystery is one-of-a-kind.',
    shareCta: 'Share Mystery Maker →',
    inviteBody1: (t) => `Hope <strong style="color: #F5F0E8;">${t}</strong> was a hit. We bet at least one guest leaned over that night and asked, <em>"where did you get this?"</em>`,
    inviteBody2: "Every mystery on Mystery Maker is generated from scratch, so no two parties play the same one. If a friend wants to host their own, send them the link below &mdash; they'll get to design something built around their own theme, guest count, and inside jokes.",
    inviteCopyLink: 'Or just copy this link:',
    unsub: 'Unsubscribe from follow-up emails',
  },
  es: {
    subjectGuestsLoved: (t) => `¡A tus invitados les encantó ${t}!`,
    subjectStandard: (t) => `¿Qué tal fue ${t}?`,
    subjectInviteFriends: (t) => `¿Tus amigos siguen preguntando por ${t}?`,
    greeting: (n) => `Hola ${n}:`,
    guestTriggeredHeadline: (t) => `¡Buenas noticias! Tus invitados disfrutaron de <strong style="color: #F5F0E8;">${t}</strong>.`,
    guestLineSingle: (g, stars) => `${g} valoró su experiencia con <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} de tus invitados valoraron su experiencia &mdash; media de <strong style="color: #f59e0b;">${avg}/5 estrellas</strong>`,
    askReview: 'Si disfrutaste como anfitrión, te agradeceríamos muchísimo una reseña rápida en Trustpilot. Tarda unos 30 segundos y ayuda a otros anfitriones a encontrarnos.',
    standardHeadline: (t) => `¿Qué tal fue <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'Esperamos que tú y tus invitados lo pasarais genial. Si disfrutaste como anfitrión, te agradeceríamos muchísimo una reseña rápida en Trustpilot. Tarda unos 30 segundos y ayuda a otros anfitriones a descubrir Mystery Maker.',
    reviewCta: 'Dejar reseña en Trustpilot ★',
    feedbackLink: 'O escríbenos tu opinión detallada directamente',
    shareTitle: 'A tus amigos también les encantará',
    shareBody: 'Si tus invitados preguntaron "¿de dónde sacaste esto?", mándalos aquí. Cada misterio es único.',
    shareCta: 'Compartir Mystery Maker →',
    inviteBody1: (t) => `Esperamos que <strong style="color: #F5F0E8;">${t}</strong> fuera un éxito. Seguro que aquella noche al menos un invitado se inclinó hacia ti y preguntó: <em>"¿de dónde sacaste esto?"</em>`,
    inviteBody2: 'Cada misterio en Mystery Maker se genera desde cero, así que no hay dos fiestas iguales. Si un amigo quiere organizar la suya, mándale este enlace &mdash; podrá diseñar algo a medida de su temática, número de invitados y bromas internas.',
    inviteCopyLink: 'O simplemente copia este enlace:',
    unsub: 'Cancelar la suscripción a los correos de seguimiento',
  },
  fr: {
    subjectGuestsLoved: (t) => `Vos invités ont adoré ${t} !`,
    subjectStandard: (t) => `Comment s'est passé ${t} ?`,
    subjectInviteFriends: (t) => `Vos amis vous parlent encore de ${t} ?`,
    greeting: (n) => `Bonjour ${n},`,
    guestTriggeredHeadline: (t) => `Bonne nouvelle &mdash; vos invités se sont régalés sur <strong style="color: #F5F0E8;">${t}</strong> !`,
    guestLineSingle: (g, stars) => `${g} a noté la soirée <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} de vos invités ont noté la soirée &mdash; moyenne de <strong style="color: #f59e0b;">${avg}/5 étoiles</strong>`,
    askReview: "Si vous avez passé un bon moment en tant qu'hôte, un petit avis sur Trustpilot nous aiderait beaucoup. Cela prend environ 30 secondes et aide d'autres hôtes à nous trouver.",
    standardHeadline: (t) => `Comment s'est passé <strong style="color: #F5F0E8;">${t}</strong> ?`,
    standardBody: "Nous espérons que vous et vos invités avez passé un excellent moment ! Si vous avez aimé organiser cette soirée, un petit avis sur Trustpilot nous aiderait vraiment. Cela prend environ 30 secondes et aide d'autres hôtes à découvrir Mystery Maker.",
    reviewCta: 'Laisser un avis Trustpilot ★',
    feedbackLink: 'Ou envoyez-nous un retour détaillé directement',
    shareTitle: 'Vos amis vont adorer aussi',
    shareBody: 'Si vos invités vous ont demandé "où as-tu trouvé ça ?", envoyez-les ici. Chaque mystère est unique.',
    shareCta: 'Partager Mystery Maker →',
    inviteBody1: (t) => `On espère que <strong style="color: #F5F0E8;">${t}</strong> a été un succès. On parie qu'au moins un invité s'est penché vers vous ce soir-là pour demander : <em>"où as-tu trouvé ça ?"</em>`,
    inviteBody2: "Chaque mystère sur Mystery Maker est généré de zéro, donc deux soirées ne sont jamais identiques. Si un ami veut organiser la sienne, envoyez-lui le lien ci-dessous &mdash; il pourra créer quelque chose autour de son propre thème, de son nombre d'invités et de ses private jokes.",
    inviteCopyLink: 'Ou copiez simplement ce lien :',
    unsub: 'Se désabonner des e-mails de suivi',
  },
  de: {
    subjectGuestsLoved: (t) => `Deine Gäste haben ${t} geliebt!`,
    subjectStandard: (t) => `Wie war ${t}?`,
    subjectInviteFriends: (t) => `Fragen Freunde noch immer nach ${t}?`,
    greeting: (n) => `Hallo ${n},`,
    guestTriggeredHeadline: (t) => `Gute Nachrichten &mdash; deinen Gästen hat <strong style="color: #F5F0E8;">${t}</strong> richtig gefallen!`,
    guestLineSingle: (g, stars) => `${g} hat den Abend mit <strong style="color: #f59e0b;">${stars}</strong> bewertet`,
    guestLineMany: (c, avg) => `${c} deiner Gäste haben den Abend bewertet &mdash; im Schnitt <strong style="color: #f59e0b;">${avg}/5 Sterne</strong>`,
    askReview: 'Wenn dir das Hosten Spaß gemacht hat, würden wir uns über eine kurze Trustpilot-Bewertung sehr freuen. Das dauert nur etwa 30 Sekunden und hilft anderen Gastgebern, uns zu finden.',
    standardHeadline: (t) => `Wie war <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'Wir hoffen, du und deine Gäste hattet einen tollen Abend! Wenn dir das Hosten Spaß gemacht hat, würden wir uns sehr über eine kurze Trustpilot-Bewertung freuen. Das dauert nur etwa 30 Sekunden und hilft anderen Gastgebern, Mystery Maker zu entdecken.',
    reviewCta: 'Bei Trustpilot bewerten ★',
    feedbackLink: 'Oder gib uns dein Feedback direkt',
    shareTitle: 'Deine Freunde werden das auch lieben',
    shareBody: 'Wenn deine Gäste gefragt haben „Woher hast du das?" &mdash; schick sie hierher. Jeder Krimi ist einzigartig.',
    shareCta: 'Mystery Maker teilen →',
    inviteBody1: (t) => `Wir hoffen, <strong style="color: #F5F0E8;">${t}</strong> war ein voller Erfolg. Wir wetten, mindestens ein Gast hat sich an dem Abend zu dir gelehnt und gefragt: <em>„Woher hast du das?"</em>`,
    inviteBody2: 'Jeder Krimi bei Mystery Maker wird neu generiert &mdash; keine Party spielt denselben. Wenn ein Freund seinen eigenen veranstalten will, schick ihm einfach den Link unten. Er kann dann einen Krimi rund um sein eigenes Thema, seine Gästezahl und Insider-Witze gestalten.',
    inviteCopyLink: 'Oder einfach diesen Link kopieren:',
    unsub: 'Folge-E-Mails abbestellen',
  },
  it: {
    subjectGuestsLoved: (t) => `I tuoi ospiti hanno adorato ${t}!`,
    subjectStandard: (t) => `Com'è andato ${t}?`,
    subjectInviteFriends: (t) => `Gli amici ti chiedono ancora di ${t}?`,
    greeting: (n) => `Ciao ${n},`,
    guestTriggeredHeadline: (t) => `Ottime notizie &mdash; i tuoi ospiti si sono divertiti un sacco con <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} ha valutato la serata <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} dei tuoi ospiti hanno valutato la serata &mdash; media di <strong style="color: #f59e0b;">${avg}/5 stelle</strong>`,
    askReview: 'Se ti sei divertito a fare l\'host, una breve recensione su Trustpilot ci farebbe davvero piacere. Bastano 30 secondi e aiuta altri host a trovarci.',
    standardHeadline: (t) => `Com'è andato <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'Speriamo che tu e i tuoi ospiti vi siate divertiti tantissimo! Se ti è piaciuto fare l\'host, una breve recensione su Trustpilot ci farebbe davvero piacere. Bastano 30 secondi e aiuta altri host a scoprire Mystery Maker.',
    reviewCta: 'Lascia una recensione Trustpilot ★',
    feedbackLink: 'Oppure scrivici direttamente un feedback dettagliato',
    shareTitle: 'Anche i tuoi amici lo adoreranno',
    shareBody: 'Se i tuoi ospiti ti hanno chiesto "ma dove l\'hai preso?" &mdash; mandali qui. Ogni mystery è unico.',
    shareCta: 'Condividi Mystery Maker →',
    inviteBody1: (t) => `Speriamo che <strong style="color: #F5F0E8;">${t}</strong> sia stato un successo. Scommettiamo che almeno un ospite quella sera si è sporto verso di te chiedendo: <em>"ma dove l\'hai preso?"</em>`,
    inviteBody2: 'Ogni mystery su Mystery Maker viene generato da zero, quindi non ci sono due feste uguali. Se un amico vuole organizzare la sua, mandagli il link qui sotto &mdash; potrà creare qualcosa intorno al suo tema, al suo numero di ospiti e alle sue battute di gruppo.',
    inviteCopyLink: 'Oppure copia semplicemente questo link:',
    unsub: 'Annulla l\'iscrizione alle email di follow-up',
  },
  pt: {
    subjectGuestsLoved: (t) => `Seus convidados amaram ${t}!`,
    subjectStandard: (t) => `Como foi ${t}?`,
    subjectInviteFriends: (t) => `Os amigos ainda perguntam sobre ${t}?`,
    greeting: (n) => `Olá, ${n}!`,
    guestTriggeredHeadline: (t) => `Boa notícia &mdash; seus convidados curtiram <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} avaliou a experiência com <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} dos seus convidados avaliaram a experiência &mdash; média de <strong style="color: #f59e0b;">${avg}/5 estrelas</strong>`,
    askReview: 'Se você curtiu ser anfitrião, uma avaliação rápida no Trustpilot ajudaria muito. Leva uns 30 segundos e ajuda outros anfitriões a nos encontrar.',
    standardHeadline: (t) => `Como foi <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'Esperamos que você e seus convidados tenham se divertido muito! Se você gostou de ser anfitrião, uma avaliação rápida no Trustpilot ajudaria bastante. Leva uns 30 segundos e ajuda outros anfitriões a conhecer o Mystery Maker.',
    reviewCta: 'Avaliar no Trustpilot ★',
    feedbackLink: 'Ou compartilhe um feedback detalhado com a gente',
    shareTitle: 'Seus amigos também vão adorar',
    shareBody: 'Se algum convidado perguntou "onde você arrumou isso?", manda ele para cá. Cada mistério é único.',
    shareCta: 'Compartilhar o Mystery Maker →',
    inviteBody1: (t) => `Esperamos que <strong style="color: #F5F0E8;">${t}</strong> tenha sido um sucesso. Apostamos que pelo menos um convidado se inclinou na sua direção naquela noite e perguntou: <em>"onde você arrumou isso?"</em>`,
    inviteBody2: 'Cada mistério no Mystery Maker é gerado do zero, então não tem duas festas iguais. Se um amigo quiser organizar a dele, manda esse link &mdash; ele vai poder montar algo do jeito dele, com tema próprio, número de convidados e piadas internas.',
    inviteCopyLink: 'Ou só copia este link:',
    unsub: 'Cancelar inscrição dos e-mails de acompanhamento',
  },
  nl: {
    subjectGuestsLoved: (t) => `Je gasten waren weg van ${t}!`,
    subjectStandard: (t) => `Hoe was ${t}?`,
    subjectInviteFriends: (t) => `Vragen vrienden nog steeds naar ${t}?`,
    greeting: (n) => `Hi ${n},`,
    guestTriggeredHeadline: (t) => `Goed nieuws &mdash; je gasten hebben genoten van <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} beoordeelde de avond met <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} van je gasten hebben de avond beoordeeld &mdash; gemiddeld <strong style="color: #f59e0b;">${avg}/5 sterren</strong>`,
    askReview: 'Als je het leuk vond om gastheer te zijn, zouden we een korte Trustpilot-review enorm waarderen. Het kost zo\'n 30 seconden en helpt andere gastheren ons te vinden.',
    standardHeadline: (t) => `Hoe was <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'We hopen dat jij en je gasten een topavond hadden! Als je het leuk vond om gastheer te zijn, zouden we een korte Trustpilot-review enorm waarderen. Het kost zo\'n 30 seconden en helpt andere gastheren om Mystery Maker te ontdekken.',
    reviewCta: 'Trustpilot-review achterlaten ★',
    feedbackLink: 'Of stuur ons rechtstreeks uitgebreide feedback',
    shareTitle: 'Je vrienden zullen dit ook geweldig vinden',
    shareBody: 'Als gasten vroegen "waar heb je dit vandaan?" &mdash; stuur ze hier naartoe. Elk mystery is uniek.',
    shareCta: 'Mystery Maker delen →',
    inviteBody1: (t) => `We hopen dat <strong style="color: #F5F0E8;">${t}</strong> een hit was. Vast leunde minstens één gast die avond naar je toe met: <em>"waar heb je dit vandaan?"</em>`,
    inviteBody2: 'Elk mystery op Mystery Maker wordt vanaf nul gegenereerd, dus geen twee feesten zijn hetzelfde. Wil een vriend zijn eigen mystery organiseren? Stuur hem onderstaande link &mdash; hij ontwerpt iets rond zijn eigen thema, gastenaantal en inside jokes.',
    inviteCopyLink: 'Of kopieer gewoon deze link:',
    unsub: 'Uitschrijven voor follow-up e-mails',
  },
  da: {
    subjectGuestsLoved: (t) => `Dine gæster elskede ${t}!`,
    subjectStandard: (t) => `Hvordan gik ${t}?`,
    subjectInviteFriends: (t) => `Spørger venner stadig til ${t}?`,
    greeting: (n) => `Hej ${n}`,
    guestTriggeredHeadline: (t) => `Godt nyt &mdash; dine gæster nød <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} gav aftenen <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} af dine gæster har vurderet aftenen &mdash; gennemsnit <strong style="color: #f59e0b;">${avg}/5 stjerner</strong>`,
    askReview: 'Hvis du nød at være vært, vil vi sætte stor pris på en hurtig anmeldelse på Trustpilot. Det tager omkring 30 sekunder og hjælper andre værter med at finde os.',
    standardHeadline: (t) => `Hvordan gik <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'Vi håber, du og dine gæster havde en fantastisk aften! Hvis du nød at være vært, vil vi sætte stor pris på en hurtig anmeldelse på Trustpilot. Det tager omkring 30 sekunder og hjælper andre værter med at opdage Mystery Maker.',
    reviewCta: 'Skriv en Trustpilot-anmeldelse ★',
    feedbackLink: 'Eller giv os detaljeret feedback direkte',
    shareTitle: 'Dine venner vil også elske det',
    shareBody: 'Hvis dine gæster spurgte "hvor har du fundet det her?", så send dem hertil. Hvert mysterium er unikt.',
    shareCta: 'Del Mystery Maker →',
    inviteBody1: (t) => `Vi håber, <strong style="color: #F5F0E8;">${t}</strong> blev en succes. Vi tør vædde på, at mindst én gæst lænede sig over mod dig den aften og spurgte: <em>"hvor har du fundet det her?"</em>`,
    inviteBody2: 'Hvert mysterium på Mystery Maker bliver bygget fra bunden, så ingen fester spiller det samme. Hvis en ven vil holde sit eget, så send ham linket nedenfor &mdash; han kan designe noget bygget op om sit eget tema, gæsteantal og indforståede jokes.',
    inviteCopyLink: 'Eller kopier bare dette link:',
    unsub: 'Afmeld opfølgningsmails',
  },
  sv: {
    subjectGuestsLoved: (t) => `Dina gäster älskade ${t}!`,
    subjectStandard: (t) => `Hur gick ${t}?`,
    subjectInviteFriends: (t) => `Frågar vänner fortfarande om ${t}?`,
    greeting: (n) => `Hej ${n}!`,
    guestTriggeredHeadline: (t) => `Goda nyheter &mdash; dina gäster gillade <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} gav kvällen <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} av dina gäster har betygsatt kvällen &mdash; snitt <strong style="color: #f59e0b;">${avg}/5 stjärnor</strong>`,
    askReview: 'Om du tyckte det var kul att vara värd skulle vi uppskatta en snabb recension på Trustpilot. Det tar runt 30 sekunder och hjälper andra värdar att hitta oss.',
    standardHeadline: (t) => `Hur gick <strong style="color: #F5F0E8;">${t}</strong>?`,
    standardBody: 'Vi hoppas att du och dina gäster hade en kanonkväll! Om du tyckte det var kul att vara värd skulle vi uppskatta en snabb recension på Trustpilot. Det tar runt 30 sekunder och hjälper andra värdar att hitta Mystery Maker.',
    reviewCta: 'Skriv en Trustpilot-recension ★',
    feedbackLink: 'Eller dela detaljerad feedback direkt med oss',
    shareTitle: 'Dina vänner kommer också älska det',
    shareBody: 'Om dina gäster frågade "var fick du tag i det här?" &mdash; skicka dem hit. Varje mysterium är unikt.',
    shareCta: 'Dela Mystery Maker →',
    inviteBody1: (t) => `Vi hoppas att <strong style="color: #F5F0E8;">${t}</strong> blev en hit. Säkert lutade sig minst en gäst över bordet den kvällen och frågade: <em>"var fick du tag i det här?"</em>`,
    inviteBody2: 'Varje mysterium på Mystery Maker genereras från grunden, så inga två fester spelar detsamma. Vill en kompis ordna ett eget? Skicka länken nedan &mdash; hen kan designa något kring sitt eget tema, gästantal och insider-skämt.',
    inviteCopyLink: 'Eller kopiera bara den här länken:',
    unsub: 'Avregistrera dig från uppföljningsmejl',
  },
  fi: {
    subjectGuestsLoved: (t) => `Vieraasi rakastivat mysteeriä ${t}!`,
    subjectStandard: (t) => `Miten ${t} sujui?`,
    subjectInviteFriends: (t) => `Kyseleekö kaverit yhä mysteeristä ${t}?`,
    greeting: (n) => `Hei ${n},`,
    guestTriggeredHeadline: (t) => `Hyviä uutisia &mdash; vieraasi nauttivat illasta <strong style="color: #F5F0E8;">${t}</strong>!`,
    guestLineSingle: (g, stars) => `${g} arvioi illan: <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `${c} vierastasi arvioi illan &mdash; keskiarvo <strong style="color: #f59e0b;">${avg}/5 tähteä</strong>`,
    askReview: 'Jos isännöinti oli mukavaa, pikainen Trustpilot-arvostelu olisi valtava apu. Se kestää noin 30 sekuntia ja auttaa muita isäntiä löytämään meidät.',
    standardHeadline: (t) => `Miten <strong style="color: #F5F0E8;">${t}</strong> sujui?`,
    standardBody: 'Toivomme, että sinulla ja vierailla oli mahtava ilta! Jos isännöinti oli mukavaa, pikainen Trustpilot-arvostelu olisi valtava apu. Se kestää noin 30 sekuntia ja auttaa muita isäntiä löytämään Mystery Makerin.',
    reviewCta: 'Jätä Trustpilot-arvostelu ★',
    feedbackLink: 'Tai lähetä meille suoraan tarkempi palaute',
    shareTitle: 'Kaverisi rakastavat tätä myös',
    shareBody: 'Jos vieraat kysyivät "mistä sinä tämän kaivoit?", ohjaa heidät tänne. Jokainen mysteeri on omanlaisensa.',
    shareCta: 'Jaa Mystery Maker →',
    inviteBody1: (t) => `Toivottavasti <strong style="color: #F5F0E8;">${t}</strong> oli täysosuma. Veikkaamme, että ainakin yksi vieras kallistui sinun puoleesi sinä iltana ja kysyi: <em>"mistä sinä tämän kaivoit?"</em>`,
    inviteBody2: 'Jokainen Mystery Makerin mysteeri syntyy alusta asti uudestaan, joten kahta samanlaista juhlaa ei ole. Jos kaverisi haluaa järjestää omansa, lähetä alla oleva linkki &mdash; hän voi rakentaa kokonaisuuden oman teemansa, vierasmääränsä ja sisäpiirivitsiensä ympärille.',
    inviteCopyLink: 'Tai kopioi vain tämä linkki:',
    unsub: 'Peruuta seurantaviestit',
  },
  ko: {
    subjectGuestsLoved: (t) => `손님들이 ${t}를 정말 좋아했어요!`,
    subjectStandard: (t) => `${t}는 어땠나요?`,
    subjectInviteFriends: (t) => `친구들이 아직도 ${t}에 대해 묻나요?`,
    greeting: (n) => `${n}님, 안녕하세요.`,
    guestTriggeredHeadline: (t) => `반가운 소식입니다 &mdash; 손님들이 <strong style="color: #F5F0E8;">${t}</strong>를 즐겁게 즐겼어요!`,
    guestLineSingle: (g, stars) => `${g}님이 별점 <strong style="color: #f59e0b;">${stars}</strong>를 남겼습니다`,
    guestLineMany: (c, avg) => `손님 ${c}명이 평가를 남겼어요 &mdash; 평균 <strong style="color: #f59e0b;">5점 만점에 ${avg}점</strong>`,
    askReview: '호스팅이 즐거우셨다면 Trustpilot에 짧은 리뷰를 남겨주시면 큰 힘이 됩니다. 약 30초면 끝나고, 다른 호스트들이 저희를 찾는 데 도움이 됩니다.',
    standardHeadline: (t) => `<strong style="color: #F5F0E8;">${t}</strong>는 어땠나요?`,
    standardBody: '함께한 손님들과 멋진 시간을 보내셨길 바랍니다! 호스팅이 즐거우셨다면 Trustpilot에 짧은 리뷰를 남겨주시면 큰 힘이 됩니다. 약 30초면 끝나고, 더 많은 호스트들이 Mystery Maker를 알아갈 수 있어요.',
    reviewCta: 'Trustpilot 리뷰 남기기 ★',
    feedbackLink: '또는 자세한 의견을 직접 보내기',
    shareTitle: '친구들도 분명 좋아할 거예요',
    shareBody: '손님들이 "이거 어디서 구했어요?"라고 물었다면, 이쪽으로 안내해 주세요. 모든 미스터리는 단 하나뿐이에요.',
    shareCta: 'Mystery Maker 공유하기 →',
    inviteBody1: (t) => `<strong style="color: #F5F0E8;">${t}</strong>가 큰 호응을 얻었길 바랍니다. 그날 밤 적어도 한 명의 손님은 슬쩍 다가와 <em>"이거 어디서 구했어요?"</em>라고 물었을 거예요.`,
    inviteBody2: 'Mystery Maker의 모든 미스터리는 처음부터 새로 만들어지기 때문에 같은 파티가 두 번 열리지 않습니다. 친구가 직접 호스팅하고 싶어 한다면 아래 링크를 보내 주세요 &mdash; 자기 테마와 인원, 끼리끼리만 통하는 농담까지 모두 반영해서 새로 설계할 수 있어요.',
    inviteCopyLink: '또는 이 링크를 그대로 복사해 보내세요:',
    unsub: '후속 이메일 수신 거부',
  },
  ja: {
    subjectGuestsLoved: (t) => `ゲストの皆さん、『${t}』をとても気に入っていました！`,
    subjectStandard: (t) => `『${t}』はいかがでしたか？`,
    subjectInviteFriends: (t) => `今でも友人から『${t}』のことを聞かれますか？`,
    greeting: (n) => `${n}さん、こんにちは。`,
    guestTriggeredHeadline: (t) => `嬉しいお知らせです &mdash; ゲストの皆さんが<strong style="color: #F5F0E8;">『${t}』</strong>を楽しんでくださいました！`,
    guestLineSingle: (g, stars) => `${g}さんが体験を <strong style="color: #f59e0b;">${stars}</strong> と評価しました`,
    guestLineMany: (c, avg) => `${c}名のゲストが体験を評価 &mdash; 平均 <strong style="color: #f59e0b;">5点満点中${avg}点</strong>`,
    askReview: 'ホストとして楽しんでいただけたなら、Trustpilotで短いレビューをいただけるととても助かります。30秒ほどで完了し、他のホストの方々が私たちを見つける手助けになります。',
    standardHeadline: (t) => `<strong style="color: #F5F0E8;">『${t}』</strong>はいかがでしたか？`,
    standardBody: 'あなたとゲストの皆さまが素敵な時間を過ごされたことを願っています。ホストとして楽しんでいただけたなら、Trustpilotで短いレビューをいただけるととても助かります。30秒ほどで完了し、他のホストの方々がMystery Makerを知るきっかけになります。',
    reviewCta: 'Trustpilotでレビューを書く ★',
    feedbackLink: 'もしくは詳しい感想を私たちへ直接お寄せください',
    shareTitle: 'ご友人もきっと気に入るはずです',
    shareBody: 'ゲストに「これ、どこで手に入れたの？」と聞かれたら、こちらをご案内ください。どのミステリーも世界に一つだけです。',
    shareCta: 'Mystery Makerをシェア →',
    inviteBody1: (t) => `<strong style="color: #F5F0E8;">『${t}』</strong>が大成功だったことを願っています。あの夜、少なくとも一人のゲストがあなたに身を乗り出して<em>「これ、どこで手に入れたの？」</em>と尋ねたことでしょう。`,
    inviteBody2: 'Mystery Makerのミステリーはすべて一から生成されるので、まったく同じパーティーは二つとありません。ご友人がご自身のパーティーを開きたいときは、以下のリンクをお送りください &mdash; テーマやゲスト人数、内輪ネタに合わせて、その人だけの物語を組み立てることができます。',
    inviteCopyLink: 'もしくはこのリンクをコピーしてお送りください：',
    unsub: 'フォローアップメールの配信を停止',
  },
  'zh-cn': {
    subjectGuestsLoved: (t) => `你的宾客都爱上《${t}》了！`,
    subjectStandard: (t) => `《${t}》玩得怎么样？`,
    subjectInviteFriends: (t) => `朋友还在问《${t}》的事？`,
    greeting: (n) => `${n}，你好：`,
    guestTriggeredHeadline: (t) => `好消息 &mdash; 你的宾客们玩 <strong style="color: #F5F0E8;">${t}</strong> 玩得很尽兴！`,
    guestLineSingle: (g, stars) => `${g} 把这次体验评为 <strong style="color: #f59e0b;">${stars}</strong>`,
    guestLineMany: (c, avg) => `你的 ${c} 位宾客都给出了评价 &mdash; 平均 <strong style="color: #f59e0b;">${avg}/5 星</strong>`,
    askReview: '如果你享受这次主持的过程，我们非常希望你能在 Trustpilot 上留下一段简短的评价。大约 30 秒就能完成，并能帮助更多主持人发现我们。',
    standardHeadline: (t) => `<strong style="color: #F5F0E8;">${t}</strong> 玩得怎么样？`,
    standardBody: '希望你和宾客们度过了一个超棒的夜晚！如果你享受这次主持的过程，我们非常希望你能在 Trustpilot 上留下一段简短的评价。大约 30 秒就能完成，让更多主持人有机会发现 Mystery Maker。',
    reviewCta: '在 Trustpilot 留下评价 ★',
    feedbackLink: '或者直接把详细反馈告诉我们',
    shareTitle: '朋友们一定也会喜欢',
    shareBody: '如果有宾客问你"这是从哪儿弄来的？"，把他们带到这里来。每个谜案都是独一无二的。',
    shareCta: '分享 Mystery Maker →',
    inviteBody1: (t) => `希望<strong style="color: #F5F0E8;">${t}</strong>大获成功。我们敢打赌，那晚至少有一位宾客凑过来问你：<em>"这是从哪儿弄来的？"</em>`,
    inviteBody2: 'Mystery Maker 上的每一个谜案都是从头生成的，所以没有两场派对玩到的是同一个故事。如果朋友想自己办一场，把下面的链接发给他 &mdash; 他可以围绕自己的主题、人数和内部梗，量身打造属于自己的故事。',
    inviteCopyLink: '或者直接复制这个链接：',
    unsub: '退订后续邮件',
  },
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("followup_emails")
      .select(`
        id,
        conversation_id,
        user_id,
        email_type,
        scheduled_for
      `)
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No pending emails" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const email of pendingEmails) {
      try {
        const { data: convo } = await supabase
          .from("conversations")
          .select("title, unsubscribed_from_followups, is_paid")
          .eq("id", email.conversation_id)
          .single();

        if (!convo) {
          await markSkipped(supabase, email.id, "conversation_not_found");
          continue;
        }

        if (convo.unsubscribed_from_followups) {
          await markSkipped(supabase, email.id, "unsubscribed");
          continue;
        }

        // invite_friends only goes to paid hosts (a free draft owner has
        // nothing meaningful to share yet).
        if (email.email_type === "invite_friends" && !convo.is_paid) {
          await markSkipped(supabase, email.id, "not_paid");
          continue;
        }

        const { data: userData } = await supabase.auth.admin.getUserById(email.user_id);
        const hostEmail = userData?.user?.email;

        if (!hostEmail) {
          await markSkipped(supabase, email.id, "no_host_email");
          continue;
        }

        const hostName = userData?.user?.user_metadata?.full_name
          || userData?.user?.user_metadata?.name
          || hostEmail.split("@")[0];

        const mysteryTitle = convo.title || "Your Mystery";

        const locale: Locale = await getUserLanguage(supabase, email.user_id);
        const t = pickByLocale(T, locale);

        let subject: string;
        let htmlBody: string;

        if (email.email_type === "invite_friends") {
          const shareUrl = buildShareUrl(email.user_id, "invite_friends");
          subject = t.subjectInviteFriends(mysteryTitle);
          htmlBody = buildInviteFriendsEmail(locale, t, hostName, mysteryTitle, shareUrl, email.conversation_id);
        } else if (email.email_type === "character_removal_announcement") {
          const ctaUrl = `https://www.mysterymaker.party/mystery/${email.conversation_id}`;
          subject = `What to do if a guest can't make it to ${mysteryTitle}`;
          htmlBody = buildCharacterRemovalAnnouncementEmail(hostName, mysteryTitle, ctaUrl);
        } else {
          // how_did_it_go (existing path)
          const { data: existingFeedback } = await supabase
            .from("mystery_feedback")
            .select("id")
            .eq("conversation_id", email.conversation_id)
            .maybeSingle();

          if (existingFeedback) {
            await markSkipped(supabase, email.id, "host_already_gave_feedback");
            continue;
          }

          const guestFeedback = await getPositiveGuestFeedback(supabase, email.conversation_id);
          const feedbackUrl = `https://www.mysterymaker.party/feedback/${email.conversation_id}`;
          const shareUrl = buildShareUrl(email.user_id, "trustpilot_followup");

          htmlBody = guestFeedback
            ? buildGuestTriggeredEmail(locale, t, hostName, mysteryTitle, guestFeedback, feedbackUrl, shareUrl)
            : buildStandardEmail(locale, t, hostName, mysteryTitle, feedbackUrl, shareUrl);

          subject = guestFeedback
            ? t.subjectGuestsLoved(mysteryTitle)
            : t.subjectStandard(mysteryTitle);
        }

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [hostEmail],
            subject,
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          errors.push(`${email.id}: Resend error ${resendResponse.status}`);
          console.error(`Failed to send ${email.id}:`, errorText);
          continue;
        }

        await supabase
          .from("followup_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);

        sentCount++;
        console.log(`Sent ${email.email_type} (${locale}) for ${email.conversation_id}`);
      } catch (err) {
        errors.push(`${email.id}: ${err.message}`);
        console.error(`Error processing ${email.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: pendingEmails.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-followup-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function markSkipped(supabase: any, emailId: string, reason: string) {
  await supabase
    .from("followup_emails")
    .update({ status: "skipped", skipped_reason: reason })
    .eq("id", emailId);
}

async function getPositiveGuestFeedback(supabase: any, conversationId: string) {
  const { data: packages } = await supabase
    .from("mystery_packages")
    .select("id")
    .eq("conversation_id", conversationId);

  if (!packages || packages.length === 0) return null;

  const packageIds = packages.map((p: any) => p.id);

  const { data: characters } = await supabase
    .from("mystery_characters")
    .select("id")
    .in("package_id", packageIds);

  if (!characters || characters.length === 0) return null;

  const characterIds = characters.map((c: any) => c.id);

  const { data: assignments } = await supabase
    .from("character_assignments")
    .select("id")
    .in("character_id", characterIds);

  if (!assignments || assignments.length === 0) return null;

  const assignmentIds = assignments.map((a: any) => a.id);

  const { data: feedback } = await supabase
    .from("guest_feedback")
    .select("star_rating, character_name, best_part")
    .in("character_assignment_id", assignmentIds)
    .gte("star_rating", 4)
    .order("star_rating", { ascending: false })
    .limit(3);

  if (!feedback || feedback.length === 0) return null;

  return {
    count: feedback.length,
    topRating: feedback[0].star_rating,
    topName: feedback[0].character_name,
    topHighlight: feedback[0].best_part,
    averageRating: Math.round((feedback.reduce((sum: number, f: any) => sum + f.star_rating, 0) / feedback.length) * 10) / 10,
  };
}

function buildShareUrl(userId: string, campaign: string): string {
  // UTM-tagged share link — designed so it can be upgraded to a true ?ref=CODE
  // when the two-sided referral coupon system lands without changing the email.
  const params = new URLSearchParams({
    utm_source: "share",
    utm_medium: "email",
    utm_campaign: campaign,
    utm_content: `host-${userId}`,
  });
  return `https://www.mysterymaker.party/?${params.toString()}`;
}

function buildShareSection(t: FollowupStrings, shareUrl: string): string {
  return `
    <div style="margin: 24px 0 8px 0; padding: 16px; background: rgba(245,240,232,0.04); border: 1px solid rgba(245,240,232,0.1); border-radius: 6px;">
      <p style="margin: 0 0 8px 0; color: #F5F0E8; font-size: 14px; font-weight: 600;">${t.shareTitle}</p>
      <p style="margin: 0 0 12px 0; color: rgba(245,240,232,0.6); font-size: 13px;">
        ${t.shareBody}
      </p>
      <a href="${shareUrl}" style="display: inline-block; color: #F5F0E8; font-size: 13px; text-decoration: none; padding: 8px 14px; border: 1px solid rgba(245,240,232,0.25); border-radius: 4px;">${t.shareCta}</a>
    </div>
  `;
}

function buildGuestTriggeredEmail(
  locale: Locale,
  t: FollowupStrings,
  hostName: string,
  mysteryTitle: string,
  guestFeedback: any,
  feedbackUrl: string,
  shareUrl: string
): string {
  const starDisplay = "★".repeat(guestFeedback.topRating) + "☆".repeat(5 - guestFeedback.topRating);
  const guestLine = guestFeedback.count === 1
    ? t.guestLineSingle(guestFeedback.topName, starDisplay)
    : t.guestLineMany(guestFeedback.count, guestFeedback.averageRating);

  const highlightBlock = guestFeedback.topHighlight
    ? `<div style="background: #000000; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: rgba(245,240,232,0.7); font-style: italic;">"${guestFeedback.topHighlight}"</p>
        <p style="margin: 8px 0 0 0; color: rgba(245,240,232,0.4); font-size: 13px;">- ${guestFeedback.topName}</p>
      </div>`
    : "";

  return buildTrustpilotShell(
    locale,
    t,
    hostName,
    t.guestTriggeredHeadline(mysteryTitle),
    `${guestLine}${highlightBlock}
    <p style="color: rgba(245,240,232,0.7); margin-top: 20px;">
      ${t.askReview}
    </p>`,
    feedbackUrl,
    shareUrl
  );
}

function buildStandardEmail(
  locale: Locale,
  t: FollowupStrings,
  hostName: string,
  mysteryTitle: string,
  feedbackUrl: string,
  shareUrl: string
): string {
  return buildTrustpilotShell(
    locale,
    t,
    hostName,
    t.standardHeadline(mysteryTitle),
    `<p style="color: rgba(245,240,232,0.7);">
      ${t.standardBody}
    </p>`,
    feedbackUrl,
    shareUrl
  );
}

function buildInviteFriendsEmail(
  locale: Locale,
  t: FollowupStrings,
  hostName: string,
  mysteryTitle: string,
  shareUrl: string,
  conversationId: string
): string {
  const unsubUrl = `https://www.mysterymaker.party/feedback/${conversationId}?unsubscribe=true`;
  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">${t.greeting(hostName)}</p>

    <p style="color: rgba(245,240,232,0.85); margin-bottom: 16px;">
      ${t.inviteBody1(mysteryTitle)}
    </p>

    <p style="color: rgba(245,240,232,0.7); margin-bottom: 24px;">
      ${t.inviteBody2}
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${shareUrl}" style="display: inline-block; background: #C81400; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">${t.shareCta}</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 13px; text-align: center; margin: 16px 0 0 0;">
      ${t.inviteCopyLink} <span style="color: rgba(245,240,232,0.7);">mysterymaker.party</span>
    </p>

    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 28px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <a href="${unsubUrl}" style="color: rgba(245,240,232,0.3); text-decoration: underline;">${t.unsub}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}

// One-time backfill announcement, English only (all 33 recipients on the
// 2026-08-16 send are 'en' locale — re-verify before reusing this for any
// other list). No unsubscribe footer: this is a single send, not a
// recurring follow-up series, so "unsubscribe from follow-up emails" isn't
// applicable — conversations.unsubscribed_from_followups is still honored
// at the caller level before this ever gets built.
function buildCharacterRemovalAnnouncementEmail(
  hostName: string,
  mysteryTitle: string,
  ctaUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">Hi ${hostName},</p>

    <p style="color: rgba(245,240,232,0.85); margin-bottom: 16px;">
      You can already edit any character in <strong style="color: #F5F0E8;">${mysteryTitle}</strong>, but removing one entirely is more complex than a text edit. Their alibi, rumors, and evidence are woven into everyone else's material too.
    </p>

    <p style="color: rgba(245,240,232,0.85); margin-bottom: 12px;">
      You can now use our <strong style="color: #F5F0E8;">Remove A Character</strong> feature:
    </p>

    <ul style="background: #000000; border-left: 4px solid #C81400; padding: 16px 16px 16px 36px; margin: 0 0 24px 0; border-radius: 4px; color: rgba(245,240,232,0.85);">
      <li style="margin-bottom: 10px;">Remove a character from every character sheet, the detective script, and evidence cards, so nothing left behind mentions them</li>
      <li style="margin-bottom: 10px;">Remove as many characters as you want for one flat fee of $5</li>
      <li>Takes a few minutes to process, you'll get an email when it's done</li>
    </ul>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Remove a character from ${mysteryTitle} &rarr;</a>
    </div>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}

function buildTrustpilotShell(
  locale: Locale,
  t: FollowupStrings,
  hostName: string,
  headline: string,
  bodyContent: string,
  feedbackUrl: string,
  shareUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">${t.greeting(hostName)}</p>

    <p style="color: rgba(245,240,232,0.7); margin-bottom: 20px;">${headline}</p>

    ${bodyContent}

    <div style="text-align: center; margin: 28px 0;">
      <a href="${TRUSTPILOT_REVIEW_URL}" style="display: inline-block; background: #00b67a; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">${t.reviewCta}</a>
    </div>

    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${feedbackUrl}" style="color: rgba(245,240,232,0.5); font-size: 13px; text-decoration: underline;">${t.feedbackLink}</a>
    </div>

    ${buildShareSection(t, shareUrl)}

    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <a href="${feedbackUrl}?unsubscribe=true" style="color: rgba(245,240,232,0.3); text-decoration: underline;">${t.unsub}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}
