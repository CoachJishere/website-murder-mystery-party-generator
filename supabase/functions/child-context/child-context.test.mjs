// Run: node --experimental-strip-types supabase/functions/child-context/child-context.test.mjs   (npm run test:childctx)
// ADR-0156 Phase 3: the request path of the child-context edge function (auth, parsing, switch, fallbacks, logging) with every dependency faked.
import assert from "node:assert/strict";
import { handleChildContext } from "./handler.ts";
import { BODY_SEPARATOR } from "../_shared/childContext.ts";

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("ok  ", name); };

const PID = "178de25c-d7b8-4e02-9210-4e63298614e9";
const KEY = "k".repeat(48);
const CAST = ["Vivian Calloway", "Harry Dunmore", "Theo/Thea Baptiste", "Dr. Felicity Hartmann", "Marcus Finch", "Simone Delacroix"];
const pad = (who) => `${who} was wronged by Reginald in a way only this character knows about, in detail. `.repeat(4).trim();
const mc = (over = {}) => JSON.stringify({
  mysteryStyle: "detective", ...over.p1,
  murdererSelection: { character: "Simone Delacroix" },
  relationshipMatrix: "| | a |\n|---|---|\n| a | - |",
  victimProfile: { name: "Reginald Ashworth", role: "The magnate of the Silver Train and everyone's debts", powerSource: "He held the debts of half the dining car and enjoyed it.", personality: "Jovial in public, ruthless in private, forgetful of nothing.", wrongedEachCharacter: CAST.map((c) => ({ character: c, howVictimWrongedThem: pad(c), motiveStrength: "x", isMurderer: c === "Simone Delacroix" ? "true" : "false" })) },
  murderMethod: { weapon: "Poison in a brandy glass served during the first toast in the dining car.", execution: "SECRET-EXECUTION-TEXT" },
  conversationDetailsExtraction: { characterSpecificDetails: CAST.map((c) => ({ character: c, backgroundDetails: pad(c), threatsOrPressures: pad(c) })) },
}) + "\n" + JSON.stringify({ timelineFramework: { gatheringStarted: "Guests boarded at seven in the evening and the train left at once.", specificEvents: "Dinner began at eight and the toast was raised at nine fifteen.", murdererAlibiGap: "SECRET-GAP-TEXT" }, hostBriefing: { solution: "SECRET-HOST" } });
const body = (name, excerpt = "", conv = "User: hello\nAI: hi") => [PID, name, excerpt, conv].join(BODY_SEPARATOR);
const req = (b, { key = KEY, method = "POST" } = {}) => new Request("http://x/child-context", { method, headers: key === null ? {} : { "x-child-context-key": key }, body: method === "POST" ? b : undefined });

function mkDeps(over = {}) {
  const calls = { fallback: [], alert: [], log: [], isTest: 0, mode: 0 };
  const deps = {
    expectedKey: KEY,
    async loadPackage() { return { master_context: mc(), mystery_style: "detective", conversation_id: "c1" }; },
    async loadIsTest() { calls.isTest++; return false; },
    async loadMode() { calls.mode++; return "on"; },
    async logFallback(p, a) { calls.fallback.push([p, a]); },
    async alert(p, r, d) { calls.alert.push([p, r, d]); },
    log(l) { calls.log.push(l); },
    ...over,
  };
  return { deps, calls };
}
const run = async (b, o, d) => { const { deps, calls } = mkDeps(d); const res = await handleChildContext(req(b, o), deps); return { res, calls, json: await res.json().catch(() => null) }; };

await t("only POST is served", async () => { const { res } = await run("", { method: "GET" }); assert.equal(res.status, 405); });
await t("no configured secret: 503, nothing is served", async () => { const { res } = await run(body("Vivian Calloway"), {}, { expectedKey: undefined }); assert.equal(res.status, 503); });
await t("a missing, wrong, shorter or longer key is 401 and the package is never loaded", async () => {
  let loaded = 0;
  for (const key of [null, "", "wrong", KEY.slice(1), KEY + "x", "eyJhbGciOiJIUzI1NiJ9.anon-key-like.sig"]) {
    const { res } = await run(body("Vivian Calloway"), { key }, { async loadPackage() { loaded++; return null; } });
    assert.equal(res.status, 401, String(key));
  }
  assert.equal(loaded, 0);
});
await t("a bad body is 400, an unknown package 404", async () => {
  assert.equal((await run("garbage")).res.status, 400);
  assert.equal((await run(body("Vivian Calloway"), {}, { async loadPackage() { return null; } })).res.status, 404);
});
await t("a lookup failure is a 500 (Make then keeps its full inputs: it only uses redacted:true)", async () => {
  const { res, json } = await run(body("Vivian Calloway"), {}, { async loadPackage() { throw new Error("db down"); } });
  assert.equal(res.status, 500); assert.equal(json.redacted, undefined);
});

