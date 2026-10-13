// Run: node --experimental-strip-types supabase/functions/review-package-quality/label-conformity.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as L from "./label-conformity.ts";
import { LABELS_BY_CODE } from "./label-tables.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const DA = LABELS_BY_CODE.da;

t("label-tables.ts is generated from header-labels.json (single source of truth)", () => {
  execFileSync("node", ["docs/language-pack/build-label-tables.mjs", "--check"], { stdio: "pipe" });
});

t("every language table has the same 38 keys", () => {
  const keys = Object.keys(LABELS_BY_CODE.es);
  assert.equal(keys.length, 38);
  for (const [code, table] of Object.entries(LABELS_BY_CODE)) assert.deepEqual(Object.keys(table), keys, code);
});

t("German label in a Danish sheet becomes the Danish label (Zur Person, VERBÜNDETE, RIVALEN & FEINDE)", () => {
  const rel = "## DINE RELATIONER\n\n**VERBÜNDETE:**\n\n**Clara Dam** - en kollega.\n\n**RIVALEN & FEINDE:**\n\nIngen.";
  const r = L.conformField("relationships", rel, "da");
  assert.ok(r.text.includes("**ALLIEREDE:**") && r.text.includes("**RIVALER & FJENDER:**"));
  assert.ok(!r.text.includes("VERBÜNDETE") && !r.text.includes("FEINDE"));
  assert.equal(r.edits.length, 2);
  const bg = L.conformField("background", "## KARAKTERHINTERGRUND\n\n**Navn:** Ulla\n\n**Zur Person:**\n- Skarp og kedet.", "da");
  assert.ok(bg.text.includes("## KARAKTERBAGGRUND") && bg.text.includes("**Om personen:**") && bg.text.includes("**Navn:** Ulla"));
});

t("English label (Why This Matters) and the wrong-gender secret header are fixed; the prose after a bold label is kept", () => {
  for (const hdr of ["## DIT HEMMELIGHED", "## DIT HEMMELIGE", "## DIT GEHEIMNIS"]) {
    const r = L.conformField("secret", `${hdr}\n\nJeg har en gæld.\n\n**Why This Matters:** Afsløres den, er jeg færdig.`, "da");
    assert.ok(r.text.startsWith("## DIN HEMMELIGHED\n"), hdr);
    assert.ok(r.text.includes("**Hvorfor det er vigtigt:** Afsløres den, er jeg færdig."));
  }
});

t("slot rule fixes a close wrong-gender or wrong-word variant (SÅ DU ER USKYLDIG) but leaves valid synonyms alone (MEDHJÆLPEREN, ANSKYLDNINGER, SLUTERKLÆRING)", () => {
  const a = L.conformField("round2_innocent", "## RUNDE 2: MOTIVER\n\n**SÅ DU ER USKYLDIG**\n\nJeg ved godt, hvad I tænker.", "da");
  assert.ok(a.text.includes("**HVIS DU ER USKYLDIG**") && !a.text.includes("SÅ DU"));
  const b = L.conformField("round3_accomplice", "## RUNDE 3: METODE\n\n**HVIS DU ER MEDHJÆLPEREN**\n\nNu taler vi.", "da");
  assert.equal(b.edits.length, 0);
  const c = L.conformField("accusations", "## ANSKYLDNINGER\n\n### HVIS DU TRAK SEDDELEN SOM SKYLDIG — TIPS TIL AT LEDE MISTANKEN VÆK\n\n- Spil nervøs.", "da");
  assert.equal(c.edits.length, 0);
  assert.equal(L.conformField("final_guilty", "## SLUTERKLÆRING\n\n**HVIS DU ER SKYLDIG**\n\nNej.", "da").edits.length, 0);
});

t("valid variants are never touched: French space before the colon, capitalisation, a feminine article, Italian ROUND", () => {
  assert.equal(L.conformField("secret", "## TON SECRET\n\n**Pourquoi c'est important :** Texte.", "fr").edits.filter((e) => /important/i.test(e.from)).length, 0);
  assert.equal(L.conformField("final_accomplice", "## DECLARACIÓN FINAL\n\n**SI ERES LA CÓMPLICE**\n\nNo fui yo.", "es").edits.length, 0);
  assert.equal(L.conformField("secret", "## TU SECRETO\n\n**Por Qué Importa:** Texto.", "es").edits.length, 0);
  assert.equal(L.conformField("round2_innocent", "## ROUND 2: MOVENTI\n\n**SE SEI INNOCENTE**\n\nTesto.", "it").edits.length, 0);
});

