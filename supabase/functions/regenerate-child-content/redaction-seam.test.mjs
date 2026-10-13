// Run: node --experimental-strip-types supabase/functions/regenerate-child-content/redaction-seam.test.mjs   (npm run test:childctx)
// ADR-0156 Phase 3. regenerate-child-content is Deno code that cannot be imported under Node, so the behaviour of the seam (switch, fallback, culprit,
// blank-safety) is tested in _shared/childContext.test.mjs through inputsForRegeneration. THIS file is the tripwire for the wiring: it fails if the
// call site stops using that function, passes the full design to the prompt again, or lets a redacted character see the others' roles.
import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("./index.ts", import.meta.url), "utf8");
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok  ", name); };
const count = (re) => (src.match(re) ?? []).length;

t("imports the shared seam", () => assert.match(src, /import \{ inputsForRegeneration, parseMode \} from "\.\.\/_shared\/childContext\.ts";/));
t("reads the kill switch from pipeline_settings and treats a failed read as off (parseMode)", () => {
  assert.match(src, /\.eq\("key", "child_context_redaction"\)/);
  assert.match(src, /return parseMode\(/);
});
t("the prompt gets the seam's design and transcript, never the stored ones", () => {
  assert.match(src, /masterContext: redaction\.masterContext, character,/);
  assert.match(src, /buildConversationExcerpt\(redaction\.transcript, character\.character_name\)/);
  assert.equal(count(/masterContext: masterContextStr/g), 1, "masterContextStr may only be handed to inputsForRegeneration");
  assert.equal(count(/buildConversationExcerpt\(pkg\.user_conversation/g), 0, "the raw transcript must not reach the prompt");
});
t("the seam is given the per-character inputs, the stored role and the kill-switch mode", () => {
  const call = src.slice(src.indexOf("inputsForRegeneration({"), src.indexOf("inputsForRegeneration({") + 400);
  for (const part of ["mode: redactionMode", "isTest: is_test", "mysteryStyle: pkg.mystery_style", "storedRole: character.character_role", "characterName: character.character_name"]) assert.ok(call.includes(part), part);
});
t("a redacted character is not shown the other characters' roles", () => assert.match(src, /character_role: redaction\.prep\.redacted \? null : c\.character_role/));
t("a fallback is logged as a child_context row", () => assert.match(src, /if \(redaction\.prep\.fallback\) \{\s*await logRow\(\{\s*package_id, defect_class: "child_context"/));
t("the full design string has no other consumer in this file", () => {
  const lines = src.split("\n").filter((l) => /\bpkg\.master_context\b/.test(l));
  assert.equal(lines.length, 2, lines.join("\n"));
  assert.ok(lines[0].includes("if (!pkg.master_context) throw"));
  assert.ok(lines[1].includes("const masterContextStr = "));
});
console.log(`\n${passed} tests passed`);
