// Shared language detection (ADR-0143, moved here by ADR-0152 so the reviewer and the ready email use ONE copy). Pure, no Deno APIs.
// Row is any object with an optional `introduction` string.
type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------------------------------------------------------------
// ADR-0143: language detection for the auto-apply gate. The set of languages that may be edited automatically is a runtime setting
// (pipeline_settings.review_auto_apply_languages), so enabling one after calibration is a one-row update. Stopword ratios on a sample of
// introductions; calibrated on 17 packages of known language (EN, ES, FR, DE, IT, PT, NL): best ratio 0.076 to 0.204, runner-up at most 0.024.
// ---------------------------------------------------------------------------------------------------------------------------------
export const LANG_STOPWORDS: Record<string, RegExp> = {
  en: /\b(the|and|you|your|was|that|with|for|have|this|but|not|are|from|they|what|his|her)\b/gi,
  es: /\b(el|los|las|pero|más|está|también|cuando|donde|sobre|entre|muy|sin|porque|había|fue|soy|eres|nada|todo|todos|este|ese|esa|usted|ustedes|nuestro|nuestra|hay|ser)\b/gi,
  fr: /\b(est|dans|vous|nous|avec|mais|pas|une|qui|sur|cette|être|très|aussi|je|suis|elle|ils|sont|pour|comme|tout)\b/gi,
  de: /\b(und|nicht|ich|ist|mit|eine|aber|auch|noch|wir|euch|für|das|der|die|ein|dem|den|sich|war|hat)\b/gi,
  it: /\b(che|non|sono|per|una|della|nel|questo|anche|più|molto|ho|hai|gli|del|nella|essere|ma|come|era)\b/gi,
  pt: /\b(não|uma|você|para|mas|com|está|foi|são|mais|muito|também|ele|dos|nos|meu|minha|isso|era)\b/gi,
  nl: /\b(het|een|niet|van|zijn|maar|ook|nog|jullie|dat|voor|wij|naar|met|ik|heb|dit|was|geen)\b/gi,
  // Danish and Swedish share many function words, so only words that differ between them are listed (ADR-0149).
  da: /\b(og|ikke|jeg|af|hvad|noget|nogen|også|være|havde|kunne|hun|hende|vores|deres|meget|selv|der)\b/gi,
  sv: /\b(och|inte|jag|av|vad|något|någon|också|vara|hade|kunde|hon|henne|vår|våra|mycket|själv|där)\b/gi,
};

/** The language of a sample of text, or null when it is not clear (too little text, or two languages close together). */
export function detectLanguage(sample: string): string | null {
  const words = sample.split(/\s+/).filter(Boolean).length;
  if (words < 40) return null;
  const ranked = Object.entries(LANG_STOPWORDS)
    .map(([lang, rx]) => [lang, (sample.match(rx) ?? []).length / words] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const [best, second] = [ranked[0], ranked[1]];
  if (best[1] < 0.05 || best[1] < 2 * second[1]) return null;
  return best[0];
}

/** Sample used for detection: the first 700 characters of up to four introductions. */
export function languageSample(chars: Row[]): string {
  return chars.slice(0, 4).map((c) => String(c.introduction ?? "").slice(0, 700)).join(" ");
}
