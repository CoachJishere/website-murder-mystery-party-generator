// Run: node --experimental-strip-types supabase/functions/review-package-quality/doc-probe.test.mjs
import assert from "node:assert/strict";
import * as P from "./doc-probe.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };

t("digestSheet clips every part and prefers the innocent fields, falling back by name", () => {
  const long = "x".repeat(2000);
  const d = P.digestSheet({ character_name: "Willy Belladonna", character_role: "accomplice", secret: long, round4_script: long, final_statement: "Short final.", reveal_confession_guilty: long }, "c".repeat(900));
  assert.equal(d.name, "Willy Belladonna"); assert.equal(d.role, "accomplice");
  assert.equal(d.secret.length, 600); assert.equal(d.round4.length, 700); assert.equal(d.final, "Short final."); assert.equal(d.confession.length, 500); assert.equal(d.canon.length, 600);
  const slip = P.digestSheet({ character_name: "A", round4_innocent: "I stood by the door.", final_innocent: "Not me.", final_guilty: "It was me." }, "");
  assert.equal(slip.round4, "I stood by the door."); assert.equal(slip.final, "Not me."); assert.equal(slip.confession, "It was me.");
  assert.equal(P.digestSheet({}, "").name, "");
});

t("docPromptText lists only non-empty documents in the fixed order and one block per character", () => {
  const digests = [P.digestSheet({ character_name: "Zoya", character_role: "murderer", secret: "You swapped the glass." }, "canon z"), P.digestSheet({ character_name: "Willy", character_role: "accomplice" }, "")];
  const txt = P.docPromptText({ evidence_cards: "CARD", detective_script: "SCRIPT", game_overview: "  " }, digests);
  assert.ok(txt.indexOf("DOCUMENT: detective_script") < txt.indexOf("DOCUMENT: evidence_cards"));
  assert.ok(!txt.includes("DOCUMENT: game_overview"));
  assert.ok(txt.includes("--- Zoya (murderer) ---") && txt.includes("CANON: canon z") && txt.includes("--- Willy (accomplice) ---"));
  assert.ok(!txt.includes("CONFESSION:"));
  assert.ok(P.docPromptText({ detective_script: "S" }, [P.digestSheet({ character_name: "G", final_guilty: "Me." }, "")]).includes("CONFESSION: Me."));
});

t("instructions name the fields, the by-design reveal and the conservative rule; isDocField is exact", () => {
  for (const k of ["detective_script", "game_overview", "evidence_cards", "by design", "when in doubt, do not report", "exactly once", "own what you have already admitted"]) assert.ok(P.DOC_INSTRUCTIONS.includes(k), k);
  assert.equal(P.isDocField("detective_script"), true); assert.equal(P.isDocField("materials"), false); assert.equal(P.isDocField("secret"), false);
  assert.ok(P.estimateTokens({ detective_script: "word ".repeat(1000) }, []) > 1500);
});
console.log("doc-probe tests passed");
