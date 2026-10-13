// Run: node --experimental-strip-types supabase/functions/auto-remediate-packages/accomplice-heal.test.mjs
import assert from "node:assert/strict";
import * as H from "./accomplice-heal.ts";
const t = (n, fn) => { fn(); console.log("ok  ", n); };

const entry = (character, isMurderer, isRedHerring) => ({ character, howVictimWrongedThem: "x", isMurderer, isRedHerring });
const mcObj = (over = {}) => ({
  victimProfile: { name: "Lady E" },
  accompliceSelection: { character: "Pamela 'Pam' Ridgewood", relationshipToMurderer: "friendly" },
  wrongedEachCharacter: [
    entry("Sheila Ashworth", "true", "false"),
    entry("Pamela 'Pam' Ridgewood", "false", "false"),
    entry("Jacqueline 'Jackie' Winthrop", "false", "true"),
    entry("Dr. Victor/Victoria Thorne", "false", "true"),
  ],
  ...over,
});
// master_context is stored as one or two concatenated JSON objects
const mc = (over) => JSON.stringify(mcObj(over)) + "\n" + JSON.stringify({ timelineFramework: { x: 1 } });
const chars = [
  { id: "1", name: "Sheila Ashworth", role: "murderer" },
  { id: "2", name: "Pamela 'Pam' Ridgewood", role: "accomplice" },
  { id: "3", name: "Jacqueline 'Jackie' Winthrop", role: "accomplice" },
  { id: "4", name: "Dr. Victor/Victoria Thorne", role: "redHerring" },
];
const base = { style: "detective", delivered: false, chars, masterContext: mc() };

t("the Blackthorn shape plans a demotion of the non-selected accomplice to redHerring with the full detective sheet", () => {
  const p = H.planAccompliceRoleHeal(base);
  assert.equal(p.ok, true); assert.equal(p.demote.name, "Jacqueline 'Jackie' Winthrop"); assert.equal(p.keep.name, "Pamela 'Pam' Ridgewood");
  assert.equal(p.toRole, "redHerring");
  for (const f of ["secret", "background", "round2_script", "final_statement", "accusations"]) assert.ok(p.fields.includes(f), f);
});
t("an innocent that master_context does not call a red herring becomes 'suspect'", () => {
  const m = mc({ wrongedEachCharacter: [entry("Sheila Ashworth", "true", "false"), entry("Pamela 'Pam' Ridgewood", "false", "false"), entry("Jacqueline 'Jackie' Winthrop", "false", "false")] });
  const p = H.planAccompliceRoleHeal({ ...base, masterContext: m });
  assert.equal(p.ok, true); assert.equal(p.toRole, "suspect");
});
t("booleans instead of strings work too, and the selection may be the second accomplice", () => {
  const m = mc({ accompliceSelection: { character: "Jacqueline 'Jackie' Winthrop" }, wrongedEachCharacter: [entry("Pamela 'Pam' Ridgewood", false, true), entry("Jacqueline 'Jackie' Winthrop", false, false)] });
  const p = H.planAccompliceRoleHeal({ ...base, masterContext: m });
  assert.equal(p.ok, true); assert.equal(p.demote.name, "Pamela 'Pam' Ridgewood"); assert.equal(p.toRole, "redHerring");
});
t("dual-gender names match either spelling and curly quotes", () => {
  assert.ok(H.sameName("Dr. Victor/Victoria Thorne", "Dr. Victoria Thorne"));
  assert.ok(H.sameName("Pamela ‘Pam’ Ridgewood", "Pamela 'Pam' Ridgewood"));
  assert.ok(!H.sameName("Pam", "Pamela 'Pam' Ridgewood"));
});
t("refuses a slip-style package and a delivered package", () => {
  assert.equal(H.planAccompliceRoleHeal({ ...base, style: "character" }).ok, false);
  assert.equal(H.planAccompliceRoleHeal({ ...base, style: null }).ok, false);
  const d = H.planAccompliceRoleHeal({ ...base, delivered: true }); assert.equal(d.ok, false); assert.match(d.reason, /delivered/);
});
t("refuses zero, one or three accomplice-role characters", () => {
  const set = (roles) => chars.map((c, i) => ({ ...c, role: roles[i] }));
  assert.equal(H.planAccompliceRoleHeal({ ...base, chars: set(["murderer", "redHerring", "redHerring", "redHerring"]) }).ok, false);
  assert.equal(H.planAccompliceRoleHeal({ ...base, chars: set(["murderer", "accomplice", "redHerring", "redHerring"]) }).ok, false);
  assert.equal(H.planAccompliceRoleHeal({ ...base, chars: set(["accomplice", "accomplice", "accomplice", "redHerring"]) }).ok, false);
});
t("refuses when master_context names nobody, two different people, or a character who is neither accomplice-role holder", () => {
  const none = JSON.stringify({ victimProfile: { name: "x" }, wrongedEachCharacter: mcObj().wrongedEachCharacter });
  assert.match(H.planAccompliceRoleHeal({ ...base, masterContext: none }).reason, /names no accomplice/);
  const two = JSON.stringify(mcObj()) + "\n" + JSON.stringify({ accompliceSelection: { character: "Jacqueline 'Jackie' Winthrop" } });
  assert.match(H.planAccompliceRoleHeal({ ...base, masterContext: two }).reason, /more than one accomplice/);
  const stranger = mc({ accompliceSelection: { character: "Sheila Ashworth" } });
  assert.match(H.planAccompliceRoleHeal({ ...base, masterContext: stranger }).reason, /matches 0 of the 2/);
  assert.equal(H.planAccompliceRoleHeal({ ...base, masterContext: "" }).ok, false);
  assert.equal(H.planAccompliceRoleHeal({ ...base, masterContext: "not json {" }).ok, false);
});
t("repeating the same accomplice in two objects is not ambiguous", () => {
  const rep = JSON.stringify(mcObj()) + "\n" + JSON.stringify({ accompliceSelection: { character: "Pamela ‘Pam’ Ridgewood" } });
  assert.equal(H.planAccompliceRoleHeal({ ...base, masterContext: rep }).ok, true);
});
t("refuses when the demoted character has no entry, is marked murderer, or is contradictory", () => {
  const noEntry = mc({ wrongedEachCharacter: [entry("Sheila Ashworth", "true", "false"), entry("Pamela 'Pam' Ridgewood", "false", "false")] });
  assert.match(H.planAccompliceRoleHeal({ ...base, masterContext: noEntry }).reason, /no per-character entry/);
  const murderer = mc({ wrongedEachCharacter: [entry("Pamela 'Pam' Ridgewood", "false", "false"), entry("Jacqueline 'Jackie' Winthrop", "true", "false")] });
  assert.match(H.planAccompliceRoleHeal({ ...base, masterContext: murderer }).reason, /murderer/);
  const both = mc({ wrongedEachCharacter: [entry("Jacqueline 'Jackie' Winthrop", "false", "true"), entry("Jacqueline 'Jackie' Winthrop", "false", "false")] });
  assert.equal(H.planAccompliceRoleHeal({ ...base, masterContext: both }).ok, false);
  const weird = mc({ wrongedEachCharacter: [entry("Jacqueline 'Jackie' Winthrop", "maybe", "false")] });
  assert.equal(H.planAccompliceRoleHeal({ ...base, masterContext: weird }).ok, false);
});
t("every pointform twin is also a regenerated field", () => {
  for (const f of H.POINTFORM_TWINS) assert.ok(H.DETECTIVE_SHEET_FIELDS.includes(f), f);
});

