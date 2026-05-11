/**
 * Shared brand-leak rot sanitizer for blog content.
 *
 * Mirrors the bulk-cleanup SQL regexes from 2026-05-10 / 2026-05-11
 * (see CHANGELOG entries). Used by:
 *   - scripts/sync-blog-map.mjs — runs on every xlsx → Supabase write
 *   - scripts/clean-blog-map.mjs — one-shot cleaner for the xlsx source
 *
 * Keep the four regex blocks (A–D) in sync with the SQL patterns. The
 * Last-updated date bumper (E) auto-bumps the visible freshness header
 * to the current month/year per language on every sync — turning a
 * manual periodic bump into a continuous signal.
 */

// ── A. URL-aware bare-phrase `mysterymaker.party` → `MysteryMaker`
// The leading `[^/@:.]` exempts https://, ://, @, www. forms.
const BARE_PHRASE = /(^|[^/@:.])mysterymaker\.party/gi;

// ── B. Translated-brand + .party (JA/ZH/KO character-translated brand
// names with `.party` still attached as if part of the URL)
const TRANSLATED_BRAND_DOTPARTY = /(ミステリーメーカー|神秘制造者|미스터리메이커)\.party/g;

// ── C. Path B parenthetical redundancy from prior cleanup pass
const PATH_B_PAREN = /MysteryMaker[ ]*\(MysteryMaker\)/g;

// ── D. Path B preposition/particle redundancy (Latin + JP hiragana/katakana
// + Korean Hangul + CJK ideographs). Runs twice to catch triple-mentions
// that single-pass `g` leaves behind.
const PATH_B_PREPOSITION = /MysteryMaker[ ]?[a-zA-ZÀ-ÿ가-힣ぁ-んァ-ヶー一-龥]{1,5}[ ]?MysteryMaker/g;

// ── KO/JA translated-brand-without-.party normalization to English brand.
// Compound forms first (longest match), then bare.
const JA_MURDER_PREFIX = /マーダーミステリーメーカー/g;
const JA_DOTPARTY_SUFFIX = /ミステリーメーカー・パーティー/g;
const JA_BARE_TRANSLATED = /ミステリーメーカー/g;
const KO_BARE_TRANSLATED = /미스터리메이커/g;

// ── E. Last-updated header date auto-bump. Per-language regex matches the
// `**<header>: <stale-month> <year>**` boilerplate and replaces the month +
// year with the current Date.now() values. Scoped to the bold-span boundary
// so body-prose dates aren't touched.
//
// Each entry: [regex, replacementBuilder(currentMonthName, currentYear)].
// `currentMonthName` is the locale-correct lowercase month string (the
// canonical convention used by 350+ sibling rows per language).
const MONTH_NAMES = {
  // 0-indexed: 0 = January
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  fr: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  it: ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'],
  da: ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'],
  fi: ['tammikuu','helmikuu','maaliskuu','huhtikuu','toukokuu','kesäkuu','heinäkuu','elokuu','syyskuu','lokakuu','marraskuu','joulukuu'],
  nl: ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'],
  pt: ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],
  sv: ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'],
};

