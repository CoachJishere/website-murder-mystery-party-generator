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

// ---------------------------------------------------------------------------------------------------------------------------------
// ADR-0156 Phase 4: whatAnObserverSees (written by Parent86). Synthetic cases; the real-data one is in Part B.
// ---------------------------------------------------------------------------------------------------------------------------------
const OBS = {
  "Dr. Mara Quill": "Standing in the cellar passage holding a bottle of claret.",
  "Tobias Reed": "Standing at the top of the cellar stairs with a lamp.",
  "Ivy Chen": "In the kitchen cutting bread at the table.",
  "Leo Park/Lena Park": "Out in the garden smoking by the roses.",
  "Nora Bell ('The Baker')": "At the kitchen door watching Ivy cut bread.",
};
/** part2 with observer text on every entry, then per-test edits. */
const withObs = (edit = () => {}, texts = OBS) => {
  const p2 = structuredClone(part2);
  for (const e of p2.timelineFramework.keyMomentPositions) e.whatAnObserverSees = texts[e.character];
  edit(p2.timelineFramework.keyMomentPositions);
  return JSON.stringify(part1) + "\n" + JSON.stringify(p2);
};
const kmpFor = (mc, who, opts) => {
  const out = buildCharacterContext(mc, who, "suspect", opts);
  return { out, kmp: JSON.parse(out.context).timelineFramework?.keyMomentPositions ?? [] };
};
const entry = (kmp, start) => kmp.find((e) => e.character.startsWith(start));

ta("observer text: a visible murderer is given as observer text, same shape, no true position and no stated alibi", () => {
  const mc = withObs((k) => { k[0].canBeSeenBy = ["Leo Park/Lena Park"]; });
  const { out, kmp } = kmpFor(mc, "Leo Park/Lena Park");
  const e = entry(kmp, "Dr. Mara");
  assert.deepEqual(Object.keys(e).sort(), ["besideOrNear", "canBeSeenBy", "character", "position"]);
  assert.equal(e.position, OBS["Dr. Mara Quill"]);
  assert.ok(!out.context.includes("adding aconite") && !out.context.includes("door shut"), "true position must not travel");
  assert.ok(!out.context.includes("says she was in the kitchen"), "the stated alibi is not needed when the observer text exists");
  assert.ok(out.kept.some((k) => k.includes("whatAnObserverSees")));
});

ta("observer text replaces the stated alibi even when visibleMurderer is omit", () => {
  const mc = withObs((k) => { k[0].canBeSeenBy = ["Leo Park/Lena Park"]; });
  assert.equal(entry(kmpFor(mc, "Leo Park/Lena Park", { visibleMurderer: "omit" }).kmp, "Dr. Mara").position, OBS["Dr. Mara Quill"]);
});

ta("observer text: a murderer this character cannot see is absent, and her observer text does not travel", () => {
  const mc = withObs(); // Mara's canBeSeenBy is empty in the base design
  for (const who of ["Ivy Chen", "Nora Bell ('The Baker')", "Leo Park/Lena Park"]) {
    const { out, kmp } = kmpFor(mc, who);
    assert.ok(!kmp.some((e) => e.character.startsWith("Dr. Mara")), who);
    assert.ok(!out.context.includes(OBS["Dr. Mara Quill"]), who);
  }
  // Listed in someone else's besideOrNear is not the same as being allowed to see: only canBeSeenBy opens an entry.
  const mc2 = withObs((k) => { k[2].besideOrNear = ["Nora Bell ('The Baker')", "Dr. Mara Quill"]; });
  const { out } = kmpFor(mc2, "Leo Park/Lena Park");
  assert.ok(!out.context.includes(OBS["Dr. Mara Quill"]));
});

ta("observer text: a visible accomplice is now given (it was dropped without it)", () => {
  const mc = withObs((k) => { k[1].canBeSeenBy = ["Ivy Chen"]; });
  const { out, kmp } = kmpFor(mc, "Ivy Chen");
  assert.equal(entry(kmp, "Tobias").position, OBS["Tobias Reed"]);
  assert.ok(!out.dropped.some((d) => d.includes("visible accomplice")));
  assert.ok(!out.context.includes("Standing guard"), "true position must not travel");
});

