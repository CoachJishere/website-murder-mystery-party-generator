// Run: node --experimental-strip-types supabase/functions/review-package-quality/mode-whitelist.test.mjs
// ADR-0167 lesson: a mode handled in the serve() body but missing from the `mode` ternary falls through to the default (paid) sweep and returns an empty result.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const t = (n, fn) => { fn(); console.log("ok  ", n); };
const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const start = src.indexOf("serve(async (req)");
const body = src.slice(start);
const ternary = body.split("\n").find((l) => l.includes("const mode ="));

t("every mode handled in serve() is named in the mode whitelist line", () => {
  assert.ok(start > 0 && ternary, "found serve() and the mode line");
  const handled = [...new Set([...body.matchAll(/\bmode === "([a-z_0-9]+)"/g)].map((m) => m[1]))].filter((m) => !["off", "report"].includes(m));
  assert.ok(handled.length >= 15, `expected many handled modes, saw ${handled.length}`);
  const missing = handled.filter((m) => !ternary.includes(`"${m}"`));
  assert.deepEqual(missing, [], `handled but not whitelisted (would fall through to the default sweep): ${missing.join(", ")}`);
});

t("pub_probe is handled, whitelisted, and paid only with paid:true", () => {
  assert.ok(ternary.includes('"pub_probe"'));
  assert.ok(/dryRun: body\.paid !== true/.test(body.slice(body.indexOf('mode === "pub_probe"'))));
});

t("the second pass runs +pub behind its own switch and is a no-op when it errors", () => {
  assert.ok(/setting\("review_pub_probe", "on"\)/.test(src));
  assert.ok(/pub probe failed \(ignored\)/.test(src));
});

t("a replay (overrides or only) never stores findings", () => {
  const fn = src.slice(src.indexOf("async function pubProbe"), src.indexOf("async function leakProbe"));
  assert.ok(/opts\.write && !opts\.overrides && !opts\.only\?\.length/.test(fn));
});

console.log("mode-whitelist tests passed");
