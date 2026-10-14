// Run: node --experimental-strip-types supabase/functions/_shared/packageScaffold.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { SCAFFOLD_BY_CODE } from "./packageScaffoldTables.ts";
import { localizeScaffoldField, detectScaffoldLanguage, roundNumberOf, SCAFFOLD_LANGUAGES, absentHostNote, languageOfMasterContext } from "./packageScaffold.ts";
import { sealDetectiveScript } from "../../../src/utils/hostSeal.ts";
import { playerFacingEvidence, parseEvidenceCards } from "../../../src/utils/evidenceCardUtils.ts";
import { printedEvidenceText } from "../review-package-quality/review-core.ts";
import { extractCard } from "../auto-remediate-packages/evidence-card.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const tj = JSON.parse(fs.readFileSync("docs/language-pack/scaffold-labels.json", "utf8"));

const SCRIPT = `## DETECTIVE SCRIPT

## NOTE FOR HOST

These scripts can be delivered in two ways:

- **Read aloud by the host** (if the host is playing the detective character)
- **Pre-recorded as audio files** that are played during the game

## RECORDING GUIDELINES FOR AUDIO OPTION

- Record each section as a separate file
- Use a clear, dramatic voice appropriate for the mystery theme
- Include 2-3 second pauses between major points
- Suggested file names: opening.mp3, round1-intro.mp3, round2-intro.mp3, round3-intro.mp3, round4-intro.mp3, accusations.mp3, reveal.mp3
- Free audio creation tools: [Google AI Studio Generate Speech](https://aistudio.google.com/generate-speech) or [Google NotebookLM](https://notebooklm.google.com) Audio Overview
- When generating audio, skip the [bracketed stage directions]

---

## DETECTIVE BACKSTORY

L'inspecteur Delorme a été appelé en pleine nuit.

---

## OPENING STATEMENT

*[Read this when guests are gathered, before Round 1. Lower music if any. Speak slowly with weight.]*

Mesdames et messieurs, bonsoir.

*[Proceed immediately into Round 1 — there is no break here.]*

---

## ROUND 1: INTRODUCTIONS & RUMORS

*[Read immediately after the opening statement — flow straight in, no pause.]*

Commençons.

*[The detective now steps back. Invite the guests to introduce themselves and trade rumors amongst one another, then reconvene for the next round.]*

---

## ROUND 2: MOTIVES

*[Present the evidence when cued below — don't reveal it before this point.]*

Voici ce que mes hommes ont trouvé. *[Present Round 2 Evidence]*

*[The detective steps back. Let the guests question one another about motives, then reconvene.]*

---

## ROUND 3: METHOD

*[Present the evidence when cued below — don't reveal it before this point.]*

*[The detective steps back. Let the guests press one another on the method, then reconvene.]*

---

## ROUND 4: OPPORTUNITY

*[Present the evidence when cued below — don't reveal it before this point.]*

*[The detective steps back. Let the guests pin down alibis and opportunity, then reconvene for the accusations.]*

---

## ACCUSATIONS

*[Read after Round 4 discussion winds down.]*

*[Going around the group, each player in turn accuses another with one-sentence reasoning. Hold defenses for the next round. Tally the accusations.]*

---

## FINAL STATEMENTS

*[Read after every player has made their accusation.]*

*[Each player, in turn, defends themselves and makes their final statement.]*

---

## THE REVEAL

*[After all final statements. Build the moment.]*

Le silence est retombé.

*[The murderer (player) reads their confession aloud.]*

Justice est faite.
`;

const EVIDENCE = `## EVIDENCE CARDS

*Display these one per round during the game. Each card pairs with one forensic image.*

## EVIDENCE: ROUND 2

### La boîte vidée sous le lit

#### DESCRIPTION
Une vieille boîte de métal rouillée.

#### SIGNIFICANCE (Host Only)
Quelqu'un qui connaissait la boîte l'a fouillée. Le coupable est Max.

## EVIDENCE: ROUND 3

### La corde du puits

#### DESCRIPTION
Une corde fine.

#### SIGNIFICANCE (Host Only)
Le coupable est Max.

## EVIDENCE: ROUND 4

### La caméra

#### DESCRIPTION
Cinquante-trois minutes de champ.

#### SIGNIFICANCE (Host Only)
Le coupable est Max.
`;

