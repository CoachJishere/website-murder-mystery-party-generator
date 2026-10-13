// Run: node --experimental-strip-types supabase/functions/_shared/characterChat.test.mjs   (npm run test:charchat)
// ADR-0156 Phase 1b. Part A: a synthetic chat committed here. Part B: the real detective chats; SKIPS (prints "SKIP", exit 0) when
// temp-files/charctx/ is absent (raw customer chats are never committed). Fixtures: temp-files/charctx/{packages,characters}.json as in
// characterContext.test.mjs plus temp-files/charctx/chats/<package id>.txt = mystery_packages.user_conversation.
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseMasterContext, sameCharacter } from "./characterContext.ts";
import { buildCharacterChat, buildCharacterChatSafe, hiddenSurvivors, otherCharactersHiddenText } from "./characterChat.ts";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok  ", name); };

// ----------------------------------------------------------------------------------------------------------------------------------
// Part A: synthetic
// ----------------------------------------------------------------------------------------------------------------------------------
const roster = ["Vivian Calloway", "Harry Dunmore", "Theo/Thea Baptiste", "Dr. Felicity Hartmann", "Marcus Finch", "Josephine 'Josie' Beaumont", "Simone Delacroix"];
const culprits = ["Simone Delacroix"];
const CHAT = [
  "User: Please make a murder on a snowbound train for seven players.",
  "",
  "AI:",
  "# MURDER ON THE SILVER TRAIN",
  "## Premise",
  "A luxury train stops in the snow and a guest is found dead.",
  "## Character List",
  "1. **Vivian Calloway** (played by Isabel) – The heir at the center of the engagement, desperate to keep an old scandal buried.",
  "2. **Harry Dunmore** (played by Cole) – A journalist posing as a society guest, chasing the real story behind the victim.",
  "3. **Theo/Thea Baptiste** – Business partner who quietly funded the empire and knows where the financial bodies are buried.",
  "- Dr. Felicity Hartmann: the train physician, sworn to secrecy about a diagnosis the victim used as leverage.",
  "7. Simone Delacroix (played by Emily) - The head steward, forced into a favor by the victim.",
  "### Marcus Finch",
  "A retired detective who is really an inquiry agent hired to recover a ledger.",
  "He watches everyone.",
  "### Josephine 'Josie' Beaumont",
  "The life of the party. Took money from a charity years ago.",
  "## THE KILLER — SIMONE DELACROIX",
  "Simone poisoned the brandy during the toasts.",
  "## Murder Method",
  "Poison in a brandy glass. Simone Delacroix did it and then locked the door.",
  "The toasts are held in the dining car.",
].join("\n");
const ctx = { roster, culprits };