await t("switch off: 200, redacted false, no text, no log row, no alert", async () => {
  const { res, json, calls } = await run(body("Vivian Calloway"), {}, { async loadMode() { return "off"; } });
  assert.equal(res.status, 200);
  assert.deepEqual([json.redacted, json.context, json.excerpt, json.chat, json.fallback, json.mode], [false, null, null, null, null, "off"]);
  assert.equal(calls.fallback.length + calls.alert.length, 0);
});
await t("an unset or unknown switch value is off", async () => {
  for (const v of [null, "", "yes", "ON "]) { const { json } = await run(body("Vivian Calloway"), {}, { async loadMode() { return v; } }); assert.equal(json.redacted, false); assert.equal(json.mode, "off"); }
});
await t("on: an innocent gets the slice and the secrets are not in the response", async () => {
  const { json } = await run(body("Vivian Calloway", "User: Vivian Calloway?", "User: hi"));
  assert.equal(json.redacted, true); assert.equal(json.role, "suspect");
  assert.ok(json.context.includes("Vivian Calloway was wronged"));
  for (const s of ["SECRET-EXECUTION-TEXT", "SECRET-GAP-TEXT", "SECRET-HOST", "Harry Dunmore was wronged"]) assert.ok(!json.context.includes(s), s);
  assert.equal(json.chat, "User: hi");
});
await t("on: the murderer gets redacted:false (Make keeps the full design)", async () => {
  const { json, calls } = await run(body("Simone Delacroix"));
  assert.equal(json.redacted, false); assert.equal(json.role, "murderer"); assert.equal(json.context, null); assert.equal(calls.fallback.length, 0);
});
await t("test_only: the is_test lookup happens only in that mode", async () => {
  const a = await run(body("Vivian Calloway"), {}, { async loadMode() { return "test_only"; } });
  assert.equal(a.json.redacted, false); assert.equal(a.calls.isTest, 1);
  const b = await run(body("Vivian Calloway"), {}, { async loadMode() { return "test_only"; }, async loadIsTest() { return true; } });
  assert.equal(b.json.redacted, true);
  const c = await run(body("Vivian Calloway"));
  assert.equal(c.calls.isTest, 0);
});

await t("a fallback is logged AND alerted, keeps the full inputs, and says why", async () => {
  const { json, calls } = await run(body("Zelda Renamed"));
  assert.equal(json.redacted, false); assert.equal(json.fallback, "own-entry-not-found"); assert.equal(json.context, null);
  assert.equal(calls.fallback.length, 1); assert.match(calls.fallback[0][1], /^fallback:own-entry-not-found:Zelda Renamed/);
  assert.equal(calls.alert.length, 1); assert.equal(calls.alert[0][1], "own-entry-not-found");
});
await t("an intrigue package is logged but does not alert", async () => {
  const { json, calls } = await run(body("Vivian Calloway"), {}, { async loadPackage() { return { master_context: mc({ p1: { mysteryType: "intrigue" } }), mystery_style: "detective", conversation_id: null }; } });
  assert.equal(json.fallback, "unsupported-intrigue"); assert.equal(calls.fallback.length, 1); assert.equal(calls.alert.length, 0);
});
await t("a null or garbage master_context is an alerted fallback, never a blank or a 500", async () => {
  for (const master_context of [null, "", "{broken"]) {
    const { res, json, calls } = await run(body("Vivian Calloway"), {}, { async loadPackage() { return { master_context, mystery_style: "detective", conversation_id: null }; } });
    assert.equal(res.status, 200); assert.equal(json.redacted, false); assert.equal(json.fallback, "unreadable-design"); assert.equal(calls.alert.length, 1);
  }
});
await t("a failing log or alert dependency never changes the answer", async () => {
  const { res, json } = await run(body("Zelda Renamed"), {}, { async logFallback() { throw new Error("log down"); }, async alert() { throw new Error("mail down"); } });
  assert.equal(res.status, 200); assert.equal(json.redacted, false); assert.equal(json.fallback, "own-entry-not-found");
});
await t("customer text is never written to the log", async () => {
  const { calls } = await run(body("Vivian Calloway", "User: UNIQUE-CHAT-MARKER about Vivian Calloway", "User: UNIQUE-CHAT-MARKER"));
  assert.ok(calls.log.length > 0);
  for (const line of calls.log) for (const s of ["UNIQUE-CHAT-MARKER", "was wronged by Reginald", "SECRET-"]) assert.ok(!line.includes(s), `${s} in: ${line}`);
});

console.log(`\n${passed} tests passed`);
