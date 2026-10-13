// Run: node --experimental-strip-types supabase/functions/_shared/characterContext.test.mjs   (npm run test:charcontext)
// ADR-0156 Phase 1. Part A runs on a small synthetic design committed here. Part B runs on real detective packages and SKIPS (prints
// "SKIP", exit 0) when temp-files/charctx/ is absent: raw customer master contexts and characters are never committed.
// Fixtures for Part B (read-only, service role key from .env, never printed):
//   temp-files/charctx/packages.json    GET /rest/v1/mystery_packages?select=id,title,conversation_id,created_at,master_context&mystery_style=eq.detective&created_at=gte.2026-09-20&order=created_at.desc&limit=14
//   temp-files/charctx/characters.json  GET /rest/v1/mystery_characters?select=*&package_id=in.(<ids above>)&limit=1000
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCharacterContext, CharacterContextError, parseMasterContext, sameCharacter } from "./characterContext.ts";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok  ", name); };
const ta = process.env.CHARCTX_REAL_ONLY ? () => {} : t; // CHARCTX_REAL_ONLY=1 skips the synthetic tests (used to mutation-test the real-data checks)

// ---------------------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------------------
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").trim();
const grams = (s, n = 8) => {
  const w = norm(s).split(" ").filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
};
const leaves = (v, acc = []) => {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, acc));
  return acc;
};
const overlap = (needles, hay) => { for (const g of needles) if (hay.has(g)) return g; return null; };

