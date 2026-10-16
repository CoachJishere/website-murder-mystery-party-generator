// Run: node --experimental-strip-types supabase/functions/review-package-quality/leak-probe.test.mjs
import assert from "node:assert/strict";
import * as P from "./leak-probe.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };

const INGRID_SECRET = "Ingrid har en gæld, hun aldrig selv kunne betale, og det er hendes mor, Dagny, der i al hemmelighed har dækket den, så familien undgår endnu en skandale. Ingrid har aldrig fortalt nogen, hvor stor gælden er.";
const sheets = [
  { name: "Ingrid Castenskiold", secret: INGRID_SECRET, texts: [{ field: "introduction", text: "Jeg hedder Ingrid og elsker skandaler. Jeg var ude efter frisk luft." }] },
  { name: "Fru Dagny Castenskiold", secret: "Jeg betaler i det skjulte Ingrids gæld, og ingen i familien må vide det. Pengene er gået til hendes skandaler, og regningen vokser.", texts: [{ field: "introduction", text: "Min datter Ingrid har gæld, som jeg i hemmelighed betaler. Det er min sag." }] },
  { name: "Johannes 'Jazz-Jo' Møller", secret: "Du skylder en stor sum til folk, der ikke er kendt for tålmodighed. Ingen i klubben ved det, ikke engang Emil.", texts: [
    { field: "round2_accomplice", text: "Se på greven, der skylder klubben en formue. Se på Ingrid, hvis gæld hendes mor stille og roligt betaler. Jeg er ikke den eneste i rummet." },
    { field: "round3_innocent", text: "Jeg kendte leveringstidspunktet, og jeg bestemmer pauserne. Det er en dårlig kombination for en orkesterleder." },
  ] },
  { name: "Emil Sachs", secret: "Du har i lang tid rodet rundt med klubbens kasse. Små beløb er forsvundet ind i dine egne lommer, fordi du har brug for startkapital.", texts: [{ field: "rumors", text: "Ingrid er ofte ved baren og drikker for meget champagne hver aften." }] },
  { name: "Clara Dam", secret: "Jeg har hørt og set langt mere, end jeg nogensinde har sagt, ved dørene i garderoben.", texts: [{ field: "introduction", text: "Jeg passer garderoben og husker alle frakker. Ingen lægger mærke til mig." }] },
  { name: "Holger Fjeldsted", secret: "Holger har lånt Emil nøglebundtet mere end én gang og lod det hænge uden opsyn.", texts: [{ field: "introduction", text: "Jeg har nøglerne til alle rum i huset, og jeg sov i pausen." }] },
];

t("splitSentences drops short fragments and splits on sentence ends and line breaks", () => {
  const s = P.splitSentences("Kort. Dette er en rimelig lang sætning om noget vigtigt. # \n- \nEn anden lang sætning står her på en ny linje.");
  assert.equal(s.length, 2);
});

t("the Jazz-Jo line about Ingrid's mother is retrieved for Ingrid's secret, and the allowed knower is skipped", () => {
  const c = P.leakCandidates(sheets);
  const ingrid = c.find((x) => x.owner === "Ingrid Castenskiold");
  assert.ok(ingrid, "Ingrid has candidates");
  assert.ok(ingrid.hits.some((h) => h.sheet === "Johannes 'Jazz-Jo' Møller" && /hendes mor stille og roligt betaler/.test(h.sentence)));
  // Dagny is named in Ingrid's secret, so her own sentences are not candidates
  assert.ok(!ingrid.hits.some((h) => h.sheet === "Fru Dagny Castenskiold"));
});

t("sentences that name the owner are ranked by overlap with the secret, so the real leak comes before a generic mention", () => {
  const c = P.leakCandidates(sheets);
  const ingrid = c.find((x) => x.owner === "Ingrid Castenskiold");
  const iJazz = ingrid.hits.findIndex((h) => h.sheet === "Johannes 'Jazz-Jo' Møller");
  const iEmil = ingrid.hits.findIndex((h) => h.sheet === "Emil Sachs");
  assert.ok(iJazz >= 0);
  assert.ok(iEmil === -1 || iJazz < iEmil);
});

