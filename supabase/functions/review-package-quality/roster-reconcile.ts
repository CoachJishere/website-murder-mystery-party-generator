// Pure, dependency-free detector AND heal planner for a character the customer renamed after the concept was approved (ADR-0152).
//
// Why it exists: a late rename in the chat reaches master_context (the Parent reads everything after the approved snapshot) but not the
// roster the Child uses for names, so one sheet keeps the old name while every other sheet and the relationship matrix use the new one
// ("Champagnens Skygge": Agnes Weber vs Agnes Munk, "Bedstemor Signe Holm" vs "Signe Holm").
//
// The rule is deliberately narrow, because a wrong rename is worse than a missing one. A rename is planned only when ALL hold:
//   - a name in the master_context relationship matrix (never the victim or a non-playable name) is missing from the sheets, and exactly
//     one sheet name is missing from the matrix, and the two share a whole word of 3+ letters (a unique mutual pairing);
//   - the new name appears in at least max(2, 25 percent of) the OTHER sheets, and the old name in none of them.
// Anything else that looks like a mismatch is reported as `unresolved` (the caller makes it an open finding), never written.

export type SheetText = { name: string; text: string };
export type Rename = { from: string; to: string; mentionsOfNew: number };
export type Unresolved = { sheetOnly: string[]; matrixOnly: string[]; reason: string };

const unescapeJson = (s: string): string => { try { return JSON.parse(`"${s}"`); } catch { return s; } };
const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const words = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3));

/** Names used in the relationship matrix (character1 / character2) and the victim's name, from the raw master_context text. */
export function matrixNames(masterContext: string): { names: string[]; victim: string | null } {
  const set = new Map<string, string>();
  for (const m of masterContext.matchAll(/"character[12]"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const n = unescapeJson(m[1]).trim();
    if (n) set.set(key(n), n);
  }
  const v = masterContext.match(/"victimProfile"\s*:\s*\{[\s\S]{0,400}?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return { names: [...set.values()], victim: v ? unescapeJson(v[1]).trim() : null };
}

/** A sheet name may be a dual-name placeholder such as "Osric/Osryth"; either half counts as that sheet's name. */
const variantsOf = (name: string): string[] => [name, ...name.split("/")].map(key).filter(Boolean);

function countSheetsMentioning(needle: string, sheets: SheetText[], except: string): number {
  const nk = key(needle);
  if (!nk) return 0;
  return sheets.filter((s) => s.name !== except && key(s.text).includes(nk)).length;
}

/**
 * The Parent writes a customer's rename into master_context ("Agnes Munk (tidligere Agnes Weber ...)", "Agnes Weber skal have nyt efternavn: ...
 * ændret til Agnes Munk"). A rename is planned only when the old sheet name appears in master_context within 200 characters of a separate
 * occurrence of the new name. This keeps the heal away from sheets that merely carry the customer's short roster name while the generator
 * invented fuller names elsewhere (a roster "Ranger Pete" vs a generated "Ranger Pete Thistlewood"), which is not a rename.
 */
export function renameIsDocumented(masterContext: string, oldName: string, newName: string, window = 200): boolean {
  const hay = masterContext.toLowerCase(), o = oldName.trim().toLowerCase(), n = newName.trim().toLowerCase();
  if (!o || !n) return false;
  let i = hay.indexOf(o);
  while (i !== -1) {
    const end = i + o.length;
    const lo = Math.max(0, i - window), hi = Math.min(hay.length, end + window);
    let j = hay.indexOf(n, lo);
    while (j !== -1 && j < hi) {
      if (j + n.length <= i || j >= end) return true; // a separate occurrence of the new name, not the one inside the old name
      j = hay.indexOf(n, j + 1);
    }
    i = hay.indexOf(o, i + 1);
  }
  return false;
}

export function planRenames(masterContext: string, sheets: SheetText[]): { renames: Rename[]; unresolved: Unresolved | null } {
  const { names, victim } = matrixNames(masterContext);
  if (names.length < 3 || sheets.length < 3) return { renames: [], unresolved: null }; // not enough structure to compare
  const victimKey = victim ? key(victim) : null;
  const sheetKeys = new Set(sheets.flatMap((s) => variantsOf(s.name)));
  const matrixKeys = new Set(names.map(key));

  const matrixOnly = names.filter((n) => key(n) !== victimKey && !sheetKeys.has(key(n)));
  const sheetOnly = sheets.filter((s) => !variantsOf(s.name).some((v) => matrixKeys.has(v)) && !(victimKey && variantsOf(s.name).includes(victimKey)));
  if (matrixOnly.length === 0 || sheetOnly.length === 0) return { renames: [], unresolved: null };

  const need = Math.max(2, Math.ceil(0.25 * (sheets.length - 1)));
  const renames: Rename[] = [];
  const claimed = new Set<string>();
  for (const s of sheetOnly) {
    const sw = words(s.name);
    const partners = matrixOnly.filter((m) => [...words(m)].some((w) => sw.has(w)));
    if (partners.length !== 1) continue;
    const m = partners[0];
    const back = sheetOnly.filter((x) => [...words(x.name)].some((w) => words(m).has(w)));
    if (back.length !== 1 || claimed.has(key(m))) continue;
    const newMentions = countSheetsMentioning(m, sheets, s.name);
    const oldMentions = countSheetsMentioning(s.name, sheets, s.name);
    if (newMentions >= need && oldMentions === 0 && renameIsDocumented(masterContext, s.name, m)) { renames.push({ from: s.name, to: m.trim(), mentionsOfNew: newMentions }); claimed.add(key(m)); }
  }
  const done = new Set(renames.map((r) => key(r.from)));
  const left = sheetOnly.filter((s) => !done.has(key(s.name)));
  const leftMatrix = matrixOnly.filter((m) => !renames.some((r) => key(r.to) === key(m)));
  const unresolved: Unresolved | null = left.length || leftMatrix.length
    ? { sheetOnly: left.map((s) => s.name), matrixOnly: leftMatrix, reason: "names differ between master_context and the sheets but the rename rule did not hold" } : null;
  return { renames, unresolved };
}

/** Replace a name in a text, case-sensitively, whole string. Returns the new text and how many replacements were made. */
export function replaceName(text: string, from: string, to: string): { text: string; n: number } {
  if (!text || !from) return { text, n: 0 };
  const parts = text.split(from);
  return { text: parts.join(to), n: parts.length - 1 };
}