// ---------------------------------------------------------------------------------------------------------------------------------
// Part A: synthetic design
// ---------------------------------------------------------------------------------------------------------------------------------
const part1 = {
  mysteryStyle: "detective",
  murdererSelection: { character: "Dr. Mara Quill", reasoning: "Mara alone had the keys to the cellar and the nerve to use them during the toast.", misdirectionTargets: ["Ivy Chen"] },
  accompliceSelection: { character: "Tobias Reed", relationshipToMurderer: "Old friends who share a hidden debt to the victim.", theirMotiveForHelping: "Tobias owes Mara a debt he can never repay." },
  relationshipMatrix: "| | Mara | Tobias | Ivy | Leo | Nora |\n|---|---|---|---|---|---|\n| Mara | - | Friendly | Neutral | Hostile | Neutral |",
  victimProfile: {
    name: "Victor Hale", role: "The host of the reunion dinner", powerSource: "Victor held old debts over half the room.", personality: "Jovial in public and ruthless in private.",
    activitiesAndSchemes: "Victor secretly forced Mara to forge the cellar inventory for three years.",
    wrongedEachCharacter: [
      { character: "Dr. Mara Quill", howVictimWrongedThem: "Victor forced Mara to forge the cellar inventory for three years running.", motiveStrength: "Strong", isMurderer: "true", isRedHerring: "false" },
      { character: "Tobias Reed", howVictimWrongedThem: "Victor called in Tobias's loan the week before the dinner.", motiveStrength: "Medium", isMurderer: "false", isRedHerring: "false" },
      { character: "Ivy Chen", howVictimWrongedThem: "Victor plagiarised Ivy's recipe book and published it under his own name.", motiveStrength: "Strong", isMurderer: "false", isRedHerring: "true" },
      { character: "Leo Park/Lena Park", howVictimWrongedThem: "Victor fired Leo from the vineyard without notice or pay.", motiveStrength: "Medium", isMurderer: "false", isRedHerring: "false" },
      { character: "Nora Bell ('The Baker')", howVictimWrongedThem: "Victor refused to pay Nora for the wedding cake he ordered.", motiveStrength: "Weak", isMurderer: "false", isRedHerring: "false" },
    ],
  },
  murderMethod: {
    weapon: "Aconite in the claret. It was carried to the table by Mara under the pretext of a special vintage. Everyone assumed it was ordinary service.",
    execution: "Mara added the aconite to Victor's glass in the cellar at nine, before the toast began.",
    evidenceLeftBehind: "A stained cork with Mara's thumbprint remains in the cellar bin.",
  },
  conversationDetailsExtraction: {
    victimRelatedDetails: { schemesAndOperations: "Victor ran a quiet web of debts and favours." },
    characterSpecificDetails: [
      { character: "Dr. Mara Quill", backgroundDetails: "The family physician and wine cellar keyholder.", relationships: "Old friend of Tobias.", threatsOrPressures: "Forced to forge inventories by Victor.", pastEvents: "", specificSkills: "", financialDetails: "", otherDetails: "" },
      { character: "Tobias Reed", backgroundDetails: "Victor's accountant with a hidden gambling loan.", relationships: "Owes Mara a favour.", threatsOrPressures: "Loan called in.", pastEvents: "", specificSkills: "", financialDetails: "", otherDetails: "" },
      { character: "Ivy Chen", backgroundDetails: "A celebrated pastry chef with a famous grandmother recipe book.", relationships: "Rival of Victor.", threatsOrPressures: "Her recipe book was stolen.", pastEvents: "", specificSkills: "", financialDetails: "", otherDetails: "" },
      { character: "Leo Park/Lena Park", backgroundDetails: "The vineyard manager dismissed three weeks ago.", relationships: "Dislikes Mara.", threatsOrPressures: "Unpaid wages.", pastEvents: "", specificSkills: "", financialDetails: "", otherDetails: "" },
      { character: "Nora Bell ('The Baker')", backgroundDetails: "The local baker known for wedding cakes.", relationships: "Friendly with Ivy.", threatsOrPressures: "An unpaid invoice.", pastEvents: "", specificSkills: "", financialDetails: "", otherDetails: "" },
    ],
  },
};
const part2 = {
  evidenceProgression: {
    round2: { item: "A cork stained dark purple lies near the cellar door.", reveals: "The cork came from the cellar bin Mara controls.", implicates: ["Dr. Mara Quill"], howAnyCharacterCouldExplain: "Anyone could have dropped it." },
    round3: { item: "A torn invoice from the vineyard office.", reveals: "The invoice proves Mara signed for the aconite order herself.", implicates: ["Dr. Mara Quill"] },
    round4: { item: "The cellar key log on a clipboard.", reveals: "The log shows only Mara entered the cellar before the toast.", murdererFlaw: "Mara claims she never entered the cellar, but the log shows her signature at nine.", whyOthersEliminated: "Ivy was in the kitchen all evening." },
    solutionLogic: "The log, cork and invoice all point to Mara and nobody else.",
  },
  timelineFramework: {
    gatheringStarted: "Guests arrived from seven in the evening.", specificEvents: "Dinner began at eight. Mara stepped out briefly at nine. The toast was raised at nine fifteen.",
    victimLastSeen: "Victor was last seen raising his glass at the head table.", bodyDiscovered: "Found slumped in his chair after the toast by Nora.",
    murderWindowStart: "Just before nine, when the aconite was placed in the claret.", murderWindowEnd: "At nine fifteen when Victor drank.",
    keyEventsBeforeMurder: "Mara took the claret from the cellar with Tobias's help.",
    murdererClaimedLocation: "Mara says she was in the kitchen helping Ivy with the plates.",
    murdererAlibiGap: "The kitchen log shows Ivy worked alone, so nothing places Mara there at nine.",
    otherSuspectsAlibis: "Ivy: in the kitchen all evening. Leo: in the garden smoking, seen by Nora.",
    opportunityStatement: "The murderer used the minute when every eye was on the toast.",
    keyMomentPositions: [
      { character: "Dr. Mara Quill", truePosition: "In the cellar, adding aconite to the claret, with the door shut.", besideOrNear: [], canBeSeenBy: [] },
      { character: "Tobias Reed", truePosition: "Standing guard at the top of the cellar stairs.", besideOrNear: [], canBeSeenBy: ["Nora Bell"] },
      { character: "Ivy Chen", truePosition: "In the kitchen cutting bread, alone and in view of Nora.", besideOrNear: ["Nora Bell"], canBeSeenBy: ["Nora Bell", "Dr. Mara Quill"] },
      { character: "Leo Park/Lena Park", truePosition: "In the garden smoking by the roses.", besideOrNear: [], canBeSeenBy: ["Nora Bell"] },
      { character: "Nora Bell ('The Baker')", truePosition: "At the kitchen door watching Ivy cut the bread, and later glimpsed Mara hurrying out of the cellar passage.", besideOrNear: ["Ivy Chen"], canBeSeenBy: ["Ivy Chen", "Leo Park/Lena Park", "Dr. Mara Quill"] },
    ],
  },
  motiveDistribution: [{ character: "Dr. Mara Quill", specificMotive: "Victor forced her to forge the inventory.", role: "murderer", eliminationReason: "None" }],
  accompliceDetails: { character: "Tobias Reed", roleBeforeMurder: "Tobias carried the claret from the cellar to the sideboard.", scriptPurpose: { round2: "Deflect attention from Mara by pointing at Ivy's grudge." } },
  deceptionGuidelines: { purpose: "Guide Mara's active deception throughout the game and keep her story consistent.", round4Guidance: { theAlibiLie: "That she spent the whole toast helping Ivy in the kitchen with the plates." } },
  hostBriefing: { solution: { murderer: "Dr. Mara Quill", accomplice: "Tobias Reed", methodSummary: "Aconite was added to the claret in the cellar." } },
  futureKeyFromTheParent: { note: "A new Parent field nobody has reviewed yet, with a secret in it." },
};
const MC = JSON.stringify(part1) + "\n" + JSON.stringify(part2);