t("a culprit or accomplice gets the chat unchanged", () => {
  for (const role of ["murderer", "accomplice"]) { const r = buildCharacterChat(CHAT, "Simone Delacroix", role, ctx); assert.equal(r.text, CHAT); }
});
t("an innocent keeps its own blurb word for word", () => {
  const r = buildCharacterChat(CHAT, "Vivian Calloway", "suspect", ctx);
  assert.ok(r.text.includes("1. **Vivian Calloway** (played by Isabel) – The heir at the center of the engagement, desperate to keep an old scandal buried."));
});
t("other characters' blurbs are withheld in every format, name and 'played by' stay", () => {
  const r = buildCharacterChat(CHAT, "Vivian Calloway", "suspect", ctx);
  for (const secret of ["journalist", "posing", "financial bodies", "diagnosis", "inquiry agent", "ledger", "charity", "forced into a favor"]) assert.ok(!r.text.includes(secret), `still contains "${secret}"`);
  assert.ok(r.text.includes("Harry Dunmore"), "name must stay");
  assert.ok(r.text.includes("played by Cole"), "played-by must stay");
  assert.ok(r.text.includes("Theo/Thea Baptiste"));
  assert.ok(r.redactedBlurbs >= 4 && r.withheldBlocks >= 2, `blurbs ${r.redactedBlurbs} blocks ${r.withheldBlocks}`);
});
t("the premise and the public method survive", () => {
  const r = buildCharacterChat(CHAT, "Vivian Calloway", "suspect", ctx);
  assert.ok(r.text.includes("A luxury train stops in the snow"));
  assert.ok(r.text.includes("## Murder Method") && r.text.includes("Poison in a brandy glass."));
  assert.ok(r.text.includes("The toasts are held in the dining car."));
});
t("a killer section is dropped and a sentence naming the culprit next to a guilt word is removed", () => {
  const r = buildCharacterChat(CHAT, "Vivian Calloway", "suspect", ctx);
  assert.ok(!r.text.includes("THE KILLER") && !r.text.includes("poisoned the brandy"));
  assert.ok(!r.text.includes("Simone Delacroix did it"));
  assert.ok(r.droppedSections >= 1 && r.droppedSentences >= 1);
});
t("a character viewing as itself keeps its heading block", () => {
  const r = buildCharacterChat(CHAT, "Marcus Finch", "suspect", ctx);
  assert.ok(r.text.includes("really an inquiry agent"), "own block body kept");
  assert.ok(!r.text.includes("journalist"), "other blurb still withheld");
});
t("fail open: a chat with no recognisable list is not blanked, and says so", () => {
  const plain = "User: make a train mystery\nAI: A luxury train stops in the snow. Everyone dines together and a guest dies.";
  const r = buildCharacterChat(plain, "Vivian Calloway", "suspect", ctx);
  assert.equal(r.text, plain);
  assert.ok(r.flags.includes("character-list-not-recognised"));
});
t("a viewer missing from the roster is flagged", () => {
  const r = buildCharacterChat(CHAT, "Somebody Else", "suspect", ctx);
  assert.ok(r.flags.includes("self-not-in-roster"));
});
t("strict mode withholds every line that names another character", () => {
  const prose = CHAT + "\nHarry Dunmore and Marcus Finch argued at the bar before dinner.\nVivian Calloway was seated at the head table.";
  const r = buildCharacterChat(prose, "Vivian Calloway", "suspect", ctx, { strict: true });
  assert.ok(!r.text.includes("argued at the bar"));
  assert.ok(r.text.includes("Vivian Calloway was seated at the head table."));
});
t("the safe wrapper retries strictly when the design's hidden text still shows", () => {
  const prose = CHAT + "\nIt turns out that Harry Dunmore hides that he writes for a gossip paper and is not what he appears at all.";
  const hidden = ["Harry Dunmore hides that he writes for a gossip paper and is not what he appears at all"];
  const normal = buildCharacterChat(prose, "Vivian Calloway", "suspect", ctx);
  assert.ok(hiddenSurvivors(normal.text, hidden) > 0, "setup: the plain pass must leave it");
  const safe = buildCharacterChatSafe(prose, "Vivian Calloway", "suspect", ctx, hidden);
  assert.equal(safe.survivors, 0);
  assert.ok(safe.flags.some((f) => f.startsWith("strict")));
});