t("scaffold tables are generated from scaffold-labels.json (single source of truth)", () => {
  execFileSync("node", ["docs/language-pack/build-scaffold-tables.mjs", "--check"], { stdio: "pipe" });
});

t("all 12 languages carry every key, and no value is empty or left in English", () => {
  assert.deepEqual(SCAFFOLD_LANGUAGES.sort(), ["da", "de", "es", "fi", "fr", "it", "ja", "ko", "nl", "pt", "sv", "zh-cn"]);
  const probe = Object.values(tj.languages)[0];
  for (const [name, tb] of Object.entries(tj.languages)) {
    for (const sect of ["headers", "lines", "directions"]) {
      assert.deepEqual(Object.keys(tb[sect]), Object.keys(probe[sect]), `${name} ${sect} keys`);
      for (const [k, v] of Object.entries(tb[sect])) {
        assert.ok(v && v.trim().length > 0, `${name} ${sect} empty: ${k}`);
        if (sect !== "lines" && !["ACCUSATIONS", "DESCRIPTION"].includes(k)) assert.notEqual(v, k, `${name} ${sect} not translated: ${k}`);
      }
    }
    assert.ok(tb.cue.includes("{n}"), `${name} cue has {n}`);
    // The file names, URLs and product names must survive.
    const rec = Object.entries(tb.lines).find(([k]) => k.includes("Suggested file names"))[1];
    assert.ok(rec.includes("round1-intro.mp3") && rec.includes("reveal.mp3"), `${name} file names`);
    const tools = Object.entries(tb.lines).find(([k]) => k.includes("Free audio creation tools"))[1];
    assert.ok(tools.includes("https://aistudio.google.com/generate-speech") && tools.includes("https://notebooklm.google.com") && tools.includes("Audio Overview"), `${name} links`);
    assert.ok(Object.entries(tb.lines).find(([k]) => k.includes("skip the [bracketed"))[1].includes("["), `${name} keeps a bracketed phrase`);
  }
});

t("French detective script: every template line is localized, prose and file names are untouched, wrappers are kept", () => {
  const r = localizeScaffoldField("detective_script", SCRIPT, "fr");
  assert.ok(r.edits.length >= 36, `edits ${r.edits.length}`);
  for (const gone of ["## NOTE FOR HOST", "RECORDING GUIDELINES", "## ROUND 2: MOTIVES", "## THE REVEAL", "Read aloud by the host", "Let the guests", "[Present Round 2 Evidence]", "Record each section"]) {
    assert.ok(!r.text.includes(gone), `still English: ${gone}`);
  }
  assert.ok(r.text.includes("## NOTE POUR L'HÔTE"));
  assert.ok(r.text.includes("## MANCHE 2 : MOTIFS"));
  assert.ok(r.text.includes("## LA RÉVÉLATION"));
  assert.ok(r.text.includes("# DETECTIVE") === false && r.text.startsWith("## SCRIPT DU DÉTECTIVE"));
  assert.ok(r.text.includes("*[Présentez l'indice au moment indiqué ci-dessous ; ne le révélez pas avant.]*"));
  assert.ok(r.text.includes("Voici ce que mes hommes ont trouvé. *[Présenter l'indice de la Manche 2]*"));
  assert.ok(r.text.includes("L'inspecteur Delorme a été appelé en pleine nuit."));
  assert.ok(r.text.includes("opening.mp3, round1-intro.mp3"));
  assert.deepEqual(r.unmatched, []);
});

t("idempotent: a second run changes nothing", () => {
  for (const code of SCAFFOLD_LANGUAGES) {
    const a = localizeScaffoldField("detective_script", SCRIPT, code);
    const b = localizeScaffoldField("detective_script", a.text, code);
    assert.equal(b.text, a.text, code);
    assert.equal(b.edits.length, 0, code);
    const e = localizeScaffoldField("evidence_cards", EVIDENCE, code);
    assert.equal(localizeScaffoldField("evidence_cards", e.text, code).edits.length, 0, code);
  }
});

t("English or unknown language: nothing changes", () => {
  assert.equal(localizeScaffoldField("detective_script", SCRIPT, "en").text, SCRIPT);
  assert.equal(localizeScaffoldField("detective_script", SCRIPT, "xx").text, SCRIPT);
  assert.equal(localizeScaffoldField("detective_script", "", "fr").text, "");
});