ta("observer text: the viewer's own entry stays the true position and its observer text is not repeated", () => {
  const { out, kmp } = kmpFor(withObs(), "Ivy Chen");
  assert.equal(entry(kmp, "Ivy").position, "In the kitchen cutting bread, alone and in view of Nora.");
  assert.ok(!out.context.includes(OBS["Ivy Chen"]));
});

ta("observer text: another innocent's entry is given as observer text, not as its true position", () => {
  // Nora's true position names the murderer, so without the field Ivy got position: null. With it she gets what Nora looked like.
  const { out, kmp } = kmpFor(withObs(), "Ivy Chen");
  assert.equal(entry(kmp, "Nora").position, OBS["Nora Bell ('The Baker')"]);
  assert.ok(!out.context.includes("glimpsed Mara hurrying"));
});

ta("observer text: a culprit named in another entry is removed unless this character can see that culprit", () => {
  const texts = { ...OBS, "Nora Bell ('The Baker')": "At the kitchen door, speaking with Dr. Mara Quill." };
  // Ivy cannot see Mara: the sentence goes, the neighbour tag stays (an alibi witness).
  const hidden = entry(kmpFor(withObs(() => {}, texts), "Ivy Chen").kmp, "Nora");
  assert.equal(hidden.position, null);
  assert.deepEqual(hidden.besideOrNear, ["Ivy Chen"]);
  // Ivy can see Mara (with observer text): naming her is the same information Mara's own entry gives.
  const visible = withObs((k) => { k[0].canBeSeenBy = ["Ivy Chen"]; }, texts);
  const nora = entry(kmpFor(visible, "Ivy Chen").kmp, "Nora");
  assert.equal(nora.position, texts["Nora Bell ('The Baker')"]);
});

ta("observer text: a hidden accomplice's name is stripped from a visible murderer's neighbour and witness lists", () => {
  const mc = withObs((k) => { k[0].canBeSeenBy = ["Ivy Chen", "Tobias Reed"]; k[0].besideOrNear = ["Tobias Reed", "Ivy Chen"]; });
  const e = entry(kmpFor(mc, "Ivy Chen").kmp, "Dr. Mara");
  assert.deepEqual(e.besideOrNear, ["Ivy Chen"]);
  assert.deepEqual(e.canBeSeenBy, ["Ivy Chen"]);
});

ta("observer text: absent, empty, not a string or over the length cap is not used and falls back to the old behaviour", () => {
  const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
  for (const [label, v] of [["absent", undefined], ["empty", ""], ["blank", "   "], ["number", 7], ["object", { a: 1 }], ["too long", long]]) {
    const mc = withObs((k) => { k[0].canBeSeenBy = ["Leo Park/Lena Park"]; if (v === undefined) delete k[0].whatAnObserverSees; else k[0].whatAnObserverSees = v; });
    const { out, kmp } = kmpFor(mc, "Leo Park/Lena Park");
    assert.match(entry(kmp, "Dr. Mara").position, /says she was in the kitchen/, label); // the old "claimed" shape
    assert.ok(!out.context.includes("word59") && !out.context.includes("adding aconite"), label);
    if (label === "too long") assert.ok(out.dropped.some((d) => d.includes("over 45 words")));
  }
});

ta("observer text: a mixed map (some entries without the field) uses the field where it exists and the old rules elsewhere", () => {
  const mc = withObs((k) => { delete k[4].whatAnObserverSees; }); // Nora has no field
  const { kmp } = kmpFor(mc, "Ivy Chen");
  assert.equal(entry(kmp, "Nora").position, null); // old rule: every sentence of her true position names the murderer
  const leo = kmpFor(mc, "Nora Bell ('The Baker')").kmp;
  assert.equal(entry(leo, "Leo").position, OBS["Leo Park/Lena Park"]);
});

ta("observer text: the murderer and accomplice still receive the stored text byte for byte", () => {
  const mc = withObs();
  assert.equal(buildCharacterContext(mc, "Dr. Mara Quill", "murderer").context, mc);
  assert.equal(buildCharacterContext(mc, "Tobias Reed", "accomplice").context, mc);
});

