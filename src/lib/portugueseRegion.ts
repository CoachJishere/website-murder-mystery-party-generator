// European vs Brazilian Portuguese (ADR-0169). The site has a single "pt" UI locale, so the dialect a customer expects comes from the browser's
// language list: "pt-PT" (Portugal and the African and Asian Portuguese-speaking countries that use the European norm) or "pt-BR".
// A bare "pt" or no Portuguese entry says nothing, so it returns null and the server decides (default European Portuguese, behind a switch).
export type PortugueseRegion = "pt-PT" | "pt-BR";

const EUROPEAN_NORM = /^pt[-_](pt|ao|mz|cv|gw|st|tl|mo)(?![a-z])/i;

export function detectPortugueseRegion(languages: readonly string[] | undefined | null): PortugueseRegion | null {
  if (!languages) return null;
  for (const raw of languages) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim();
    if (!/^pt(?![a-z])/i.test(tag)) continue;
    if (/^pt[-_]br(?![a-z])/i.test(tag)) return "pt-BR";
    if (EUROPEAN_NORM.test(tag)) return "pt-PT";
    // A bare "pt" or an unknown region: keep looking, a later pt-XX entry may be explicit.
  }
  return null;
}
