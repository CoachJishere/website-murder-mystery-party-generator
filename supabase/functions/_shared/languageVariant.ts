// European vs Brazilian Portuguese (ADR-0169). The language detectors only know "pt"; the variant a package was generated in is decided at
// generation time by mystery-webhook-trigger and stored in conversations.language_variant ("pt-PT" or "pt-BR", null for every other language and
// for every package generated before ADR-0169). A null or "pt-BR" variant keeps the Brazilian tables exactly as before.
export type PortugueseVariant = "pt-PT" | "pt-BR";

export function normalizeVariant(v: unknown): PortugueseVariant | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase().replace("_", "-");
  if (s === "pt-pt") return "pt-PT";
  if (s === "pt-br") return "pt-BR";
  return null;
}

/** The table code to use for a detected language code: "pt" becomes "pt-pt" only when the package was generated as European Portuguese. */
export function tableCode(detected: string | null, variant: unknown): string | null {
  return detected === "pt" && normalizeVariant(variant) === "pt-PT" ? "pt-pt" : detected;
}

/** The language name the Make Parent and Child receive in {{63.language}}; "Portuguese" stays the Brazilian pack, "European Portuguese" is its own pack block. */
export const PORTUGUESE_NAME: Record<PortugueseVariant, string> = { "pt-PT": "European Portuguese", "pt-BR": "Portuguese" };

/**
 * Which Portuguese the trigger asks for. null means "do nothing": the switch is off (today's behaviour, Brazilian "Portuguese").
 * An operator override (languageOverride "pt-pt" / "pt-br" on a service-role re-fire) wins, then the customer's browser region, then
 * European Portuguese when the browser did not say (Jonathan's call 2026-10-17: most likely customers are in Portugal).
 */
export function resolvePortugueseVariant(o: { enabled: boolean; override?: unknown; region?: unknown }): { variant: PortugueseVariant; name: string } | null {
  if (!o.enabled) return null;
  const variant = normalizeVariant(o.override) ?? normalizeVariant(o.region) ?? "pt-PT";
  return { variant, name: PORTUGUESE_NAME[variant] };
}
