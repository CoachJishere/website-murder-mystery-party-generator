// Run: node --experimental-strip-types supabase/functions/_shared/childContext.test.mjs   (npm run test:childctx)
// ADR-0156 Phase 3: the seam between the redaction functions and the callers (child-context edge function, regenerate-child-content).
// Part A is synthetic and committed. Part B uses the real detective packages in temp-files/charctx/ and SKIPS cleanly when they are absent.
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  BODY_SEPARATOR, MIN_CONTEXT_CHARS, deriveRole, inputsForRegeneration, parseMode, parseRequestBody, prepareChildInputs,
} from "./childContext.ts";
import { parseMasterContext, sameCharacter } from "./characterContext.ts";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok  ", name); };

// ---------------------------------------------------------------------------------------------------------------------------------
// A synthetic design in the real shape (two concatenated JSON objects), long enough that an innocent's slice clears MIN_CONTEXT_CHARS.
// ---------------------------------------------------------------------------------------------------------------------------------
const CAST = ["Vivian Calloway", "Harry Dunmore", "Theo/Thea Baptiste", "Dr. Felicity Hartmann", "Marcus Finch", "Josephine 'Josie' Beaumont", "Simone Delacroix"];
const pad = (who, what) => `${who} ${what} `.repeat(4).trim();
function design({ murderer = "Simone Delacroix", accomplice = "Marcus Finch", mysteryType, drop = [] } = {}) {
  const p1 = {
    mysteryStyle: "detective",
    ...(mysteryType ? { mysteryType } : {}),
    murdererSelection: { character: murderer, reasoning: "Simone alone served the brandy and had the nerve to use the moment of the toast." },
    accompliceSelection: accomplice ? { character: accomplice, relationshipToMurderer: "Old friends." } : undefined,
    relationshipMatrix: ["| | " + CAST.join(" | ") + " |", "|" + "---|".repeat(CAST.length + 1), ...CAST.map((c) => `| **${c}** | ` + CAST.map((d) => (d === c ? "—" : "Neutral")).join(" | ") + " |")].join("\n"),
    victimProfile: {
      name: "Reginald Ashworth", role: "The railway magnate who owns the Silver Train and everyone's debts", powerSource: "Reginald held old debts over half the dining car and enjoyed it.",
      personality: "Jovial in public, ruthless in private, and never forgetful of a slight.", activitiesAndSchemes: `${murderer} was secretly forced to carry out his schemes.`,
      wrongedEachCharacter: CAST.map((c) => ({ character: c, howVictimWrongedThem: pad(c, "was wronged by Reginald in a way only this character knows about, in detail"), motiveStrength: "Medium", isMurderer: c === murderer ? "true" : "false", isRedHerring: c === "Harry Dunmore" ? "true" : "false" })),
    },
    murderMethod: { weapon: "Poison in a brandy glass served during the first toast in the dining car.", execution: `${murderer} dosed the glass at the sideboard while all eyes were on the head table.` },
    conversationDetailsExtraction: { characterSpecificDetails: CAST.map((c) => ({ character: c, backgroundDetails: pad(c, "has a private background that should reach only this character"), threatsOrPressures: pad(c, "faces a private pressure"), pastEvents: "", otherDetails: "" })) },
  };
  const p2 = {
    evidenceProgression: { round2: { item: "A brandy glass set apart on its own napkin.", reveals: `It was prepared by ${murderer}.` }, round3: { item: "A torn menu card with a smear.", reveals: "x" }, round4: { item: "The steward's tray log.", reveals: "y", murdererFlaw: `${murderer} lied about the pantry.` } },
    timelineFramework: {
      gatheringStarted: "Guests boarded at seven in the evening and the train left the station at once.", specificEvents: "Dinner began at eight and the first toast was raised at nine fifteen in the dining car.",
      victimLastSeen: "Reginald was last seen raising his glass at the head table.", bodyDiscovered: "He was found slumped in his chair after the toast by the conductor.",
      murdererClaimedLocation: "In the pantry.", murdererAlibiGap: "Nobody saw her in the pantry.",
      ...(drop.includes("keyMoments") ? {} : { keyMomentPositions: CAST.map((c) => ({ character: c, truePosition: c === murderer ? "At the sideboard dosing the glass." : "In the dining car near the head table.", besideOrNear: [], canBeSeenBy: c === murderer ? [] : ["Vivian Calloway"] })) }),
    },
    deceptionGuidelines: { purpose: `Guide ${murderer}'s deception.` },
    hostBriefing: { solution: { murderer } },
  };
  if (!accomplice) delete p1.accompliceSelection;
  return JSON.stringify(p1) + "\n" + JSON.stringify(p2);
}
const MC = design();
const CHAT = [
  "User: Please make a murder on a snowbound train for seven players.", "", "AI:", "## Character List",
  "1. **Vivian Calloway** (played by Isabel) – The heir at the center of the engagement, desperate to keep an old scandal buried.",
  "2. **Harry Dunmore** (played by Cole) – A journalist posing as a society guest, chasing the real story behind the victim.",
  "3. **Theo/Thea Baptiste** – Business partner who quietly funded the empire and knows where the financial bodies are buried.",
  "- Dr. Felicity Hartmann: the train physician, sworn to secrecy about a diagnosis the victim used as leverage.",
  "5. Marcus Finch (played by Dan) - A retired detective who is really an inquiry agent hired to recover a ledger.",
  "6. Josephine 'Josie' Beaumont - The life of the party. Took money from a charity years ago.",
  "7. Simone Delacroix (played by Emily) - The head steward, forced into a favor by the victim.",
].join("\n");
const base = { mode: "on", isTest: false, mysteryStyle: "detective", masterContext: MC, characterName: "Vivian Calloway", excerpt: "User: tell me about Vivian Calloway\n---\nAI: ok", conversation: CHAT };

