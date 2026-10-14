// Run: node --experimental-strip-types supabase/functions/auto-remediate-packages/partner-tip.test.mjs
import assert from "node:assert/strict";
import { aliasesFor, namesPartner, healPartnerTips, GENERIC_FOR_CULPRIT, GENERIC_FOR_ACCOMPLICE } from "./partner-tip.ts";

const t = (name, fn) => { fn(); console.log("ok  ", name); };
const cast = ["Katcey Musgrats", "Dolly Pawton", "Catboy Carter", "Martie 'Tabby' Maguire", "Joe Don 'Tomcat' Rooney", "Jay DeMeowcus",
  "Willie Meowlson", "Tracy Catman", "Maren Meowis", "Faith Hill & Tim Mc Whiskers", "Meowtina McBride", "Sapphire Knight/Sebastian Knight", "Gary LeChat", "Natalie Maine-coon"];

t("aliases", () => {
  assert.deepEqual(aliasesFor("Faith Hill & Tim Mc Whiskers"), ["Faith Hill & Tim Mc Whiskers", "Faith", "Tim Mc Whiskers"]);
  assert.deepEqual(aliasesFor("Sapphire Knight/Sebastian Knight"), ["Sapphire Knight", "Sapphire"]);
  assert.deepEqual(aliasesFor("Katcey Musgrats"), ["Katcey Musgrats", "Katcey"]);
});

// The real bullets from "Emma's Honky Tonk Meow-der Mystery" (2026-10-09) that were hand-fixed on 2026-10-14
const real = [
  ["Katcey Musgrats", "- Let Maren stay close and back up your story. Never turn on her, and never let on that she knows more. Deflect toward others if pressed.", true],
  ["Dolly Pawton", "- Lean on Willie as your easy, trusted ally. Let her unbothered presence back up your story, but never over-explain, and never turn on her.", true],
  ["Catboy Carter", "- Lean on your accomplice, Tracy Catman, for quiet backup. Never turn on her, and never let your cool crack under pressure.", true],
  ["Jay DeMeowcus", "- Back Joe Don's version of events and keep your own story simple. Protect my accomplice, and never turn on them.", true],
  ["Willie Meowlson", "- Dolly is your partner. Back her up and keep her out of the spotlight, and never turn on her.", true],
  ["Maren Meowis", "- If pressed, stay calm and tired, not nervous. Say wanting her quiet is not the same as making it happen. Never name Katcey Musgrats or point at her, and quietly back her up if anyone does.", true],
  ["Meowtina McBride", "- Protect Faith Hill & Tim Mc Whiskers. Never accuse them, and back up their story if anyone presses them.", true],
  ["Kelsea Catterini", "- Do not look at Catville Peck when suspicion comes up. Your accomplice protects you, so let them speak up and never turn on them.", false],
];
for (const [owner, line, expect] of real) {
  t(`real bullet ${owner}`, () => { assert.equal(namesPartner(line, owner, cast), expect); });
}
t("Katcey: 'Let Maren stay close and back up your story' is flagged (the one the reviewer caught)", () => assert.equal(namesPartner(real[0][1], "Katcey Musgrats", cast), true));
t("Gary: 'Let Natalie back you up' is flagged too (a named backup is the same class)", () => assert.equal(namesPartner("- Let Natalie back you up. Never turn on her, and keep your story the same.", "Gary LeChat", cast), true));
t("Kelsea: Catville not in this cast, so nothing to flag", () => assert.equal(namesPartner(real[7][1], "Kelsea Catterini", [...cast, "Kelsea Catterini"]), false));

t("conditional is not flagged", () => {
  assert.equal(namesPartner("- If George is your accomplice, never name him as suspicious. Lean on his calm.", "Catsy Cline", [...cast, "George Straitwhiskers"]), false);
  assert.equal(namesPartner("- If accomplice is Sapphire, don't let suspicion land on her", "Gary LeChat", cast), false);
});
t("own name never counts", () => assert.equal(namesPartner("- Protect Dolly at all costs.", "Dolly Pawton", cast), false));
t("steering suspicion toward a name is fine", () => assert.equal(namesPartner("- Steer attention to Maren and Willie, who drifted away.", "Gary LeChat", cast), false));

t("heal: replaces only the offending sentence", () => {
  const text = "## ACCUSATIONS\n\n### IF YOU DREW THE GUILTY/CULPRIT SLIP — DEFLECTION TIPS\n\n- Point out that every guest wears boots.\n" + real[5][1];
  const r = healPartnerTips(text, "Maren Meowis", [...cast, "Maren Meowis"]);
  // owner Maren: the bullet names Katcey Musgrats
  assert.equal(r.changed, true);
  assert.ok(r.text.includes("Point out that every guest wears boots."));
  assert.ok(r.text.includes("If pressed, stay calm and tired, not nervous. Say wanting her quiet is not the same as making it happen."));
  assert.ok(r.text.includes(GENERIC_FOR_CULPRIT));
  assert.ok(!r.text.includes("Katcey"));
  assert.equal(namesPartner(r.text.split("\n").pop(), "Maren Meowis", cast), false);
});
t("heal: accomplice block gets the culprit-facing sentence", () => {
  const text = "### IF YOU DREW THE ACCOMPLICE SLIP\n\n- Protect Joe Don. Never accuse or hint at him.";
  const r = healPartnerTips(text, "Jay DeMeowcus", cast);
  assert.equal(r.changed, true);
  assert.ok(r.text.includes(GENERIC_FOR_ACCOMPLICE));
  assert.ok(!r.text.includes("Joe Don"));
});
t("heal: two flagged sentences collapse to one generic", () => {
  const r = healPartnerTips("- Protect Willie. Never accuse Willie. Keep your story short.", "Dolly Pawton", cast);
  assert.equal(r.text, `- ${GENERIC_FOR_CULPRIT} Keep your story short.`);
});
t("heal: clean text is untouched", () => {
  const text = "- Point out that every guest wears boots.\n- Steer attention to Maren.";
  const r = healPartnerTips(text, "Gary LeChat", cast);
  assert.equal(r.changed, false);
  assert.equal(r.text, text);
});
t("heal: later sentences about the removed partner (him/her) are dropped", () => {
  const r = healPartnerTips("- Lean on Willie for backup. Let her back up your story only if she chooses to. Keep your account vague.", "Dolly Pawton", cast);
  assert.equal(r.text, `- ${GENERIC_FOR_CULPRIT} Keep your account vague.`);
});
