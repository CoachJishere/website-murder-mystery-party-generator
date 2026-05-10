// Shared i18n primitives for transactional email edge functions.
//
// Inlined string tables live in each individual email function (see
// supabase/functions/send-*-email/index.ts) so each function is
// self-contained and resilient to cold starts — same pattern used by
// supabase/functions/mystery-ai/index.ts (LABELS_BY_LOCALE).
// This module only ships the Locale type, normalization, and the
// per-user language lookup helper.

export type Locale =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl'
  | 'da' | 'sv' | 'fi' | 'ko' | 'ja' | 'zh-cn';

export const KNOWN_LOCALES: ReadonlyArray<Locale> = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl',
  'da', 'sv', 'fi', 'ko', 'ja', 'zh-cn',
];

// Normalize a BCP-47 / variant tag to one of our known locales.
// Examples: "es-ES" → "es", "pt_BR" → "pt", "zh-CN" → "zh-cn",
// "zh-TW" → "zh-cn" (we only support Simplified), unknown → "en".
export function normalizeLocale(tag: unknown): Locale {
  if (typeof tag !== 'string' || !tag) return 'en';
  const lower = tag.toLowerCase().replace('_', '-');
  if (KNOWN_LOCALES.includes(lower as Locale)) return lower as Locale;
  if (lower.startsWith('zh')) return 'zh-cn';
  const base = lower.split('-')[0];
  if (KNOWN_LOCALES.includes(base as Locale)) return base as Locale;
  return 'en';
}

// Pick a value from a locale-keyed table, falling back to 'en'.
export function pickByLocale<T>(table: Record<Locale, T>, locale: Locale): T {
  return table[locale] ?? table.en;
}

// Look up the preferred language for a user from profiles.language.
// Returns 'en' if missing, unrecognized, or on any error.
export async function getUserLanguage(
  supabase: any,
  userId: string | null | undefined
): Promise<Locale> {
  if (!userId) return 'en';
  try {
    const { data } = await supabase
      .from('profiles')
      .select('language')
      .eq('id', userId)
      .maybeSingle();
    return normalizeLocale(data?.language);
  } catch {
    return 'en';
  }
}
