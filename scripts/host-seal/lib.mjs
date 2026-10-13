// Shared helpers for the ADR-0158 host-seal checks. Read-only: they only GET from Supabase with the
// service-role key from .env (never printed). Outputs go to the OS temp dir, never into the repo,
// because fixtures contain customer package text.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const tsImport = (rel) => import(pathToFileURL(path.join(root, rel)).href); // needs node --experimental-strip-types
export const outDir = process.env.OUT || path.join(os.tmpdir(), "host-seal-render");

export function loadEnv() {
  return Object.fromEntries(
    fs.readFileSync(path.join(root, ".env"), "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
}

export function makeGet() {
  const env = loadEnv();
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!env.VITE_SUPABASE_URL || !key) throw new Error("missing VITE_SUPABASE_URL or service key in .env");
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  return async (p) => {
    const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${p}`, { headers: H });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };
}

/** Paid, non-test packages of one style, newest first, with their murderer/accomplice names. */
export async function loadPaidPackages(get, style = "detective", fields = "detective_script,evidence_cards") {
  const convs = await get("conversations?select=id,created_at,is_test,mystery_type,has_accomplice,player_count&is_paid=eq.true&limit=1000");
  const byId = new Map(convs.filter((c) => !c.is_test).map((c) => [c.id, c]));
  const pk = await get(`mystery_packages?select=id,conversation_id,created_at,mystery_style,${fields},mystery_characters(character_name,character_role)&mystery_style=eq.${style}&order=created_at.desc&limit=1000`);
  return pk.filter((r) => byId.has(r.conversation_id)).map((r) => ({ ...r, conv: byId.get(r.conversation_id) }))
    .sort((a, b) => b.conv.created_at.localeCompare(a.conv.created_at));
}

export const culprits = (r) => r.mystery_characters.filter((c) => ["murderer", "accomplice"].includes(c.character_role)).map((c) => ({ role: c.character_role, full: c.character_name }));

// Name parts of the first "A/B Surname" alternative, title words excluded, so "Dr." or "The" never counts.
const TITLES = /^(dr\.?|the|professor|mr\.?|mrs\.?|ms\.?|sir|lady|lord|captain|chef|miss)$/i;
export const needles = (full) => [...new Set(full.split("/")[0].trim().split(/\s+/).filter((p) => p.length > 2 && !TITLES.test(p)))];
export const count = (text, needle) => (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
// Whole-word variant (unicode letters): "Boo" in "Honey Boo Boo" must not match "book". The corpus script keeps the
// substring count so the ADR-0158 numbers stay reproducible; the render driver uses this one.
export const countWord = (text, needle) =>
  (text.match(new RegExp(`(?<![\\p{L}])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "giu")) || []).length;