// ---------------------------------------------------------------------------------------------------------------------------------
t("parseMode: only on and test_only switch anything on; everything else is off", () => {
  assert.equal(parseMode("on"), "on"); assert.equal(parseMode("test_only"), "test_only");
  for (const v of ["off", "ON", "true", "", null, undefined, 1, "enabled"]) assert.equal(parseMode(v), "off", String(v));
});

t("parseRequestBody round-trips the four parts, keeps blank excerpts and unicode, trims id and name", () => {
  const id = "178de25c-d7b8-4e02-9210-4e63298614e9";
  const body = [id, "Doña Hierbas ", "", "User: hola\n\nAI: ¿qué tal?\n---\nx"].join(BODY_SEPARATOR);
  const r = parseRequestBody(body);
  assert.deepEqual(r, { packageId: id, characterName: "Doña Hierbas", excerpt: "", conversation: "User: hola\n\nAI: ¿qué tal?\n---\nx" });
});
t("parseRequestBody rejects a wrong part count, a bad id and an empty name", () => {
  const id = "178de25c-d7b8-4e02-9210-4e63298614e9";
  assert.equal(parseRequestBody([id, "A", "x"].join(BODY_SEPARATOR)), null);
  assert.equal(parseRequestBody([id, "A", "x", "y", "z"].join(BODY_SEPARATOR)), null);
  assert.equal(parseRequestBody(["not-a-uuid", "A", "x", "y"].join(BODY_SEPARATOR)), null);
  assert.equal(parseRequestBody([id, "  ", "x", "y"].join(BODY_SEPARATOR)), null);
  assert.equal(parseRequestBody(""), null);
});

t("deriveRole reads murderer, accomplice, redHerring and suspect from the design (dual names and nicknames included)", () => {
  assert.equal(deriveRole(MC, "Simone Delacroix"), "murderer");
  assert.equal(deriveRole(MC, "Marcus Finch"), "accomplice");
  assert.equal(deriveRole(MC, "Harry Dunmore"), "redHerring");
  assert.equal(deriveRole(MC, "Vivian Calloway"), "suspect");
  assert.equal(deriveRole(MC, "Josie Beaumont"), "suspect");
  assert.equal(deriveRole(design({ murderer: "Theo/Thea Baptiste" }), "Thea Baptiste"), "murderer");
});

t("sanity: the synthetic innocent slice is larger than the starvation guard, so the tests below test redaction, not the guard", () => {
  const r = prepareChildInputs(base);
  assert.equal(r.redacted, true);
  assert.ok(r.context.length >= MIN_CONTEXT_CHARS, `${r.context.length}`);
});