t("already localized wording in any form is left alone (valid but different wording)", () => {
  const own = "## RONDA 2: MOTIVOS\n\n*[Presente la evidencia cuando se indique abajo — no la revele antes de este punto.]*\n\n- Al generar el audio, omitan las [indicaciones entre corchetes]\n";
  const r = localizeScaffoldField("detective_script", own, "es");
  assert.equal(r.text, own);
});

t("mixed 'ROUND 2: MOVENTI' header and the investigator variant", () => {
  const r = localizeScaffoldField("detective_script", "## ROUND 2: MOVENTI\n\n## INVESTIGATOR SCRIPT\n\n*[The investigator steps back. Let the guests question one another about motives, then reconvene.]*\n- **Read aloud by the host** (if the host is playing the investigator character)\n", "it");
  assert.ok(r.text.includes("## TURNO 2: MOVENTI"));
  assert.ok(r.text.includes("## COPIONE DEL DETECTIVE"));
  assert.ok(r.text.includes("*[Il detective si fa da parte."));
  assert.ok(r.text.includes("- **Letti ad alta voce dall'ospite**"));
});

t("bracket-only stage direction (no asterisks) and indented bullets keep their shape", () => {
  const r = localizeScaffoldField("detective_script", "[After all final statements. Build the moment.]\n  - Record each section as a separate file\n", "de");
  assert.ok(r.text.startsWith("[Nach allen Schlusserklärungen. Baue die Spannung auf.]"));
  assert.ok(r.text.includes("  - Nimm jeden Abschnitt als separate Datei auf"));
});

t("a field stored with literal \\n sequences is handled and stays in that form", () => {
  const esc = EVIDENCE.split("\n").join("\\n");
  const r = localizeScaffoldField("evidence_cards", esc, "de");
  assert.ok(!r.text.includes("\n") && r.text.includes("## BEWEISKARTEN\\n"));
  assert.ok(r.text.includes("#### BESCHREIBUNG") && r.text.includes("BEDEUTUNG (nur für den Gastgeber)"));
});

t("Game Overview heading, and the card legend only in the evidence field", () => {
  assert.ok(localizeScaffoldField("game_overview", "## Game Overview\n\nCe soir...", "fr").text.startsWith("## Aperçu du jeu\n"));
  assert.equal(localizeScaffoldField("game_overview", "## Game Overview\n", "fr").edits.length, 1);
  const mangled = "*Display these one por round during the game. Each card pairs with one forensic image.*";
  assert.ok(localizeScaffoldField("evidence_cards", mangled, "es").text.startsWith("*Muestra estas tarjetas"));
  assert.equal(localizeScaffoldField("detective_script", mangled, "es").text, mangled);
});

t("a card title that happens to contain 'Description' or a round word is not a heading to translate", () => {
  const r = localizeScaffoldField("evidence_cards", "### Description of the ledger\n\n#### DESCRIPTION\nText\n", "es");
  assert.ok(r.text.includes("### Description of the ledger") && r.text.includes("#### DESCRIPCIÓN\nText"));
});

// ---------------------------------------------------------------------------------------------------------------------------------
// The consumers that read these markers must keep working on every language (a miss would leak a host-only note or break the images).
// ---------------------------------------------------------------------------------------------------------------------------------
for (const code of SCAFFOLD_LANGUAGES) {
  t(`[${code}] seal: the localized reveal heading is found and "accusations and resolution" is not a reveal`, () => {
    const s = localizeScaffoldField("detective_script", SCRIPT, code).text;
    const sealed = sealDetectiveScript(s);
    assert.equal(sealed.found, true, "reveal found");
    assert.ok(sealed.sealed.includes("Le silence est retombé."), "sealed part starts at the reveal");
    assert.ok(!sealed.open.includes("Le silence est retombé."), "open part ends before the reveal");
    assert.ok(sealed.open.includes("Commençons."), "open part keeps the rounds");
    const res = sealDetectiveScript(`## ${SCAFFOLD_BY_CODE[code].headers["ACCUSATIONS AND RESOLUTION"]}\n\ntext\n`);
    assert.equal(res.found, false, "resolution heading must not count as a reveal");
  });

  t(`[${code}] evidence: host-only note stripped for guests, three cards found, round extracted, reviewer print strip`, () => {
    const e = localizeScaffoldField("evidence_cards", EVIDENCE, code).text;
    assert.ok(!e.includes("Host Only") || code === "en");
    const player = playerFacingEvidence(e);
    assert.ok(!player.includes("Le coupable est Max"), `host-only note leaked to players: ${player}`);
    assert.ok(player.includes("Une vieille boîte de métal rouillée."), "description kept");
    const cards = parseEvidenceCards(e, { round2: "u2", round3: "u3", round4: "u4" });
    assert.equal(cards.length, 3, "cards parsed");
    assert.ok(cards.every((c) => !c.description.includes("Le coupable est Max")), "no host-only text on printed card");
    assert.ok(cards[0].description.includes("Une vieille boîte"));
    for (const n of [2, 3, 4]) {
      const c = extractCard(e, n);
      assert.ok(c, `extractCard round ${n}`);
      assert.ok(!c.description.includes("coupable"), `extractCard leaked host note round ${n}`);
    }
    assert.ok(!printedEvidenceText(e).includes("Le coupable est Max"), "reviewer print strip");
    assert.equal(roundNumberOf(SCAFFOLD_BY_CODE[code].headers["EVIDENCE: ROUND 3"]), 3, "roundNumberOf");
  });
}