ta("parseMasterContext reads two concatenated objects and braces inside strings", () => {
  const m = parseMasterContext('{"a":"x } y { z","b":1}\n\n{"c":{"d":"}"}}');
  assert.deepEqual(m, { a: "x } y { z", b: 1, c: { d: "}" } });
});

ta("murderer and accomplice get the stored text byte for byte", () => {
  for (const [n, r] of [["Dr. Mara Quill", "murderer"], ["Tobias Reed", "accomplice"]]) {
    const out = buildCharacterContext(MC, n, r);
    assert.equal(out.context, MC);
    assert.deepEqual(out.dropped, []);
  }
});

ta("an innocent gets valid JSON with none of the solution", () => {
  const out = buildCharacterContext(MC, "Ivy Chen", "redHerring");
  const j = JSON.parse(out.context);
  for (const banned of ["hostBriefing", "deceptionGuidelines", "murdererSelection", "accompliceDetails", "motiveDistribution", "isMurderer", "isRedHerring",
    "reasoning", "execution", "evidenceLeftBehind", "murdererFlaw", "solutionLogic", "murdererAlibiGap", "otherSuspectsAlibis", "opportunityStatement", "activitiesAndSchemes",
    "aconite order herself", "forge the cellar inventory", "gambling loan", "Loan called in", "Tobias owes Mara", "in the cellar, adding aconite", "murderWindowStart"]) {
    assert.ok(!out.context.toLowerCase().includes(banned.toLowerCase()), `leaked: ${banned}`);
  }
  assert.ok(out.context.length < MC.length);
  assert.equal(j.contextFor.role, "redHerring");
});

ta("an innocent keeps its own entries and nobody else's", () => {
  const out = buildCharacterContext(MC, "Ivy Chen", "redHerring");
  const j = JSON.parse(out.context);
  assert.equal(j.victimProfile.wrongedEachCharacter.length, 1);
  assert.match(j.victimProfile.wrongedEachCharacter[0].howVictimWrongedThem, /plagiarised Ivy/);
  assert.deepEqual(Object.keys(j.victimProfile.wrongedEachCharacter[0]).sort(), ["character", "howVictimWrongedThem", "motiveStrength"]);
  assert.equal(j.conversationDetailsExtraction.characterSpecificDetails.length, 1);
  assert.match(j.conversationDetailsExtraction.characterSpecificDetails[0].backgroundDetails, /pastry chef/);
  assert.match(j.relationshipMatrix, /Friendly/);
  assert.match(j.murderMethod.weapon, /Aconite in the claret/);
  assert.ok(j.evidenceProgression.round3.item.includes("torn invoice") && !("reveals" in j.evidenceProgression.round3));
});