t("the owner's own sheet is never searched, and a secret with no rare words yields nothing", () => {
  const c = P.leakCandidates(sheets);
  for (const x of c) assert.ok(!x.hits.some((h) => h.sheet === x.owner));
  const flat = P.leakCandidates([{ name: "A B", secret: "kort", texts: [] }, { name: "C D", secret: "kort", texts: [] }]);
  assert.deepEqual(flat, []);
});

t("caps: per owner and in total", () => {
  const many = [{ name: "Anna Berg", secret: "Anna skjuler en hemmelig affære med bagmanden Viktor Hansen i klubbens kælder.", texts: [] }];
  for (let i = 0; i < 4; i++) many.push({ name: `Gæst Nummer${i}`, secret: "", texts: [1, 2, 3].map((k) => ({ field: `rumors${k}`, text: `Anna har en hemmelig affære med bagmanden Viktor Hansen, siger man nummer ${i} ${k}.` })) });
  const c = P.leakCandidates(many, { maxPerOwner: 5 });
  assert.equal(c[0].hits.length, 5);
  assert.equal(P.leakCandidates(many, { maxPerOwner: 50 })[0].hits.length, 12);
  assert.equal(P.leakCandidates(many, { maxPerOwner: 50, maxTotal: 7 })[0].hits.length, 7);
});

t("prompt text lists the secret and numbered sentences; resolveFinding maps a quote back to the sheet", () => {
  const c = P.leakCandidates(sheets).find((x) => x.owner === "Ingrid Castenskiold");
  const txt = P.leakPromptText(c);
  assert.ok(txt.includes("THE SECRET") && txt.includes("SAYS OPENLY") && txt.includes("1. [") && txt.includes("hendes mor stille og roligt betaler"));
  const r = P.resolveFinding(c, { field: "x", exact_quote: "Se på Ingrid, hvis gæld hendes mor stille og roligt betaler." });
  assert.deepEqual(r, { sheet: "Johannes 'Jazz-Jo' Møller", field: "round2_accomplice" });
  assert.equal(P.resolveFinding(c, { field: "x", exact_quote: "noget helt andet" }), null);
});

t("instructions are conservative, treat rumours and open text as public, and ask for a rewrite in the same language", () => {
  assert.ok(P.LEAK_INSTRUCTIONS.includes("when in doubt, it is not a leak") && P.LEAK_INSTRUCTIONS.includes("OPEN") && P.LEAK_INSTRUCTIONS.includes("Rumour sections") && P.LEAK_INSTRUCTIONS.includes("same language"));
});

const EV = "## EVIDENCE CARDS\n\n*Display these one per round.*\n\n## EVIDENCE: ROUND 2\n\n### The Ledger of Secrets\n\n#### DESCRIPTION\nA locked ledger lies open beside letters.\n\n#### SIGNIFICANCE (Host Only)\nShows who held secrets; everyone has a motive.\n\n## EVIDENCE: ROUND 4\n\n### The Forged Cellar Note\n\n#### DESCRIPTION\nA forged note invites Eleanora to the cellar alone.\n\n#### SIGNIFICANCE (Host Only)\nPam wrote it.\n";
t("parseEvidenceCards keeps title, round and the description only, never the host-only significance", () => {
  const cards = P.parseEvidenceCards(EV);
  assert.deepEqual(cards.map((c) => c.round), [2, 4]);
  assert.equal(cards[1].title, "The Forged Cellar Note");
  assert.ok(cards[1].description.includes("invites Eleanora to the cellar alone"));
  assert.ok(!JSON.stringify(cards).includes("Pam wrote it") && !JSON.stringify(cards).includes("held secrets"));
});