t("English evidence still works exactly as before", () => {
  assert.equal(parseEvidenceCards(EVIDENCE, { round2: "u2", round3: "u3", round4: "u4" }).length, 3);
  assert.ok(extractCard(EVIDENCE, 2).description.startsWith("Une vieille boîte"));
  assert.ok(!playerFacingEvidence(EVIDENCE).includes("Le coupable est Max"));
});

t("a card title with a round word on an h3 does not split a localized round", () => {
  const e = localizeScaffoldField("evidence_cards", EVIDENCE.replace("### La corde du puits", "### La ronde 3 du gardien"), "fr").text;
  const cards = parseEvidenceCards(e, { round2: "u2", round3: "u3", round4: "u4" });
  assert.equal(cards.length, 3);
  assert.ok(cards[1].description.includes("Une corde fine"));
});

t("language detection: Latin-script via the shared detector, CJK and Finnish via script and word hints", () => {
  assert.equal(detectScaffoldLanguage("안녕하세요 저는 탐정입니다 이 집에서 무슨 일이 있었는지 알아내겠습니다 모두 앉아 주세요"), "ko");
  assert.equal(detectScaffoldLanguage("こんにちは、私は探偵です。この家で何が起きたのかを必ず突き止めます。皆さん座ってください。"), "ja");
  assert.equal(detectScaffoldLanguage("大家好，我是侦探。我一定会查清这座房子里到底发生了什么。请大家坐下。"), "zh-cn");
  const fi = "Hyvää iltaa kaikille. Minä olen etsivä ja tämä on minun tutkimukseni. Kuka tämän teki ja miksi on vielä selvittämättä, mutta minä aion selvittää sen ennen kuin ilta on ohi. Te kaikki olette epäiltyjä ja se on vain tosiasia, jonka te kaikki tiedätte hyvin, ja minä en aio unohtaa sitä ennen kuin totuus on selvillä.";
  assert.equal(detectScaffoldLanguage(fi), "fi");
});

t("removal host note: localized in every language, English fallback, name inserted, same text twice (endsWith checks rely on it)", () => {
  for (const code of SCAFFOLD_LANGUAGES) {
    const a = absentHostNote("Pat/Patricia Nadeau", code);
    assert.ok(a.includes("Pat/Patricia Nadeau") && !a.includes("{name}") && !a.includes("could not attend"), code);
    assert.equal(absentHostNote("Pat/Patricia Nadeau", code), a);
  }
  assert.ok(absentHostNote("Pat", null).includes("could not attend"));
  assert.ok(absentHostNote("Pat", "xx").includes("could not attend"));
  const mc = JSON.stringify({ victimProfile: { name: "Rémi", personality: "Charismatique, théâtral et manipulateur, Rémi n'a aucun scrupule à exagérer des phénomènes paranormaux pour faire grimper les vues de sa chaîne, avec une famille qui ne s'entend plus très bien depuis des années et qui est dans la maison avec nous tous ce soir." } });
  assert.equal(languageOfMasterContext(mc), "fr");
  assert.equal(languageOfMasterContext("{}"), null);
});

console.log("done");
