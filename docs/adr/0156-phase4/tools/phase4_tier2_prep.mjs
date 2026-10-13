// ADR-0156 Phase 4 Tier 2 prep (free): per-character redacted context (Phase 1 + Phase 4 field) and redacted chat (Phase 1b, buildCharacterChatSafe) for the
// Silver Nightingale, using the Part 2 of a saved Tier 1 run in place of the stored Part 2. usage: node ... phase4_tier2_prep.mjs <run file> <name1,name2,...>
import fs from "node:fs";
import { parseMasterContext, buildCharacterContext, sameCharacter } from "../../../../supabase/functions/_shared/characterContext.ts";
import { buildCharacterChatSafe, otherCharactersHiddenText } from "../../../../supabase/functions/_shared/characterChat.ts";
const root = new URL("../../../../temp-files/charctx/", import.meta.url);
const run = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); const picks = process.argv[3].split(",");
const pk = JSON.parse(fs.readFileSync(new URL("packages.json", root), "utf8")).find((p) => p.id === run.package);
const chars = JSON.parse(fs.readFileSync(new URL("characters.json", root), "utf8")).filter((c) => c.package_id === pk.id);
const chat = fs.readFileSync(new URL(`chats/${pk.id}.txt`, root), "utf8");
// Part 1 = first object of the stored master_context; Part 2 = the saved run
const stored = pk.master_context; let depth = 0, ins = false, esc = false, start = -1, end = -1;
for (let i = 0; i < stored.length; i++) { const ch = stored[i]; if (ins) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') ins = false; continue; }
  if (ch === '"') ins = true; else if (ch === "{") { if (depth === 0 && start < 0) start = i; depth++; } else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } } }
const part1 = stored.slice(start, end);
const raw = run.raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""); let part2; try { part2 = JSON.parse(raw); } catch { part2 = JSON.parse(raw.match(/\{[\s\S]*\}/)[0].replace(/,\s*([}\]])/g, "$1")); }
const mcText = part1 + "\n" + JSON.stringify(part2);
const mc1 = parseMasterContext(part1);
const ctx = { roster: chars.map((c) => c.character_name), culprits: [mc1.murdererSelection.character, mc1.accompliceSelection.character] };
const out = [];
const kmp = part2.timelineFramework.keyMomentPositions;
for (const c of chars) {
  if (!picks.some((p) => c.character_name.startsWith(p))) continue;
  const r = buildCharacterContext(mcText, c.character_name, c.character_role);
  const hidden = otherCharactersHiddenText(mcText, c.character_name);
  const ch = buildCharacterChatSafe(chat, c.character_name, c.character_role, ctx, hidden);
  const sees = kmp.filter((e) => (e.canBeSeenBy ?? []).some((n) => sameCharacter(n, c.character_name))).map((e) => e.character);
  out.push({ name: c.character_name, role: c.character_role, description: c.description, context: r.context, chat: ch.text, chatFlags: ch.flags, survivors: ch.survivors, sees });
  console.log(c.character_name, c.character_role, "ctx", r.context.length, "chat", chat.length, "->", ch.text.length, "survivors", ch.survivors, ch.flags.join(","), "| sees:", sees.join(", "));
}
fs.writeFileSync(new URL("phase4_tier2_in.json", root), JSON.stringify(out));