ta("dual-name and nickname characters still find their own entries", () => {
  for (const n of ["Leo Park/Lena Park", "Leo Park", "Lena Park", "Nora Bell ('The Baker')", "Nora Bell"]) {
    const out = buildCharacterContext(MC, n, "suspect");
    assert.ok(!out.dropped.some((d) => d.includes("NOT FOUND")), `${n}: ${out.dropped.filter((d) => d.includes("NOT FOUND"))}`);
  }
  assert.ok(sameCharacter("Elara Voss, Royal Apothecary", "Elara Voss"));
  assert.ok(sameCharacter("Dr. Absalon Krag", "Absalon Krag"));
  assert.ok(sameCharacter("Josephine 'Josie' Beaumont", "Josie Beaumont"));
  assert.ok(sameCharacter("Madame Morgana ('La Dama Belladona')", "Madame Morgana"));
  assert.ok(!sameCharacter("Bartholomew Calloway", "Vivian Calloway"));
  assert.ok(!sameCharacter("Camper Daisy Higgins", "Camp Director Hazel Higgins"));
});

ta("a name that is not in the design is reported, not guessed", () => {
  const out = buildCharacterContext(MC, "Somebody Else", "suspect");
  assert.ok(out.dropped.some((d) => d.includes("wrongedEachCharacter[self] (NOT FOUND)")));
  assert.ok(out.dropped.some((d) => d.includes("characterSpecificDetails[self] (NOT FOUND)")));
  assert.ok(!out.context.includes("plagiarised"));
});

ta("unknown top-level keys are dropped and reported", () => {
  const out = buildCharacterContext(MC, "Ivy Chen", "suspect");
  assert.ok(!out.context.includes("futureKeyFromTheParent") && !out.context.includes("nobody has reviewed"));
  assert.ok(out.dropped.includes("futureKeyFromTheParent (unknown key)"));
  const nested = JSON.stringify({ ...part1, victimProfile: { ...part1.victimProfile, newSecretField: "The murderer is Mara and this is a long new sentence nobody reviewed." } }) + JSON.stringify(part2);
  const o2 = buildCharacterContext(nested, "Ivy Chen", "suspect");
  assert.ok(!o2.context.includes("newSecretField") && o2.dropped.includes("victimProfile.newSecretField"));
});

ta("a sentence that names the murderer or accomplice is removed from public fields", () => {
  const out = buildCharacterContext(MC, "Ivy Chen", "suspect");
  const j = JSON.parse(out.context);
  assert.ok(!j.murderMethod.weapon.includes("Mara"), j.murderMethod.weapon);
  assert.match(j.murderMethod.weapon, /Aconite in the claret/);
  assert.match(j.murderMethod.weapon, /ordinary service/);
  assert.ok(!j.timelineFramework.specificEvents.includes("Mara"));
  assert.match(j.timelineFramework.specificEvents, /Dinner began at eight/);
  assert.ok(out.dropped.some((d) => d.startsWith("murderMethod.weapon (1 sentence")));
});

ta("key moment positions: own entry plus entries that list the viewer in canBeSeenBy", () => {
  const nora = JSON.parse(buildCharacterContext(MC, "Nora Bell ('The Baker')", "suspect").context).timelineFramework.keyMomentPositions;
  const names = nora.map((e) => e.character).sort();
  // Nora sees Ivy, Leo and herself. Tobias lists Nora but is the accomplice with no stated position, so he is dropped; Mara lists nobody.
  assert.deepEqual(names, ["Ivy Chen", "Leo Park/Lena Park", "Nora Bell ('The Baker')"]);
  assert.match(nora.find((e) => e.character.startsWith("Nora")).position, /glimpsed Mara hurrying out of the cellar passage/);
  const ivy = JSON.parse(buildCharacterContext(MC, "Ivy Chen", "suspect").context).timelineFramework.keyMomentPositions;
  assert.deepEqual(ivy.map((e) => e.character).sort(), ["Ivy Chen", "Nora Bell ('The Baker')"]);
  // Nora's only sentence names the murderer, so Ivy gets no text for it but still learns Nora stood beside her (an alibi witness).
  const noraForIvy = ivy.find((e) => e.character.startsWith("Nora"));
  assert.equal(noraForIvy.position, null);
  assert.deepEqual(noraForIvy.besideOrNear, ["Ivy Chen"]);
});