// Header label per language → [regex matching ANY month + year inside the
// canonical `**...**` header, builder returning the canonical fresh form].
// CJK uses fullwidth colon `：` AND ASCII `:` variants.
function dateBumpers(year, monthIdx) {
  const m = (lang) => MONTH_NAMES[lang][monthIdx];
  return [
    // Latin-script families. Match any month token (Latin letters + diacritics) to catch all variants.
    { lang: 'en', re: /\*\*Last updated:\s*[A-Za-z]+\s+\d{4}\*\*/g, to: `**Last updated: ${m('en')} ${year}**` },
    { lang: 'es', re: /\*\*Última actualización:\s*[A-Za-zÀ-ÿ]+(?:\s+de)?\s+\d{4}\*\*/g, to: `**Última actualización: ${m('es')} de ${year}**` },
    { lang: 'fr', re: /\*\*Dernière mise à jour\s*:\s*[A-Za-zÀ-ÿ]+\s+\d{4}\*\*/g, to: `**Dernière mise à jour : ${m('fr')} ${year}**` },
    { lang: 'de', re: /\*\*Zuletzt aktualisiert:\s*[A-Za-zÀ-ÿ]+\s+\d{4}\*\*/g, to: `**Zuletzt aktualisiert: ${m('de')} ${year}**` },
    { lang: 'it', re: /\*\*Ultimo aggiornamento:\s*[A-Za-zÀ-ÿ]+\s+\d{4}\*\*/g, to: `**Ultimo aggiornamento: ${m('it')} ${year}**` },
    { lang: 'da', re: /\*\*Sidst opdateret:\s*[A-Za-zÀ-ÿ]+\s+\d{4}\*\*/g, to: `**Sidst opdateret: ${m('da')} ${year}**` },
    { lang: 'fi', re: /\*\*(?:Viimeksi päivitetty|Päivitetty viimeksi):\s*[A-Za-zÀ-ÿäö]+\s+\d{4}\*\*/g, to: `**Viimeksi päivitetty: ${m('fi')} ${year}**` },
    { lang: 'nl', re: /\*\*(?:Laatst bijgewerkt|Laatste update):\s*[A-Za-zÀ-ÿ]+\s+\d{4}\*\*/g, to: `**Laatst bijgewerkt: ${m('nl')} ${year}**` },
    { lang: 'pt', re: /\*\*Última atualização:\s*[A-Za-zÀ-ÿ]+(?:\s+de)?\s+\d{4}\*\*/g, to: `**Última atualização: ${m('pt')} de ${year}**` },
    { lang: 'sv', re: /\*\*Senast uppdaterad:\s*[A-Za-zÀ-ÿ]+\s+\d{4}\*\*/g, to: `**Senast uppdaterad: ${m('sv')} ${year}**` },
    // CJK. Bold span boundary + 2026年X月 / 2026년 X월. Fullwidth or ASCII colon both fine.
    { lang: 'ja', re: /\*\*[^*\n]{1,30}\d{4}年\s*\d{1,2}月\*\*/g, to: `**最終更新：${year}年${monthIdx + 1}月**` },
    { lang: 'ko', re: /\*\*[^*\n]{1,30}\d{4}년\s*\d{1,2}월\*\*/g, to: `**마지막 업데이트: ${year}년 ${monthIdx + 1}월**` },
    { lang: 'zh-cn', re: /\*\*[^*\n]{1,30}\d{4}年\s*\d{1,2}月\*\*/g, to: `**最后更新：${year}年${monthIdx + 1}月**` },
  ];
}

/**
 * Apply rot-removal regexes (A–D) to a single text field.
 * Pure function. Returns the cleaned string.
 */
export function sanitizeBrandLeakRot(text) {
  if (!text) return text;
  let s = String(text);
  // Order matters: any rot that produces a `MysteryMaker [stuff] MysteryMaker`
  // shape must be normalized to `MysteryMaker` BEFORE Path B runs, or Path B
  // can't see the redundancy. So normalize all brand variants → MysteryMaker
  // first, then collapse the resulting doubled forms.
  s = s.replace(TRANSLATED_BRAND_DOTPARTY, 'MysteryMaker');
  s = s.replace(JA_MURDER_PREFIX, 'MysteryMaker');
  s = s.replace(JA_DOTPARTY_SUFFIX, 'MysteryMaker');
  s = s.replace(JA_BARE_TRANSLATED, 'MysteryMaker');
  s = s.replace(KO_BARE_TRANSLATED, 'MysteryMaker');
  s = s.replace(BARE_PHRASE, '$1MysteryMaker');
  s = s.replace(PATH_B_PAREN, 'MysteryMaker');
  s = s.replace(PATH_B_PREPOSITION, 'MysteryMaker').replace(PATH_B_PREPOSITION, 'MysteryMaker');
  return s;
}

/**
 * Bump the `**Last updated: ...**` header to the current month/year for the
 * given language. No-op for languages without a known canonical header form.
 * Uses Date.now() unless `dateOverride` is provided (for testing).
 */
export function bumpLastUpdated(text, language, dateOverride) {
  if (!text) return text;
  const now = dateOverride ?? new Date();
  const year = now.getUTCFullYear();
  const monthIdx = now.getUTCMonth();
  const bumpers = dateBumpers(year, monthIdx);
  const match = bumpers.find(b => b.lang === language);
  if (!match) return text;
  return text.replace(match.re, match.to);
}

/**
 * Convenience: apply rot sanitizer + date bump in one call.
 * `language` is required for the date bump; pass null to skip it.
 */
export function sanitizeAndBump(text, language, dateOverride) {
  let s = sanitizeBrandLeakRot(text);
  if (language) s = bumpLastUpdated(s, language, dateOverride);
  return s;
}
