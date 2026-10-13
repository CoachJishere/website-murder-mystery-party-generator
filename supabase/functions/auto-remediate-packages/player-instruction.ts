// Pure helper for auto-remediate-packages: a character-sheet field that hands a decision back to the player
// ("Choose for yourself what this secret is...") instead of stating it. ADR-0103 Addendum 93 (Dead Man's Saddle,
// Jessica Calloway's secret: the brief never defined it and the Child passed the gap on to the player).
//
// Keep in sync BY HAND with package_meta_text_leak() (the `instruction_rx` marker and the `instruction_txt` field list in
// character_hit; supabase/migrations/20261013120000_*.sql). Only the NARRATIVE fields below are checked, never the spoken
// ones (introduction, rumors, scripts): in spoken lines "it's up to you to decide" is ordinary dialogue, and a false hit
// costs a paid regeneration. The SQL detector flags a hit, but stripArtifactLines() sees nothing to strip in prose like
// this, so without this mirror the heal would find "nothing to do" and the package would sit held until an escalation.

export const PLAYER_INSTRUCTION_RX =
  /choose for yourself|decide for yourself|in keeping with your character|up to you to (?:decide|choose)/i;

/** The fields the SQL detector scans for this pattern. */
export const PLAYER_INSTRUCTION_FIELDS: readonly string[] = ["secret", "background", "relationships", "description"];

export function hasPlayerInstruction(field: string, text: string | null | undefined): boolean {
  return !!text && PLAYER_INSTRUCTION_FIELDS.includes(field) && PLAYER_INSTRUCTION_RX.test(text);
}