t("parseEvidenceCards works on a translated heading and gives nothing for a non-string or an unparsable value", () => {
  const nl = "## BEWIJS: RONDE 3\n\n### De Lege Flacon\n\n#### BESCHRIJVING\nEen lege flacon met een gebroken zegel.\n\n#### BETEKENIS (alleen voor de gastheer)\nGeheim.\n";
  assert.deepEqual(P.parseEvidenceCards(nl).map((c) => [c.round, c.title]), [[3, "De Lege Flacon"]]);
  assert.deepEqual(P.parseEvidenceCards([{ a: 1 }]), []);
  assert.deepEqual(P.parseEvidenceCards(null), []);
  assert.deepEqual(P.parseEvidenceCards("no cards here"), []);
});

t("fieldRound maps round fields, finals and confessions to a round and others to null", () => {
  assert.equal(P.fieldRound("round3_questions"), 3);
  assert.equal(P.fieldRound("final_statement"), 4);
  assert.equal(P.fieldRound("reveal_confession_guilty"), 4);
  assert.equal(P.fieldRound("rumors"), null);
});

t("the prompt carries a PUBLIC EVIDENCE block only when cards exist, and the instructions say a restated card is never a leak", () => {
  const withCards = P.leakCandidates(sheets, { evidence: P.parseEvidenceCards(EV) }).find((x) => x.owner === "Ingrid Castenskiold");
  const txt = P.leakPromptText(withCards);
  assert.ok(txt.includes("PUBLIC EVIDENCE") && txt.includes("[round 4] The Forged Cellar Note: A forged note invites Eleanora"));
  assert.ok(!txt.includes("held secrets"));
  const without = P.leakCandidates(sheets).find((x) => x.owner === "Ingrid Castenskiold");
  assert.ok(!P.leakPromptText(without).includes("PUBLIC EVIDENCE") && without.evidence === undefined);
  assert.ok(P.LEAK_INSTRUCTIONS.includes("PUBLIC EVIDENCE") && P.LEAK_INSTRUCTIONS.includes("LATER round"));
});

t("ADR-0165: the culprit's role reaches the prompt only for a murderer or accomplice, and the instructions gate by round", () => {
  assert.equal(P.culpritRole("murderer"), "murderer");
  assert.equal(P.culpritRole("accomplice"), "accomplice");
  assert.equal(P.culpritRole("redHerring"), undefined);
  assert.equal(P.culpritRole(undefined), undefined);
  const secret = "Du har byttet glasset ud ved den fjerneste side af hovedbordet, mens Willy holdt Gino beskæftiget. Du står til fængsel for mordet, hvis nogen opdager hvor du stod.";
  const mk = (role) => [
    { name: "Zoya de Luca", secret, role, texts: [{ field: "introduction", text: "Jeg sad hos familien hele aftenen." }] },
    { name: "Lulu Lombardi", secret: "x".repeat(10), texts: [{ field: "rumors", text: "Jeg så Zoya hele aftenen, og hun stod ved den fjerneste side af hovedbordet, da skålen begyndte." }] },
    { name: "Baron", secret: "y".repeat(10), texts: [{ field: "introduction", text: "Fra mit sæde kunne jeg se Zoya ved hovedbordets fjerneste side og tage glasset op." }] },
  ];
  const withRole = P.leakCandidates(mk("murderer"));
  const without = P.leakCandidates(mk("redHerring"));
  assert.equal(withRole.length, 1); assert.equal(withRole[0].role, "murderer");
  assert.ok(P.leakPromptText(withRole[0]).includes("OWNER ROLE: murderer"));
  assert.equal(without.length, 1); assert.equal(without[0].role, undefined);
  assert.ok(!P.leakPromptText(without[0]).includes("OWNER ROLE"));
  for (const k of ["CULPRIT POSITION", "OVERRIDES", "rounds 1 and 2", "round2_*", "round3_*", "Round 4 only", "severity high", "eyewitness"]) assert.ok(P.LEAK_INSTRUCTIONS.includes(k), k);
  assert.ok(P.LEAK_INSTRUCTIONS.indexOf("CULPRIT POSITION") < P.LEAK_INSTRUCTIONS.indexOf("Be conservative"), "exception must come before the conservative rule");
});