// The safety property: the corrected role never outlives a regeneration that did not come back "fixed".
const swap = { characterId: "c1", from: "accomplice", to: "redHerring" };
const fakeWriter = (failOn) => { const calls = []; return { calls, set: async (id, role) => { calls.push(`${id}:${role}`); return failOn === role ? "boom" : null; } }; };
const asyncT = async (n, fn) => { await fn(); console.log("ok  ", n); };
await asyncT("runWithRoleSwap keeps the new role only when the body reports success", async () => {
  const w = fakeWriter(); const r = await H.runWithRoleSwap(w.set, swap, async () => true);
  assert.deepEqual(r, { fixed: true }); assert.deepEqual(w.calls, ["c1:redHerring"]);
});
await asyncT("runWithRoleSwap puts the old role back when the body reports failure", async () => {
  const w = fakeWriter(); const r = await H.runWithRoleSwap(w.set, swap, async () => false);
  assert.deepEqual(r, { fixed: false }); assert.deepEqual(w.calls, ["c1:redHerring", "c1:accomplice"]);
});
await asyncT("runWithRoleSwap puts the old role back when the body throws, and rethrows", async () => {
  const w = fakeWriter(); await assert.rejects(H.runWithRoleSwap(w.set, swap, async () => { throw new Error("regenerator exploded"); }), /exploded/);
  assert.deepEqual(w.calls, ["c1:redHerring", "c1:accomplice"]);
});
await asyncT("runWithRoleSwap never runs the body when the new role cannot be written, and does not restore", async () => {
  const w = fakeWriter("redHerring"); let ran = false;
  const r = await H.runWithRoleSwap(w.set, swap, async () => { ran = true; return true; });
  assert.equal(ran, false); assert.equal(r.swapError, "boom"); assert.equal(r.fixed, false); assert.deepEqual(w.calls, ["c1:redHerring"]);
});
await asyncT("runWithRoleSwap without a swap just runs the body and writes nothing (every other defect class)", async () => {
  const w = fakeWriter(); const r = await H.runWithRoleSwap(w.set, undefined, async () => false);
  assert.deepEqual(r, { fixed: false }); assert.deepEqual(w.calls, []);
});

console.log("accomplice-heal tests done");
