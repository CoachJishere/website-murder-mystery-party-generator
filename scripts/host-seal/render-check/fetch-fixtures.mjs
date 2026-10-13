// Writes real packages to <OUT>/fixtures.json for the render check (customer text: stays in the OS temp dir).
// Pick packages by id prefix: FIXTURES='en_detective=20ab2a21,old_detective=fb085089' (name=idPrefix,...).
// Names that matter to drive.mjs: en_detective, sv_detective, old_detective (no reveal heading), pt_detective, en_slip.
import fs from "node:fs";
import { makeGet, outDir } from "../lib.mjs";
const get = makeGet();
const picks = Object.fromEntries((process.env.FIXTURES || "en_detective=20ab2a21,sv_detective=33540b65,old_detective=fb085089,pt_detective=641044a5").split(",").map((p) => p.split("=")));
const sel = "id,conversation_id,created_at,title,game_overview,detective_script,evidence_cards,evidence_card_images,materials,hosting_tips,mystery_style,mystery_characters(character_name,character_role)";
const pk = await get(`mystery_packages?select=${sel}&order=created_at.desc&limit=400`);
const convs = await get("conversations?select=id,mystery_type,has_accomplice,player_count,is_paid,is_test&is_paid=eq.true&limit=1000");
const cm = new Map(convs.filter((c) => !c.is_test).map((c) => [c.id, c]));
const want = { ...Object.fromEntries(Object.entries(picks).map(([n, id]) => [n, (r) => r.id.startsWith(id)])),
  en_slip: (r) => r.mystery_style === "character" && /^[\x00-\x7f]+$/.test((r.detective_script || "").slice(0, 400)) };
const out = {};
for (const [name, f] of Object.entries(want)) {
  const r = pk.find((p) => cm.has(p.conversation_id) && f(p));
  if (!r) { console.log("missing", name); continue; }
  const c = cm.get(r.conversation_id);
  out[name] = { ...r, mystery_type: c.mystery_type, has_accomplice: c.has_accomplice, player_count: c.player_count,
    murderers: r.mystery_characters.filter((m) => ["murderer", "accomplice"].includes(m.character_role)).map((m) => m.character_name) };
  delete out[name].mystery_characters;
  console.log(name, r.id.slice(0, 8), r.mystery_style);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/fixtures.json`, JSON.stringify(out));
console.log("wrote", `${outDir}/fixtures.json`);
