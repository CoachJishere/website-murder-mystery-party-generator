import type { Locale } from "date-fns";
import { enUS, es, fr, de, it, pt, nl, da, sv, fi, ko, ja, zhCN } from "date-fns/locale";

// date-fns locale for the active i18n language (ADR-0161): purchase dates and similar must not stay English in a localized UI.
const BY_LANGUAGE: Record<string, Locale> = { en: enUS, es, fr, de, it, pt, nl, da, sv, fi, ko, ja, "zh-cn": zhCN, zh: zhCN };

export function dateLocaleFor(language: string | undefined): Locale {
  const lang = (language ?? "en").toLowerCase();
  return BY_LANGUAGE[lang] ?? BY_LANGUAGE[lang.split("-")[0]] ?? enUS;
}