ta("a visible murderer entry carries only the claimed position, in the same shape as the others", () => {
  // Make Mara visible to Leo.
  const p2 = structuredClone(part2);
  p2.timelineFramework.keyMomentPositions[0].canBeSeenBy = ["Leo Park/Lena Park"];
  const out = buildCharacterContext(JSON.stringify(part1) + JSON.stringify(p2), "Leo Park/Lena Park", "suspect");
  const e = JSON.parse(out.context).timelineFramework.keyMomentPositions.find((x) => x.character === "Dr. Mara Quill");
  assert.deepEqual(Object.keys(e).sort(), ["besideOrNear", "canBeSeenBy", "character", "position"]);
  assert.match(e.position, /says she was in the kitchen/);
  assert.ok(!out.context.includes("adding aconite") && !out.context.includes("door shut"));
});

ta("option visibleMurderer: omit leaves the murderer out of a witness's map entirely", () => {
  const p2 = structuredClone(part2);
  p2.timelineFramework.keyMomentPositions[0].canBeSeenBy = ["Leo Park/Lena Park"];
  const out = buildCharacterContext(JSON.stringify(part1) + JSON.stringify(p2), "Leo Park/Lena Park", "suspect", { visibleMurderer: "omit" });
  const names = JSON.parse(out.context).timelineFramework.keyMomentPositions.map((e) => e.character);
  assert.ok(!names.includes("Dr. Mara Quill") && !out.context.includes("says she was in the kitchen"));
  assert.ok(out.dropped.some((d) => d.includes("omitted by option")));
});

ta("a visible accomplice entry is dropped (no claimed position exists) and the trace says so", () => {
  const p2 = structuredClone(part2);
  p2.timelineFramework.keyMomentPositions[1].canBeSeenBy = ["Ivy Chen"];
  const out = buildCharacterContext(JSON.stringify(part1) + JSON.stringify(p2), "Ivy Chen", "suspect");
  assert.ok(!out.context.includes("guard at the top of the cellar stairs"));
  assert.ok(out.dropped.some((d) => d.includes("visible accomplice")));
});

ta("unknown or empty role is treated as an innocent (fail closed)", () => {
  for (const r of ["", "unknown", "Suspect", "guilty", undefined]) {
    const out = buildCharacterContext(MC, "Ivy Chen", r);
    assert.ok(!out.context.includes("hostBriefing") && out.context.length < MC.length, `role ${r}`);
  }
  // Case and spacing of the two full-context roles are forgiven.
  assert.equal(buildCharacterContext(MC, "Dr. Mara Quill", " Murderer ").context, MC);
});

ta("malformed input throws for an innocent and never returns the full text", () => {
  for (const bad of ["", "   ", "not json", "{", '{"a":1} trailing', '{"a":"unterminated}', "[1,2]", "{}"]) {
    assert.throws(() => buildCharacterContext(bad, "Ivy Chen", "suspect"), CharacterContextError, JSON.stringify(bad));
  }
});

ta("a single-object design (no second part) works", () => {
  const out = buildCharacterContext(JSON.stringify({ ...part1, ...part2 }), "Ivy Chen", "suspect");
  assert.equal(JSON.parse(out.context).contextFor.character, "Ivy Chen");
});