t("typos of the reveal header are fixed, case-only differences are not", () => {
  for (const h of ["## AFSLÆRINGEN — DIN tilståelse", "## AFSLUTNINGEN — DIN tilståelse"]) {
    const r = L.conformField("reveal_confession_guilty", `${h}\n\nJa. Det var mig.`, "da");
    assert.ok(r.text.startsWith("## AFSLØRINGEN — DIN TILSTÅELSE\n"), h);
  }
  // already this language's wording: only case differs, so it is left alone
  assert.equal(L.conformField("reveal_confession_guilty", "## AFSLØRINGEN — DIN tilståelse\n\nJa.", "da").edits.length, 0);
});

t("round 4 header: LEJLIGHED is not a typo of MULIGHED and is only touched through the slot rule", () => {
  const r = L.conformField("round4_guilty", "## RUNDE 4: LEJLIGHED\n\n**HVIS DU ER SKYLDIG**\n\nJeg stod ved baren.", "da");
  assert.ok(r.text.startsWith("## RUNDE 4: MULIGHED\n"));
});

t("a canonical sheet is left unchanged (idempotent) and prose is never touched", () => {
  const ok = `${DA["## RUNDE 2: MOTIVER" ] ?? "## RUNDE 2: MOTIVER"}\n\n${DA["**IF YOU'RE INNOCENT**"]}\n\nJeg kendte lagerets værdi. **Vigtigt:** Det er sandt.\n\nDette er en lang linje der slet ikke er en overskrift.`;
  const r = L.conformField("round2_innocent", ok, "da");
  assert.equal(r.edits.length, 0); assert.equal(r.text, ok);
  const again = L.conformField("round2_innocent", L.conformField("round2_innocent", "## RUNDE 2: MOTIVER\n\n**SÅ DU ER USKYLDIG**\n\nTekst.", "da").text, "da");
  assert.equal(again.edits.length, 0);
});

t("lines carrying a cast name placeholder or a name are never classified", () => {
  const txt = "## RYGTER AT SPREDE\n\n**I rygtefasen skal du dele disse stykker sladder om andre karakterer:**\n\n1. **Om Kaptajn Brandt:** 'Han var væk.'\n\n**Til Agnes Munk:** 'Hvor var du?'";
  const r = L.conformField("rumors", txt, "da");
  assert.equal(r.edits.length, 0);
});

t("a language without a table, or an unknown one, is a no-op (English packages never change)", () => {
  assert.equal(L.conformField("background", "## CHARACTER BACKGROUND\n\n**Who they are:**", "fi").edits.length, 0);
  assert.equal(L.conformField("background", "## CHARACTER BACKGROUND\n\n**Who they are:**", "en").edits.length, 0);
  assert.equal(L.conformPackage([{ id: "1", character_name: "A", background: "## CHARACTER BACKGROUND" }], "en").total, 0);
});

t("English leak in a Spanish sheet and German leak in a Dutch sheet", () => {
  const es = L.conformField("final_guilty", "## FINAL STATEMENT\n\n**IF YOU'RE GUILTY**\n\nNo fui yo.", "es");
  assert.ok(es.text.startsWith("## DECLARACIÓN FINAL\n\n**SI ERES CULPABLE**"));
  const nl = L.conformField("relationships", "## JOUW RELATIES\n\n**VERBÜNDETE:**\n\nGeen.", "nl");
  assert.ok(nl.text.includes("**BONDGENOTEN:**"));
});

t("conformPackage reports per character and counts edits", () => {
  const rows = [
    { id: "a", character_name: "A", relationships: "## DINE RELATIONER\n\n**VERBÜNDETE:**\n\nIngen.", secret: "## DIN HEMMELIGHED\n\nHemmelig." },
    { id: "b", character_name: "B", secret: "## DIT HEMMELIGE\n\nHemmelig.", introduction: "## RUNDE 1: DIN INTRODUKTION\n\n**Læs dette højt, når du præsenterer dig:**\n\nHej." },
  ];
  const r = L.conformPackage(rows, "da");
  assert.equal(r.total, 2);
  assert.deepEqual(r.changes.map((c) => c.name), ["A", "B"]);
  assert.ok(r.changes[1].fields.secret.startsWith("## DIN HEMMELIGHED"));
});

console.log("label-conformity tests passed");
