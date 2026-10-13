// ADR-0155 Decision 1: plan the heal for a duplicate `accomplice` role. Pure and dependency-light so it can be unit-tested with plain node
// (accomplice-heal.test.mjs). The heal is deliberately narrow: it acts only on the unambiguous shape and returns a reason otherwise, and the
// caller escalates on any reason. A relabel alone is never safe (the sheet text was written for the wrong role, see ADR-0103 Addendum 92), so a
// plan always includes the sheet fields to regenerate.
import { parseMasterContext } from "../review-package-quality/review-core.ts";

export type RoleRow = { id: string; name: string; role: string | null };

/** The role-dependent fields of a detective sheet: identity, social and rounds groups of regenerate-child-content (three Claude calls). */
export const DETECTIVE_SHEET_FIELDS = [
  "description", "background", "relationships", "secret", "introduction",
  "rumors", "accusations",
  "round2_questions", "round2_script", "round3_questions", "round3_script", "round4_questions", "round4_script", "final_statement",
];

/** Fields whose bullet-point twin (`<field>_pointform`) exists in the table; these go stale when the prose is regenerated. */
export const POINTFORM_TWINS = ["introduction", "rumors", "accusations", "round2_script", "round3_script", "round4_script", "final_statement"];

export type HealPlan =
  | { ok: true; demote: RoleRow; keep: RoleRow; toRole: "redHerring" | "suspect"; fields: string[] }
  | { ok: false; reason: string };

type Row = Record<string, unknown>;

const normName = (s: string) => s.toLowerCase().replace(/[‘’“”`´"']/g, "'").replace(/\s+/g, " ").trim();

/** "Dr. Victor/Victoria Thorne" gives both full spellings; a single name gives itself. */
function variants(name: string): string[] {
  const parts = normName(name).split(" ");
  let out = [""];
  for (const p of parts) {
    const alts = p.split("/").filter(Boolean);
    out = out.flatMap((o) => alts.map((a) => (o ? `${o} ${a}` : a)));
  }
  return out;
}

export function sameName(a: string, b: string): boolean {
  const vb = new Set(variants(b));
  return variants(a).some((v) => vb.has(v));
}

/** Visits every object node (including array elements) up to a bounded depth. */
function walkNodes(o: unknown, visit: (node: Row) => void, depth = 0): void {
  if (!o || typeof o !== "object" || depth > 8) return;
  if (Array.isArray(o)) { for (const x of o) walkNodes(x, visit, depth + 1); return; }
  visit(o as Row);
  for (const v of Object.values(o as Row)) walkNodes(v, visit, depth + 1);
}

const truthy = (v: unknown) => v === true || (typeof v === "string" && v.trim().toLowerCase() === "true");
const falsy = (v: unknown) => v === false || (typeof v === "string" && v.trim().toLowerCase() === "false");

/** Every distinct character name master_context gives as the accomplice. */
export function accompliceNames(masterContext: unknown): string[] {
  const names: string[] = [];
  for (const o of parseMasterContext(masterContext)) {
    walkNodes(o, (node) => {
      const sel = node.accompliceSelection;
      if (!sel || typeof sel !== "object" || Array.isArray(sel)) return;
      const c = (sel as Row).character;
      if (typeof c === "string" && c.trim()) names.push(c.trim());
    });
  }
  return names.filter((n, i) => names.findIndex((m) => sameName(m, n)) === i);
}

/** The master_context entries that carry a per-character verdict (`character` plus `isMurderer`/`isRedHerring`). */
function verdictEntries(masterContext: unknown): { name: string; isMurderer: unknown; isRedHerring: unknown }[] {
  const out: { name: string; isMurderer: unknown; isRedHerring: unknown }[] = [];
  for (const o of parseMasterContext(masterContext)) {
    walkNodes(o, (r) => {
      if (typeof r.character === "string" && "isMurderer" in r && "isRedHerring" in r) out.push({ name: r.character, isMurderer: r.isMurderer, isRedHerring: r.isRedHerring });
    });
  }
  return out;
}

export function planAccompliceRoleHeal(input: { style: string | null; delivered: boolean; chars: RoleRow[]; masterContext: unknown }): HealPlan {
  const no = (reason: string): HealPlan => ({ ok: false, reason });
  if (input.style !== "detective") return no("not a detective-style package (slip roles are drawn at the table, nothing safe to relabel)");
  if (input.delivered) return no("already delivered to the customer: regenerating a sheet would change what they printed");
  const accomplices = input.chars.filter((c) => c.role === "accomplice");
  if (accomplices.length !== 2) return no(`${accomplices.length} characters carry the accomplice role (the heal only handles exactly 2)`);

  const names = accompliceNames(input.masterContext);
  if (names.length === 0) return no("master_context names no accomplice");
  if (names.length > 1) return no(`master_context names more than one accomplice (${names.join(" / ")})`);
  const keepers = accomplices.filter((c) => sameName(c.name, names[0]));
  if (keepers.length !== 1) return no(`master_context's accomplice "${names[0]}" matches ${keepers.length} of the 2 accomplice-role characters`);
  const keep = keepers[0];
  const demote = accomplices.find((c) => c.id !== keep.id)!;

  const entries = verdictEntries(input.masterContext).filter((e) => sameName(e.name, demote.name));
  if (entries.length === 0) return no(`master_context has no per-character entry for "${demote.name}"`);
  if (entries.some((e) => truthy(e.isMurderer))) return no(`master_context marks "${demote.name}" as the murderer`);
  const redHerring = entries.some((e) => truthy(e.isRedHerring));
  const plain = entries.every((e) => falsy(e.isMurderer) && falsy(e.isRedHerring));
  if (!redHerring && !plain) return no(`master_context's entry for "${demote.name}" is not clearly innocent`);
  if (entries.some((e) => truthy(e.isRedHerring)) && entries.some((e) => falsy(e.isRedHerring))) return no(`master_context contradicts itself about "${demote.name}"`);
  return { ok: true, demote, keep, toRole: redHerring ? "redHerring" : "suspect", fields: DETECTIVE_SHEET_FIELDS };
}

export type RoleSwap = { characterId: string; from: string; to: string };

/**
 * Runs `body` with the corrected role written, and puts the old role back unless `body` reports success (returns true) - including when it
 * throws. This is the safety property of the heal: a relabel must never outlive a failed regeneration, or the gate would pass a sheet that was
 * written for the wrong role. `setRole` returns an error message or null. With no swap it just runs `body`.
 */
export async function runWithRoleSwap(
  setRole: (characterId: string, role: string) => Promise<string | null>,
  swap: RoleSwap | undefined,
  body: () => Promise<boolean>,
): Promise<{ swapError?: string; fixed: boolean }> {
  if (swap) {
    const error = await setRole(swap.characterId, swap.to);
    if (error) return { swapError: error, fixed: false };
  }
  let fixed = false;
  try {
    fixed = await body();
    return { fixed };
  } finally {
    if (swap && !fixed) {
      const error = await setRole(swap.characterId, swap.from);
      if (error) console.error(`ROLE RESTORE FAILED for ${swap.characterId}: ${error}`);
    }
  }
}