t("ADR-0165: culprit owners are served first, so the total cap cannot starve a murderer who sorts last", () => {
  const secret = "Du har byttet glasset ud ved den fjerneste side af hovedbordet, mens Willy holdt Gino beskæftiget. Du står til fængsel for mordet, hvis nogen opdager hvor du stod.";
  const owner = (name, role) => ({ name, role, secret, texts: [{ field: "introduction", text: "Jeg sad hos familien hele aftenen, ingen kan sige andet." }] });
  const watcher = (i) => ({ name: `Gæst Nummer${i}`, secret: "", texts: [{ field: "rumors", text: `Jeg så Aaron Førstmand og Zoya Nummerz stå ved den fjerneste side af hovedbordet, længe før skålen.` }] });
  const filler = (i) => ({ name: `Fyld Nummer${i}`, secret: "", texts: [{ field: "rumors", text: "Jeg snakkede med kokken om menuen og vinen hele aftenen lang." }] });
  const sheets = [owner("Aaron Førstmand", "redHerring"), watcher(1), watcher(2), watcher(3), filler(1), filler(2), filler(3), owner("Zoya Nummerz", "murderer")];
  const capped = P.leakCandidates(sheets, { maxTotal: 3, maxPerOwner: 3 });
  assert.equal(capped.length, 1, "the cap only fits one owner");
  assert.equal(capped[0].owner, "Zoya Nummerz", "the murderer is served first even though it sorts last");
  assert.equal(capped[0].role, "murderer");
  const noRole = P.leakCandidates(sheets.map((s) => ({ ...s, role: undefined })), { maxTotal: 3, maxPerOwner: 3 });
  assert.equal(noRole[0].owner, "Aaron Førstmand", "without roles the old (list) order stands");
});

// ADR-0167 (+pub): the Eddie/Tyson case, Till Death Do Us Part-y 2026-10-16. Wording is Tyson's ORIGINAL secret and Eddie's Round 1 introduction.
const TYSON_ORIGINAL = "You are having an affair with Emerald, your ex-girlfriend, and she is pregnant. She knows you are the father. You still love her, you told her so, and you are in debt to Eddie Millions for half a million dollars on top of it. Gino knew all of it and promised you a 'toast to remember'. You will dodge, deflect, and lie to keep it buried.";
const EDDIE_INTRO = "Eddie Millions, ladies and gentlemen. Casino money, good suits, and a standing weakness for a good bet.\n\nEveryone might as well hear it from me. Tyson owes me $500,000, and I'm not shy about it. That's business, and it's the kind of thing a man doesn't forget.";
const pubSheets = (tysonOpen = "I'm Tyson de Luca, the groom, and tonight was supposed to be the happiest night of my life.") => [
  { name: "Tyson de Luca", secret: TYSON_ORIGINAL, open: tysonOpen, texts: [{ field: "introduction", text: tysonOpen }] },
  { name: "Eddie Millions", secret: "You have been telling everyone the debt is a friendly matter, but you are in real trouble if Tyson cannot pay.", texts: [
    { field: "introduction", text: EDDIE_INTRO },
    { field: "rumors", text: "1. About Lulu Lombardi: 'Lulu has been snapping photos all night, and I noticed she kept her camera trained on the head table.'" },
    { field: "round3_script", text: "I heard Tyson owes me more than I ever admitted to anybody in this room tonight." },
  ] },
  { name: "Lulu Lombardi", secret: "You photographed the groom kissing Emerald once, and you keep the picture on your phone.", texts: [{ field: "rumors", text: "Tyson has looked nervous all evening, and he keeps glancing at the bar." }, { field: "introduction", text: "I take the photographs at weddings, and I see everything." }] },
  { name: "Gino Gherkin", secret: "You planned a surprise toast to embarrass the family at the wedding reception tonight.", texts: [{ field: "introduction", text: "I run the wedding and the toast, and I will make it unforgettable for everyone." }] },
];

