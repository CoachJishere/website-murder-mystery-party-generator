// ADR-0156 Phase 4 Tier 1 checks on a saved Part 2 answer. usage: node --experimental-strip-types phase4_analyze.mjs <phase4_out file> [--show]
// Checks (design.md section 6): (a) parses, one entry per cast member, field present; (b) empty exactly when canBeSeenBy is empty; (c) word counts, culprit/accomplice
// within innocents' range, none over 25; (d) act/intent/secrecy word scan on culprit/accomplice (and all) sentences; (e) named characters are in besideOrNear;
// (f) buildCharacterContext leak scan; (i) map consistency (reciprocity, entry count).
import fs from "node:fs";
import { parseMasterContext, buildCharacterContext, sameCharacter, fold } from "../../../../supabase/functions/_shared/characterContext.ts";
const file = process.argv[2]; const show = process.argv.includes("--show");
const run = JSON.parse(fs.readFileSync(file, "utf8"));
const pk = JSON.parse(fs.readFileSync(new URL("../../../../temp-files/charctx/packages.json", import.meta.url), "utf8")).find((p) => p.id === run.package);
const stored = parseMasterContext(pk.master_context);
let raw = run.raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
let part2; try { part2 = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); part2 = JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1")); }
const tf = part2.timelineFramework ?? {};
const kmp = tf.keyMomentPositions ?? [];
const murderer = stored.murdererSelection?.character ?? stored.murdererSelection?.characterName;
const accomplice = stored.accompliceSelection?.character ?? stored.accompliceSelection?.characterName ?? stored.accompliceDetails?.accompliceName ?? null;
const isC = (n) => (murderer && sameCharacter(n, murderer)) || (accomplice && sameCharacter(n, accomplice));
const wc = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
const out = []; const flag = (m) => out.push("FLAG " + m);
// (d) word lists: act, intent, secrecy, tampering, result (English; the Swedish list is added by language)
const BAD = /\b(secret(ly)?|quiet(ly)?|careful(ly)?|discreet(ly)?|surreptitious(ly)?|unnoticed|unseen|while nobody|while no one|without (being )?(seen|noticed)|to make sure|in order to|so that|so as to|dos(e|ed|ing)|poison(ed|ing)?|spik(e|ed|ing)|lac(e|ed|ing)|tamper(ed|ing)?|slip(s|ped|ping)?|add(s|ed|ing)? (it|something|a|the|poison)|swap(s|ped|ping)?|plant(s|ed|ing)?|hid(e|es|ing|den)|conceal(s|ed|ing)?|steal(s|ing)?|stole|pocket(s|ed|ing)?|remov(e|es|ed|ing)|pour(s|ed|ing)? (something|a|the|it)|vial|powder|drug(s|ged)?|intend(s|ed)?|plan(s|ned)? to|meant to|motive|pretend(s|ed|ing)?|alibi|lie[sd]?|lying|pantry)\b/i;
const BAD_SV = /\b(hemlig(t|a)?|diskret|i smyg|obemärkt|osedd|för att|häll(er|de|a)|gift(et)?|smyg(er|de)|dölj(er|de)|stjäl(er)?|stal|planter(ar|ade)|byt(er|te)|tillsätt(er|te)|ficka)\b/i;
const sv = /sv/i.test(pk.title) || /Golden Stars/.test(pk.title);
out.push(`package ${pk.title} | murderer ${murderer} | accomplice ${accomplice} | tokens in ${run.usage.input_tokens} out ${run.usage.output_tokens} stop ${run.stop}`);
// (a)
const castRaw = stored.timelineFramework?.keyMomentPositions?.map((e) => e.character) ?? [];
out.push(`entries ${kmp.length} (stored Parent77-era map: ${castRaw.length})`);
if (kmp.length !== castRaw.length) flag(`entry count ${kmp.length} vs stored ${castRaw.length}`);
const missing = kmp.filter((e) => !("whatAnObserverSees" in e)); if (missing.length) flag(`field missing on ${missing.map((e) => e.character)}`);
// (b)
for (const e of kmp) {
  const seen = (e.canBeSeenBy ?? []).length > 0; const t = String(e.whatAnObserverSees ?? "");
  if (seen && !t.trim()) flag(`${e.character}: seen by ${e.canBeSeenBy.length} but empty field`);
  if (!seen && t.trim()) flag(`${e.character}: nobody sees them but field not empty: ${t}`);
}
// (c)
const inn = kmp.filter((e) => !isC(e.character) && wc(e.whatAnObserverSees) > 0).map((e) => wc(e.whatAnObserverSees));
const min = Math.min(...inn), max = Math.max(...inn), mean = inn.reduce((a, b) => a + b, 0) / inn.length;
out.push(`innocent sentence words: min ${min} max ${max} mean ${mean.toFixed(1)} (n=${inn.length})`);
for (const e of kmp) {
  const n = wc(e.whatAnObserverSees);
  if (n > 25) flag(`${e.character}: ${n} words (>25)`);
  if (isC(e.character) && n > 0) { out.push(`culprit/accomplice ${e.character}: ${n} words`); if (n > max) flag(`${e.character}: ${n} words exceeds innocents' max ${max}`); }
}
// (d)
for (const e of kmp) {
  const t = String(e.whatAnObserverSees ?? "");
  const hit = t.match(BAD) || (sv ? t.match(BAD_SV) : null);
  if (hit) flag(`${isC(e.character) ? "CULPRIT/ACCOMPLICE " : ""}${e.character}: word "${hit[0]}" in: ${t}`);
}
// (e)
for (const e of kmp) {
  const t = fold(String(e.whatAnObserverSees ?? ""));
  for (const o of kmp) {
    if (o === e || sameCharacter(o.character, e.character)) continue;
    const first = fold(o.character).split(/[\s/]+/).find((w) => w.length >= 4);
    if (first && new RegExp(`\\b${first}`).test(t) && !(e.besideOrNear ?? []).some((n) => sameCharacter(n, o.character))) flag(`${e.character}: names ${o.character} who is not in besideOrNear`);
  }
}
const words = (s) => fold(String(s)).replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(Boolean);
// added-detail rate: content words (4+ letters, first 5 letters compared) in the observer sentence that truePosition, besideOrNear and the entry's own name do not contain
const STOP = new Set("with that this from their there where while into onto near beside during after before they them then than have been being those these which what when about over under along toward towards across".split(" "));
const stem = (w) => w.slice(0, 5);
let addedEntries = 0; const addedList = [];
for (const e of kmp) {
  const t = String(e.whatAnObserverSees ?? ""); if (!t.trim()) continue;
  const have = new Set([...words(e.truePosition), ...(e.besideOrNear ?? []).flatMap(words), ...words(e.character)].map(stem));
  const novel = words(t).filter((w) => w.length >= 4 && !STOP.has(w) && !have.has(stem(w)));
  if (novel.length) { addedEntries++; addedList.push(`${e.character}: ${[...new Set(novel)].join(", ")}`); }
}
const nonEmpty = kmp.filter((e) => String(e.whatAnObserverSees ?? "").trim()).length;
out.push(`added-detail: ${addedEntries} of ${nonEmpty} sentences contain words not in truePosition/besideOrNear`);
for (const l of addedList) out.push("  novel> " + l);
const FEEL = /\b(uneas(y|ily)|relax(ed|ing)|compos(ed|ure)|nervous(ly)?|worried|anxious|calm(ly)?|tense|expression|mood|angry|upset|amused|bored|smil(e|es|ing)|frown(s|ing)?|glar(e|es|ing)|ill at ease|confident(ly)?|grim)\b/i;
for (const e of kmp) { const m = String(e.whatAnObserverSees ?? "").match(FEEL); if (m) flag(`${e.character}: feeling/expression word "${m[0]}"`); }
// (i) reciprocity of besideOrNear and canBeSeenBy-vs-besideOrNear subset
let recip = 0;
for (const e of kmp) for (const n of e.besideOrNear ?? []) { const o = kmp.find((x) => sameCharacter(x.character, n)); if (!o || !(o.besideOrNear ?? []).some((m) => sameCharacter(m, e.character))) recip++; }
let storedRecip = 0; const sk = stored.timelineFramework?.keyMomentPositions ?? [];
for (const e of sk) for (const n of e.besideOrNear ?? []) { const o = sk.find((x) => sameCharacter(x.character, n)); if (!o || !(o.besideOrNear ?? []).some((m) => sameCharacter(m, e.character))) storedRecip++; }
out.push(`reciprocity breaks: new ${recip}, stored ${storedRecip}`);
if (recip > storedRecip) flag(`more reciprocity breaks than the stored map (${recip} vs ${storedRecip})`);
// (f) leak scan through buildCharacterContext: no 5-word run of a culprit's truePosition that is absent from its observer sentence
const grams = (s, n) => { const w = words(s), o = new Set(); for (let i = 0; i + n <= w.length; i += 1) if (i + n <= w.length) o.add(w.slice(i, i + n).join(" ")); return o; };
const merged = JSON.stringify({ ...stored, timelineFramework: { ...stored.timelineFramework, ...tf } });
let leaks = 0, witnessGets = [];
for (const c of kmp.filter((e) => !isC(e.character))) {
  let ctx; try { ctx = buildCharacterContext(merged, c.character, "suspect").context; } catch { continue; }
  const k = JSON.parse(ctx).timelineFramework?.keyMomentPositions ?? [];
  for (const cu of kmp.filter((e) => isC(e.character))) {
    const obsG = grams(cu.whatAnObserverSees, 5);
    const entryInCtx = k.find((e) => sameCharacter(e.character, cu.character));
    if (entryInCtx) witnessGets.push(c.character);
    for (const g of grams(cu.truePosition, 5)) if (!obsG.has(g) && fold(ctx).replace(/[^\p{L}\p{N}\s]+/gu, " ").replace(/\s+/g, " ").includes(g)) { leaks++; flag(`${c.character}: 5-word run of ${cu.character}'s truePosition reaches the context: "${g}"`); break; }
  }
}
out.push(`viewers who receive a culprit/accomplice entry: ${[...new Set(witnessGets)].join(", ") || "none"}; leak flags ${leaks}`);
console.log(out.join("\n"));
if (show) for (const e of kmp) console.log(`\n${isC(e.character) ? "[CULPRIT/ACC] " : ""}${e.character} | near ${JSON.stringify(e.besideOrNear)} | seenBy ${(e.canBeSeenBy ?? []).length}\n  TRUE: ${e.truePosition}\n  OBS : ${e.whatAnObserverSees}`);
console.log(out.some((l) => l.startsWith("FLAG")) ? "\nRESULT: FLAGS" : "\nRESULT: clean");