t("off: nothing is returned and the caller keeps its full inputs (today's behaviour)", () => {
  const r = prepareChildInputs({ ...base, mode: "off" });
  assert.deepEqual([r.redacted, r.context, r.excerpt, r.chat, r.fallback], [false, null, null, null, null]);
  assert.deepEqual(r.flags, ["switch-off"]);
});
t("test_only: redacts a test package and leaves a real one alone", () => {
  assert.equal(prepareChildInputs({ ...base, mode: "test_only", isTest: true }).redacted, true);
  const real = prepareChildInputs({ ...base, mode: "test_only", isTest: false });
  assert.equal(real.redacted, false); assert.deepEqual(real.flags, ["test-only-skip"]);
});
t("a slip-style (or unknown style) package is never touched", () => {
  for (const s of ["character", null, undefined, "other"]) assert.deepEqual(prepareChildInputs({ ...base, mysteryStyle: s }).flags, ["not-detective"]);
});

t("murderer and accomplice keep the full inputs", () => {
  for (const [name, role] of [["Simone Delacroix", "murderer"], ["Marcus Finch", "accomplice"]]) {
    const r = prepareChildInputs({ ...base, characterName: name });
    assert.equal(r.redacted, false, name); assert.equal(r.role, role); assert.deepEqual(r.flags, ["culprit-full"]); assert.equal(r.fallback, null);
  }
});
t("a stored culprit role the design does not support still gets the full inputs, and the mismatch is flagged", () => {
  const r = prepareChildInputs({ ...base, storedRole: "murderer" });
  assert.equal(r.redacted, false); assert.ok(r.flags.some((f) => f.startsWith("role-mismatch")), r.flags.join());
  const r2 = prepareChildInputs({ ...base, characterName: "Simone Delacroix", storedRole: "suspect" });
  assert.equal(r2.redacted, false); assert.ok(r2.flags.some((f) => f.startsWith("role-mismatch")));
});

t("an innocent gets a slice: own entry in, murder execution, alibi lie, host briefing and other characters' entries out", () => {
  const r = prepareChildInputs(base);
  assert.equal(r.redacted, true); assert.equal(r.role, "suspect"); assert.equal(r.fallback, null);
  assert.ok(r.context.includes("Vivian Calloway was wronged by Reginald"));
  for (const hidden of ["dosed the glass", "murdererAlibiGap", "hostBriefing", "deceptionGuidelines", "Harry Dunmore was wronged by Reginald", "Simone Delacroix was wronged by Reginald"]) {
    assert.ok(!r.context.includes(hidden), `leaks: ${hidden}`);
  }
  assert.ok(r.context.length < MC.length * 0.5);
});
t("the chat comes back redacted for an innocent: others' blurbs withheld, own kept", () => {
  const r = prepareChildInputs(base);
  assert.ok(r.chat.includes("The heir at the center of the engagement"));
  for (const s of ["journalist", "inquiry agent", "financial bodies", "charity", "forced into a favor"]) assert.ok(!r.chat.includes(s), s);
  assert.ok(r.chat.includes("Harry Dunmore") && r.chat.includes("played by Cole"));
  assert.equal(r.excerpt, base.excerpt);
});
t("a blank excerpt or chat is passed through without being judged (no false 'list not recognised')", () => {
  const r = prepareChildInputs({ ...base, excerpt: "", conversation: "" });
  assert.equal(r.redacted, true); assert.equal(r.excerpt, ""); assert.equal(r.chat, "");
  const r2 = prepareChildInputs({ ...base, excerpt: undefined, conversation: undefined });
  assert.equal(r2.redacted, true);
});
t("a design without keyMomentPositions is still redacted", () => {
  const r = prepareChildInputs({ ...base, masterContext: design({ drop: ["keyMoments"] }) });
  assert.equal(r.redacted, true); assert.ok(!r.context.includes("keyMomentPositions"));
});