ta("a different schema (intrigue) is refused loudly rather than guessed", () => {
  const intrigue = JSON.stringify({ mysteryStyle: "detective", mysteryType: "intrigue", relationshipMatrix: [{ character1: "A", character2: "B" }], victimProfile: { name: "X" }, conversationDetailsExtraction: {} });
  assert.throws(() => buildCharacterContext(intrigue, "A", "suspect"), /unsupported schema/);
  // ...but the culprit still gets the text, since nothing is parsed for them.
  assert.equal(buildCharacterContext(intrigue, "A", "murderer").context, intrigue);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Part B: real packages (skipped when the fixtures are absent)
// ---------------------------------------------------------------------------------------------------------------------------------
const DIR = new URL("../../../temp-files/charctx/", import.meta.url);
if (!fs.existsSync(new URL("packages.json", DIR)) || !fs.existsSync(new URL("characters.json", DIR))) {
  console.log(`SKIP real-data tests: ${passed} synthetic tests passed; temp-files/charctx/{packages,characters}.json not present`);
  process.exit(0);
}
const PACKAGES = JSON.parse(fs.readFileSync(new URL("packages.json", DIR), "utf8"));
const CHARS = JSON.parse(fs.readFileSync(new URL("characters.json", DIR), "utf8"));

// Characters that exist on the sheets but not in the design: El Ultimo Trago added the victim (Juanpa Comunica) and Consuelo Arriaga to
// the roster after master_context was written (customer roster edit, sweep 2026-10-06). The design has no entry for them by construction.
const NOT_IN_DESIGN = new Set(["dc48c4c3-ace2-421f-92ae-a55d39d43a4b|Juanpa Comunica ('El Corredor')", "dc48c4c3-ace2-421f-92ae-a55d39d43a4b|Consuelo Arriaga ('La Llorona')"]);

const SILVER = "178de25c-d7b8-4e02-9210-4e63298614e9";
const ratios = { suspect: [], redHerring: [] };
let innocentsChecked = 0, packagesChecked = 0, unsupported = 0;
const failures = [];
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

for (const pkg of PACKAGES) {
  const chars = CHARS.filter((c) => c.package_id === pkg.id);
  const label = pkg.title.slice(0, 30);
  const probe = chars.find((c) => c.character_role === "suspect") ?? chars[0];
  let supported = true;
  try { buildCharacterContext(pkg.master_context, probe.character_name, "suspect"); } catch (e) {
    assert.ok(e instanceof CharacterContextError && /unsupported schema/.test(e.message), `${label}: ${e.message}`);
    supported = false; unsupported++;
  }
  if (!supported) {
    t(`${label}: unsupported (intrigue) schema throws for every innocent, culprits still get the text`, () => {
      for (const c of chars) {
        if (c.character_role === "murderer" || c.character_role === "accomplice") assert.equal(buildCharacterContext(pkg.master_context, c.character_name, c.character_role).context, pkg.master_context);
        else assert.throws(() => buildCharacterContext(pkg.master_context, c.character_name, c.character_role), CharacterContextError);
      }
    });
    continue;
  }
  packagesChecked++;
  const mc = parseMasterContext(pkg.master_context);

  // Sentences that must never reach an innocent (a): the culprits' lies, alibi gap, reasoning, accomplice job, and their own secret columns.
  const culpritSources = [
    ...leaves(mc.deceptionGuidelines), ...leaves(mc.murdererSelection), ...leaves(mc.accompliceDetails), ...leaves(mc.accompliceSelection), ...leaves(mc.hostBriefing),
    // murdererClaimedLocation is deliberately NOT here: a visible murderer entry carries it as the stated position (ADR-0156 rule).
    String(mc.timelineFramework?.murdererAlibiGap ?? ""), String(mc.timelineFramework?.opportunityStatement ?? ""),
    ...chars.filter((c) => c.character_role === "murderer" || c.character_role === "accomplice").flatMap((c) => [c.secret, c.secrets].filter(Boolean).map((s) => typeof s === "string" ? s : JSON.stringify(s))),
  ];
  // Text every innocent is meant to receive. A generated secret that happens to quote it is not a leak.
  const publicText = [mc.victimProfile?.name, mc.victimProfile?.role, mc.victimProfile?.personality, mc.victimProfile?.powerSource, mc.murderMethod?.weapon,
    mc.evidenceProgression?.round2?.item, mc.evidenceProgression?.round3?.item, mc.evidenceProgression?.round4?.item,
    ...chars.map((c) => c.character_name), mc.timelineFramework?.gatheringStarted, mc.timelineFramework?.specificEvents, mc.timelineFramework?.victimLastSeen, mc.timelineFramework?.bodyDiscovered,
    mc.relationshipMatrix, ...leaves(mc.timelineFramework?.keyMomentPositions)].filter((x) => typeof x === "string");
  const publicGrams = new Set(publicText.flatMap((s) => [...grams(s)]));
  const withoutPublic = (set) => new Set([...set].filter((g) => !publicGrams.has(g)));
  const culpritGrams = withoutPublic(new Set(culpritSources.flatMap((s) => [...grams(s)])));

  t(`${label}: culprits get the design unchanged`, () => {
    for (const c of chars.filter((x) => x.character_role === "murderer" || x.character_role === "accomplice")) {
      assert.equal(buildCharacterContext(pkg.master_context, c.character_name, c.character_role).context, pkg.master_context);
    }
  });

  t(`${label}: every innocent's context is clean, own, valid JSON and smaller`, () => {
    for (const c of chars.filter((x) => x.character_role !== "murderer" && x.character_role !== "accomplice")) {
      const out = buildCharacterContext(pkg.master_context, c.character_name, c.character_role);
      const who = `${label} / ${c.character_name}`;
      innocentsChecked++;
      const j = JSON.parse(out.context); // (d)
      const outGrams = grams(out.context);
      // (a) none of the culprits' deception / alibi-gap / reasoning / secret sentences
      const hitA = overlap(culpritGrams, outGrams);
      if (hitA) failures.push(`${who}: culprit text reached an innocent: "${hitA}"`);
      // (b) no other character's secret
      for (const o of chars) {
        if (o.id === c.id) continue;
        for (const col of ["secret", "secrets"]) {
          if (!o[col]) continue;
          const hitB = overlap(withoutPublic(grams(typeof o[col] === "string" ? o[col] : JSON.stringify(o[col]))), outGrams);
          if (hitB) failures.push(`${who}: secret of ${o.character_name} (${col}) reached them: "${hitB}"`);
        }
      }
      // (c) own entries present, unless the character is not in the design at all
      if (NOT_IN_DESIGN.has(`${pkg.id}|${c.character_name}`)) {
        assert.ok(out.dropped.some((d) => d.includes("NOT FOUND")), `${who}: expected NOT FOUND`);
      } else {
        assert.ok(!out.dropped.some((d) => d.includes("NOT FOUND")), `${who}: own entry not found`);
        const own = mc.victimProfile.wrongedEachCharacter.find((e) => sameCharacter(e.character, c.character_name));
        assert.ok(own && j.victimProfile.wrongedEachCharacter[0].howVictimWrongedThem === own.howVictimWrongedThem, `${who}: own wronged entry`);
        assert.equal(j.victimProfile.wrongedEachCharacter.length, 1);
        assert.equal(j.conversationDetailsExtraction.characterSpecificDetails.length, 1);
      }
      assert.ok(j.victimProfile.name === mc.victimProfile.name);
      // structural: no solution key survives
      for (const k of ["murdererSelection", "accompliceSelection", "accompliceDetails", "deceptionGuidelines", "hostBriefing", "motiveDistribution", "isMurderer", "murdererAlibiGap", "murdererClaimedLocation", "otherSuspectsAlibis", "opportunityStatement"]) {
        assert.ok(!(k in j) && !out.context.includes(`"${k}"`), `${who}: ${k} present`);
      }
      // (e) smaller
      assert.ok(out.context.length < pkg.master_context.length, `${who}: not smaller`);
      (ratios[c.character_role] ??= []).push(out.context.length / pkg.master_context.length);
    }
  });
}

t("every position entry an innocent receives is its own or lists it in canBeSeenBy (4+ packages carry the map)", () => {
  let withMap = 0;
  for (const pkg of PACKAGES) {
    const mc = parseMasterContext(pkg.master_context);
    const kmp = mc.timelineFramework?.keyMomentPositions;
    if (!Array.isArray(kmp) || !kmp.length) continue;
    withMap++;
    const chars = CHARS.filter((c) => c.package_id === pkg.id && c.character_role !== "murderer" && c.character_role !== "accomplice");
    for (const c of chars) {
      const out = buildCharacterContext(pkg.master_context, c.character_name, c.character_role);
      const got = JSON.parse(out.context).timelineFramework?.keyMomentPositions ?? [];
      if (!NOT_IN_DESIGN.has(`${pkg.id}|${c.character_name}`)) assert.ok(got.some((e) => sameCharacter(e.character, c.character_name)), `${pkg.title}: ${c.character_name} did not get its own position entry`);
      for (const e of got) {
        const src = kmp.find((k) => k.character === e.character);
        assert.ok(src, `${pkg.title}: ${e.character}`);
        const ok = sameCharacter(e.character, c.character_name) || (src.canBeSeenBy ?? []).some((n) => sameCharacter(n, c.character_name));
        assert.ok(ok, `${pkg.title}: ${c.character_name} was given ${e.character}`);
        // another innocent's entry never names or sits beside a culprit
        if (!sameCharacter(e.character, c.character_name) && !sameCharacter(e.character, mc.murdererSelection.character)) {
          for (const culprit of [mc.murdererSelection.character, mc.accompliceSelection?.character].filter(Boolean)) {
            assert.ok(!(e.besideOrNear ?? []).some((n) => sameCharacter(n, culprit)), `${pkg.title}: ${e.character} sits beside ${culprit} in ${c.character_name}'s view`);
            assert.ok(!norm(e.position ?? "").includes(norm(culprit.split(/[ ('/]/).filter((w) => w.length >= 4)[0] ?? culprit)), `${pkg.title}: ${e.character}'s text names ${culprit} in ${c.character_name}'s view`);
          }
        }
        // a culprit's true position never travels
        if (sameCharacter(e.character, mc.murdererSelection.character)) assert.ok(!e.position.includes(src.truePosition.slice(0, 60)) || src.truePosition === e.position, "true position leaked");
      }
    }
  }
  assert.ok(withMap >= 1);
});

t("Silver Nightingale regression: Vivian does not receive Juliet's confrontation in the compartment corridor", () => {
  const pkg = PACKAGES.find((p) => p.id === SILVER);
  assert.ok(pkg, "fixture package missing");
  const get = (n) => buildCharacterContext(pkg.master_context, n, "suspect");
  const vivian = get("Vivian Calloway").context;
  assert.ok(!/confronted him in the compartment corridor/i.test(vivian));
  assert.ok(!/slipped away only afterwards/i.test(vivian));
  assert.ok(!/spoke with Reginald privately/i.test(vivian));
  // Nobody gets the sentence: it lives only in otherSuspectsAlibis, which the allowlist drops (see findings.md, risk 1).
  for (const n of ["Juliet Reyes", "Marcus Finch", "Beatrice Langley"]) {
    assert.ok(!/confronted him in the compartment corridor/i.test(get(n).context), n);
  }
});

t("Silver Nightingale eyewitness: Percival keeps what he saw in his own entry, and sees the steward only by her stated position", () => {
  const pkg = PACKAGES.find((p) => p.id === SILVER);
  const out = buildCharacterContext(pkg.master_context, "Percival Okafor", "redHerring");
  const kmp = JSON.parse(out.context).timelineFramework.keyMomentPositions;
  const own = kmp.find((e) => e.character === "Percival Okafor");
  assert.match(own.position, /after Simone had handed it to Reginald/);
  const simone = kmp.find((e) => e.character === "Simone Delacroix");
  assert.ok(simone, "Percival is in Simone's canBeSeenBy");
  assert.match(simone.position, /pantry/);
  assert.ok(!/dosed|set apart on its own napkin/.test(simone.position));
  assert.ok(!out.context.includes("dosed the glass"));
  // Marcus can see both Percival and Simone, but Percival's sentence about Simone handing the glass is not his to know.
  const marcus = JSON.parse(buildCharacterContext(pkg.master_context, "Marcus Finch", "suspect").context).timelineFramework.keyMomentPositions;
  assert.ok(!/handed it to Reginald/.test(marcus.find((e) => e.character === "Percival Okafor").position));
  assert.deepEqual(marcus.find((e) => e.character === "Percival Okafor").besideOrNear, []);
});

assert.equal(failures.length, 0, `${failures.length} leak(s):\n${failures.slice(0, 20).join("\n")}`);
console.log(`\n${passed} tests passed`);
console.log(`real data: ${packagesChecked} packages with the classic schema, ${unsupported} unsupported (intrigue), ${innocentsChecked} innocents checked`);
for (const [role, arr] of Object.entries(ratios)) if (arr.length) console.log(`size ratio ${role}: n=${arr.length} median ${median(arr).toFixed(3)} min ${Math.min(...arr).toFixed(3)} max ${Math.max(...arr).toFixed(3)}`);