ta("observer text: a design without the field gives exactly the same output as before Phase 4", () => {
  // Phase 1 behaviour is pinned by the tests above; this pins it against the field being present but unusable everywhere.
  const bad = withObs((k) => { for (const e of k) e.whatAnObserverSees = ""; });
  for (const who of ["Ivy Chen", "Nora Bell ('The Baker')", "Leo Park/Lena Park"]) {
    assert.equal(buildCharacterContext(bad, who, "suspect").context, buildCharacterContext(MC, who, "suspect").context, who);
  }
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

t("Phase 4 on the real Silver Nightingale design: the eyewitnesses get the steward back, nobody gets the act", () => {
  const pkg = PACKAGES.find((p) => p.id === SILVER);
  // Observer texts a Parent86 run could write for the entries that matter (hand-written, derived from the true positions; no model call).
  const SIMONE = "At the service sideboard at the bar end of the dining car, holding the brandy tray and handing Reginald his glass during the toast.";
  const PERCIVAL = "Standing at the bar end beside the service sideboard, speaking with Reginald and moving his glass aside once.";
  const mc = parseMasterContext(pkg.master_context);
  for (const e of mc.timelineFramework.keyMomentPositions) {
    if (e.character === "Simone Delacroix") e.whatAnObserverSees = SIMONE;
    else if (e.character === "Percival Okafor") e.whatAnObserverSees = PERCIVAL;
    else e.whatAnObserverSees = e.canBeSeenBy.length ? "Seated at the dining car tables during the toasts." : "";
  }
  const text = JSON.stringify(mc);
  const act = /dosed|set apart on its own napkin|She was not in the pantry/;
  const get = (n) => buildCharacterContext(text, n, "suspect");
  // Simone lists Percival, Marcus, Harry and Josie. The first three are the witnesses the Phase 2 replay lost; Josie is a fourth.
  for (const n of ["Marcus Finch", "Harry Dunmore", "Josie Beaumont"]) {
    const kmp = JSON.parse(get(n).context).timelineFramework.keyMomentPositions;
    assert.equal(kmp.find((e) => e.character === "Simone Delacroix")?.position, SIMONE, n);
  }
  // Marcus also sees Percival's entry, with Simone named, because he can see Simone.
  const marcus = JSON.parse(get("Marcus Finch").context).timelineFramework.keyMomentPositions;
  assert.equal(marcus.find((e) => e.character === "Percival Okafor").position, PERCIVAL);
  // Everyone who cannot see Simone gets neither her entry nor any sentence of Percival's that names her.
  for (const n of ["Vivian Calloway", "Bartholomew Calloway", "Juliet Reyes", "Beatrice Langley", "Nikolai Volkov", "Antonia Rolewicz"]) {
    const out = get(n);
    const kmp = JSON.parse(out.context).timelineFramework?.keyMomentPositions ?? [];
    assert.ok(!kmp.some((e) => e.character === "Simone Delacroix"), n);
    assert.ok(!out.context.includes("handing Reginald his glass"), n);
  }
  // No innocent receives any part of the act, the stated alibi gap or the accomplice's post.
  for (const c of CHARS.filter((x) => x.package_id === SILVER && !/murderer|accomplice/i.test(x.character_role ?? ""))) {
    let out; try { out = get(c.character_name).context; } catch { continue; }
    assert.ok(!act.test(out), c.character_name);
    assert.ok(!out.includes("keeping watch so no crew member came through"), c.character_name);
  }
});

assert.equal(failures.length, 0, `${failures.length} leak(s):\n${failures.slice(0, 20).join("\n")}`);
console.log(`\n${passed} tests passed`);
console.log(`real data: ${packagesChecked} packages with the classic schema, ${unsupported} unsupported (intrigue), ${innocentsChecked} innocents checked`);
for (const [role, arr] of Object.entries(ratios)) if (arr.length) console.log(`size ratio ${role}: n=${arr.length} median ${median(arr).toFixed(3)} min ${Math.min(...arr).toFixed(3)} max ${Math.max(...arr).toFixed(3)}`);