t("fallback: an intrigue design keeps the full inputs, is logged, and does NOT alert", () => {
  const r = prepareChildInputs({ ...base, masterContext: design({ mysteryType: "intrigue" }) });
  assert.equal(r.redacted, false); assert.deepEqual(r.fallback, { reason: "unsupported-intrigue", alert: false });
});
t("fallback: an unreadable or empty design alerts", () => {
  for (const mc of ["", "not json", "{\"a\":", "[]"]) {
    const r = prepareChildInputs({ ...base, masterContext: mc });
    assert.equal(r.redacted, false, JSON.stringify(mc)); assert.equal(r.fallback?.reason, "unreadable-design"); assert.equal(r.fallback?.alert, true);
  }
});
t("fallback: a character the design does not know alerts (renamed or stale roster)", () => {
  const r = prepareChildInputs({ ...base, characterName: "Zelda Renamed" });
  assert.equal(r.redacted, false); assert.equal(r.fallback?.reason, "own-entry-not-found"); assert.equal(r.fallback?.alert, true);
});
t("fallback: a design that names no murderer is malformed, not 'everyone innocent'", () => {
  const mc = JSON.parse("[" + MC.replace("}\n{", "},{") + "]");
  mc[0].murdererSelection = {};
  const r = prepareChildInputs({ ...base, masterContext: JSON.stringify(mc[0]) + "\n" + JSON.stringify(mc[1]) });
  assert.equal(r.redacted, false); assert.equal(r.fallback?.reason, "design-names-no-murderer");
});
t("fallback: a starved slice (too small) keeps the full inputs", () => {
  const mc = JSON.parse("[" + MC.replace("}\n{", "},{") + "]");
  for (const c of mc[0].victimProfile.wrongedEachCharacter) c.howVictimWrongedThem = "x";
  for (const c of mc[0].conversationDetailsExtraction.characterSpecificDetails) { c.backgroundDetails = "x"; c.threatsOrPressures = "x"; }
  mc[0].victimProfile.powerSource = "x"; mc[0].victimProfile.personality = "x"; mc[0].victimProfile.role = "x";
  mc[0].relationshipMatrix = "| a |";
  mc[1].timelineFramework = { gatheringStarted: "x" }; mc[1].evidenceProgression = {}; mc[0].murderMethod = { weapon: "x" };
  const r = prepareChildInputs({ ...base, masterContext: JSON.stringify(mc[0]) + "\n" + JSON.stringify(mc[1]) });
  assert.equal(r.redacted, false); assert.equal(r.fallback?.reason, "context-too-small");
});
t("fallback: a chat whose character list cannot be recognised while the others' hidden text is in it (and survives the strict pass) keeps the full inputs", () => {
  // Harry's hidden text pasted into the chat as free prose that names nobody, so even the strict pass has no name to catch it by
  const harry = parseMasterContext(MC).victimProfile.wrongedEachCharacter.find((e) => e.character === "Harry Dunmore").howVictimWrongedThem;
  const unnamed = harry.replace(/Harry Dunmore/g, "he");
  const chat = `User: some notes\n${unnamed}\nAI: fine`;
  const r = prepareChildInputs({ ...base, conversation: chat, excerpt: "" });
  assert.equal(r.redacted, false); assert.deepEqual(r.fallback, { reason: "chat-list-not-recognised", alert: true });
});
t("the same hidden text that names the character is caught by the strict pass instead, so no fallback is needed", () => {
  const harry = parseMasterContext(MC).victimProfile.wrongedEachCharacter.find((e) => e.character === "Harry Dunmore").howVictimWrongedThem;
  const r = prepareChildInputs({ ...base, conversation: `User: some notes\n${harry}\nAI: fine`, excerpt: "" });
  assert.equal(r.redacted, true); assert.ok(!r.chat.includes("was wronged by Reginald"));
});
t("an unrecognised list in a chat that holds nothing hidden is harmless and does not fall back", () => {
  const r = prepareChildInputs({ ...base, conversation: "User: make it a train mystery\nAI: sure, a train it is" });
  assert.equal(r.redacted, true);
  assert.ok(r.flags.includes("chat:character-list-not-recognised"));
});