t("ADR-0167: +leak still skips the character the secret names (today's behaviour is unchanged)", () => {
  const plain = P.leakCandidates(pubSheets());
  assert.ok(!plain.some((c) => c.hits.some((h) => h.sheet === "Eddie Millions" && /owes me/.test(h.sentence))));
});

t("ADR-0167: +pub retrieves Eddie's Round 1 sentence naming Tyson, though it shares no word with the secret", () => {
  const c = P.pubCandidates(pubSheets()).find((x) => x.owner === "Tyson de Luca");
  assert.ok(c, "Tyson has +pub candidates");
  assert.ok(c.hits.some((h) => h.sheet === "Eddie Millions" && h.field === "introduction" && /Tyson owes me \$500,000/.test(h.sentence)));
});

t("ADR-0167: +pub reads ONLY named characters and ONLY Round 1 fields", () => {
  const cs = P.pubCandidates(pubSheets());
  for (const c of cs) for (const h of c.hits) {
    assert.ok(P.PUBLIC_ROUND1_FIELDS.includes(h.field), `field ${h.field}`);
    assert.ok(c.secret.includes(h.sheet.split(" ")[0]), `${h.sheet} is named in the secret of ${c.owner}`);
  }
  const tyson = cs.find((x) => x.owner === "Tyson de Luca");
  assert.ok(!tyson.hits.some((h) => h.field === "round3_script"), "a Round 3 script is not Round 1");
  assert.ok(!tyson.hits.some((h) => h.sheet === "Lulu Lombardi"), "Lulu is not named in Tyson's secret");
});

t("ADR-0167: the +pub prompt carries the secret, the owner's open text and the numbered Round 1 sentences, with no culprit role or evidence block", () => {
  const c = P.pubCandidates(pubSheets("I'm Tyson. Yes, I owe Eddie half a million dollars and everybody knows it, he never lets me forget."))[0];
  const txt = P.pubPromptText(c);
  assert.ok(txt.includes("THE SECRET") && txt.includes("SAYS OPENLY") && txt.includes("I owe Eddie half a million dollars") && txt.includes("1. [Eddie Millions | introduction]"));
  assert.ok(!txt.includes("OWNER ROLE") && !txt.includes("PUBLIC EVIDENCE"));
});

t("ADR-0167: the +pub instructions flag an announced hidden fact, spare what the owner says openly, and stay conservative", () => {
  for (const k of ["HIDDEN", "ROUND 1", "read aloud to the whole table", "does not already say it", "OPEN text", "when in doubt, do not report", "cross_field_contradiction", "same language"]) assert.ok(P.PUB_INSTRUCTIONS.includes(k), k);
  assert.ok(P.resolveFinding(P.pubCandidates(pubSheets())[0], { field: "x", exact_quote: "Tyson owes me $500,000, and I'm not shy about it." })?.sheet === "Eddie Millions");
});

t("ADR-0167: pubCandidates ignores culprit roles and caps per owner", () => {
  const withRole = pubSheets().map((s) => (s.name === "Tyson de Luca" ? { ...s, role: "murderer" } : s));
  assert.equal(P.pubCandidates(withRole)[0].role, undefined);
  const many = pubSheets();
  many[1].texts.push({ field: "rumors", text: Array.from({ length: 20 }, (_, i) => `Tyson was seen near the bar number ${i} with a drink in his hand.`).join(" ") });
  assert.ok(P.pubCandidates(many, { maxPerOwner: 3 })[0].hits.length <= 3);
});

console.log("leak-probe tests passed");
