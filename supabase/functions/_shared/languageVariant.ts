// European vs Brazilian Portuguese (ADR-0170). The language detectors only know "pt"; the variant a package was generated in is decided at
// generation time by mystery-webhook-trigger and stored in conversations.language_variant ("pt-PT" or "pt-BR", null for every other language and
// for every package generated before ADR-0170). A null or "pt-BR" variant keeps the Brazilian tables exactly as before.
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