t("regeneration seam: off returns the exact original strings", () => {
  const r = inputsForRegeneration({ mode: "off", isTest: false, mysteryStyle: "detective", masterContext: MC, transcript: CHAT, characterName: "Vivian Calloway", storedRole: "suspect" });
  assert.equal(r.masterContext, MC); assert.equal(r.transcript, CHAT); assert.equal(r.prep.redacted, false);
});
t("regeneration seam: on redacts an innocent and leaves a culprit alone", () => {
  const r = inputsForRegeneration({ mode: "on", isTest: false, mysteryStyle: "detective", masterContext: MC, transcript: CHAT, characterName: "Vivian Calloway", storedRole: "suspect" });
  assert.notEqual(r.masterContext, MC); assert.ok(r.masterContext.length < MC.length); assert.ok(!r.transcript.includes("journalist"));
  const c = inputsForRegeneration({ mode: "on", isTest: false, mysteryStyle: "detective", masterContext: MC, transcript: CHAT, characterName: "Simone Delacroix", storedRole: "murderer" });
  assert.equal(c.masterContext, MC); assert.equal(c.transcript, CHAT);
});
t("regeneration seam: any failure gives the originals back, never a throw or a blank", () => {
  for (const mc of ["", "garbage"]) {
    const r = inputsForRegeneration({ mode: "on", isTest: false, mysteryStyle: "detective", masterContext: mc, transcript: CHAT, characterName: "Vivian Calloway" });
    assert.equal(r.masterContext, mc); assert.equal(r.transcript, CHAT); assert.equal(r.prep.redacted, false);
  }
  const r = inputsForRegeneration({ mode: "on", isTest: false, mysteryStyle: "detective", masterContext: MC, transcript: "", characterName: "Vivian Calloway" });
  assert.equal(r.prep.redacted, true); assert.equal(r.transcript, "");
});

t("regeneration seam: an unexpected exception inside the redaction (not just a parse error) also gives the originals back", () => {
  const r = inputsForRegeneration({ mode: "on", isTest: false, mysteryStyle: "detective", masterContext: null, transcript: CHAT, characterName: "Vivian Calloway" });
  assert.equal(r.masterContext, null); assert.equal(r.transcript, CHAT); assert.equal(r.prep.fallback?.reason, "exception");
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Part B: real packages (skips when the local fixtures are absent)
// ---------------------------------------------------------------------------------------------------------------------------------
const DIR = "temp-files/charctx";
if (!fs.existsSync(`${DIR}/packages.json`) || !fs.existsSync(`${DIR}/characters.json`)) {
  console.log("SKIP real-data checks (temp-files/charctx/ absent)");
} else {
  const P = JSON.parse(fs.readFileSync(`${DIR}/packages.json`, "utf8"));
  const CH = JSON.parse(fs.readFileSync(`${DIR}/characters.json`, "utf8"));
  const chatOf = (id) => (fs.existsSync(`${DIR}/chats/${id}.txt`) ? fs.readFileSync(`${DIR}/chats/${id}.txt`, "utf8") : "");
  const tally = { culprit: 0, redacted: 0, fallback: {} };
  let roleChecked = 0;
  for (const p of P) {
    if (!p.master_context) continue;
    for (const c of CH.filter((x) => x.package_id === p.id)) {
      const r = prepareChildInputs({ mode: "on", isTest: false, mysteryStyle: "detective", masterContext: p.master_context, characterName: c.character_name, storedRole: null, excerpt: "", conversation: chatOf(p.id) });
      const stored = String(c.character_role);
      const fullStored = stored === "murderer" || stored === "accomplice";
      if (r.role) { roleChecked++; assert.equal(["murderer", "accomplice"].includes(r.role), fullStored, `${p.title} / ${c.character_name}: derived ${r.role}, stored ${stored}`); }
      if (fullStored) { assert.equal(r.redacted, false, `${c.character_name} must keep the full design`); tally.culprit++; continue; }
      if (r.redacted) { tally.redacted++; assert.ok(r.context.length >= MIN_CONTEXT_CHARS); assert.ok(r.context.length < p.master_context.length); }
      else { assert.ok(r.fallback, `${p.title} / ${c.character_name}: not redacted and no reason (${r.flags})`); tally.fallback[r.fallback.reason] = (tally.fallback[r.fallback.reason] ?? 0) + 1; assert.notEqual(r.fallback.reason, "exception"); }
    }
  }
  passed++;
  console.log(`ok   real packages: ${roleChecked} characters, culprits keep full ${tally.culprit}, redacted ${tally.redacted}, fallbacks ${JSON.stringify(tally.fallback)}`);
  assert.ok(tally.redacted > 50, "expected most innocents to be redacted");
}

console.log(`\n${passed} tests passed`);