// ----------------------------------------------------------------------------------------------------------------------------------
// Part B: real chats (skipped without the fixtures)
// ----------------------------------------------------------------------------------------------------------------------------------
if (!fs.existsSync("temp-files/charctx/packages.json") || !fs.existsSync("temp-files/charctx/chats")) {
  console.log(`SKIP real-data checks (temp-files/charctx/ not present). ${passed} synthetic tests passed.`);
  process.exit(0);
}
const P = JSON.parse(fs.readFileSync("temp-files/charctx/packages.json", "utf8"));
const CH = JSON.parse(fs.readFileSync("temp-files/charctx/characters.json", "utf8"));
const GUILT = /(murder(er|ed)?|kill(er|ed)?|poison(ed)?|culprit|guilty|did it|accomplice|framed)/i;
let pkgs = 0, inn = 0, withheld = 0, strictRuns = 0, survivorsTotal = 0; const ratios = [];
const perPkgSurvivors = {};
for (const p of P) {
  const file = `temp-files/charctx/chats/${p.id}.txt`;
  if (!fs.existsSync(file)) continue;
  let mc; try { mc = parseMasterContext(p.master_context); } catch { continue; }
  if (!Array.isArray(mc.victimProfile?.wrongedEachCharacter)) continue; // intrigue schema: out of scope as in Phase 1
  const conv = fs.readFileSync(file, "utf8");
  const names = CH.filter((c) => c.package_id === p.id).map((c) => c.character_name);
  const cul = [mc.murdererSelection?.character, mc.accompliceSelection?.character].filter(Boolean);
  const ctxP = { roster: names, culprits: cul };
  pkgs++; perPkgSurvivors[p.title.slice(0, 30)] = 0;
  for (const c of CH.filter((c) => c.package_id === p.id && !["murderer", "accomplice"].includes(c.character_role))) {
    inn++;
    const r = buildCharacterChatSafe(conv, c.character_name, c.character_role, ctxP, otherCharactersHiddenText(p.master_context, c.character_name));
    assert.ok(!r.flags.includes("character-list-not-recognised"), `${p.title}: list not recognised`);
    assert.ok(r.text.length < conv.length, `${p.title}/${c.character_name}: not smaller`);
    withheld += r.redactedBlurbs; if (r.flags.some((f) => f.startsWith("strict"))) strictRuns++;
    ratios.push(r.text.length / conv.length);
    survivorsTotal += r.survivors; perPkgSurvivors[p.title.slice(0, 30)] += r.survivors;
    // no sentence naming the murderer/accomplice next to a guilt word survives
    for (const line of r.text.split("\n")) for (const sent of line.split(/(?<=[.!?…])\s+/)) {
      for (const n of cul) { const alias = n.split(/[\s/]+/).filter((w) => w.length >= 4).map((w) => w.replace(/['"]/g, ""));
        if (alias.some((a) => sent.toLowerCase().includes(a.toLowerCase())) && GUILT.test(sent)) assert.fail(`${p.title}/${c.character_name}: culprit sentence survives: ${sent.slice(0, 120)}`);
      }
    }
    // the viewer's own blurb line is kept verbatim when the chat has one
    const first = c.character_name.split(/[\s/]+/)[0].replace(/['"]/g, "");
    const ownLine = conv.split("\n").find((l) => /^\s*(?:[-*•]|\d+[.)])?\s*(?:\*\*)?/.test(l) && l.replace(/[*_]/g, "").trim().startsWith(first) && l.length > c.character_name.length + 30);
    if (ownLine && !r.flags.some((f) => f.startsWith("strict"))) assert.ok(r.text.includes(ownLine.trim().slice(0, 60)), `${p.title}/${c.character_name}: own blurb lost`);
  }
}
t(`real chats: ${pkgs} packages, ${inn} innocents, no list unrecognised, no culprit sentence left, own blurb kept`, () => assert.ok(pkgs >= 10 && inn >= 100));
ratios.sort((a, b) => a - b);
console.log(`     median size ratio ${ratios[Math.floor(ratios.length / 2)].toFixed(2)} (min ${ratios[0].toFixed(2)}), blurbs withheld ${withheld}, strict reruns ${strictRuns}, hidden-text pairs still present ${survivorsTotal}`);
t("hidden text of other characters is reduced to a small remainder", () => assert.ok(survivorsTotal <= 70, `survivors ${survivorsTotal}`));
t("packages with a plain character list end with no hidden text at all", () => {
  for (const k of Object.keys(perPkgSurvivors)) if (!/Thanksgiving|Storm Hit/.test(k)) assert.equal(perPkgSurvivors[k], 0, `${k}: ${perPkgSurvivors[k]}`);
});
// Silver Nightingale regression: Bartholomew must not be told Harry is a journalist; Harry keeps his own blurb
const silver = P.find((p) => p.id === "178de25c-d7b8-4e02-9210-4e63298614e9");
if (silver && fs.existsSync(`temp-files/charctx/chats/${silver.id}.txt`)) {
  t("Silver Nightingale: the journalist secret reaches only Harry", () => {
    const conv = fs.readFileSync(`temp-files/charctx/chats/${silver.id}.txt`, "utf8");
    const names = CH.filter((c) => c.package_id === silver.id).map((c) => c.character_name);
    const mc = parseMasterContext(silver.master_context);
    const cul = [mc.murdererSelection.character, mc.accompliceSelection.character];
    const b = buildCharacterChat(conv, "Bartholomew Calloway", "suspect", { roster: names, culprits: cul });
    const h = buildCharacterChat(conv, "Harry Dunmore", "suspect", { roster: names, culprits: cul });
    assert.ok(!/journalist/i.test(b.text), "Bartholomew still sees journalist");
    assert.ok(/journalist/i.test(h.text), "Harry lost his own blurb");
  });
}
console.log(`${passed} tests passed`);
