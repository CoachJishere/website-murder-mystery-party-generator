// Package-level scaffolding localization (ADR-0161). Pure, dependency-free apart from the generated table, no Deno or network APIs, so it
// can be tested with plain node (packageScaffold.test.mjs).
//
// The Parent prompts hold the detective script, the evidence cards and the Game Overview heading as a literal English template. The model
// translates the prose and copies the template, so every non-English package ships English headers ("## NOTE FOR HOST", "## ROUND 2:
// MOTIVES"), English audio-recording notes, English bracketed stage directions and English evidence card headings (20 of 20 paid non-English
// packages since June 2026). This module rewrites exactly those known template strings into the package language and nothing else:
//   - a line is only replaced when it IS a known English template line (investigator and detective variants count as one), so prose, card
//     titles, names and anything the model already wrote in the target language are never touched;
//   - a round heading that starts with the English word ROUND is replaced by the canonical heading of that round when the language has its
//     own word for round (the mixed "## ROUND 2: MOVENTI" shape seen in delivered Italian packages);
//   - the inline cue "*[Present Round 2 Evidence]*" is localized wherever it sits in a line;
//   - the wrapper of the source line (*[ ]*, [ ], heading level, leading indent) is kept.
// It is idempotent: a second run finds no English template line and changes nothing.
import { SCAFFOLD_BY_CODE } from "./packageScaffoldTables.ts";
import { detectLanguage, LANG_STOPWORDS } from "./languageDetect.ts";

export type ScaffoldField = "detective_script" | "evidence_cards" | "game_overview";
export const SCAFFOLD_FIELDS: ScaffoldField[] = ["detective_script", "evidence_cards", "game_overview"];
export const SCAFFOLD_LANGUAGES = Object.keys(SCAFFOLD_BY_CODE);

const HEADER_KEYS: Record<ScaffoldField, string[]> = {
  detective_script: [
    "DETECTIVE SCRIPT", "NOTE FOR HOST", "RECORDING GUIDELINES FOR AUDIO OPTION", "DETECTIVE BACKSTORY", "OPENING STATEMENT",
    "ROUND 1: INTRODUCTIONS & RUMORS", "ROUND 2: MOTIVES", "ROUND 3: METHOD", "ROUND 4: OPPORTUNITY", "ACCUSATIONS", "FINAL STATEMENTS",
    "THE REVEAL", "ACCUSATIONS AND RESOLUTION",
  ],
  evidence_cards: ["EVIDENCE CARDS", "EVIDENCE: ROUND 2", "EVIDENCE: ROUND 3", "EVIDENCE: ROUND 4", "DESCRIPTION", "SIGNIFICANCE (Host Only)"],
  game_overview: ["Game Overview"],
};
// Only these whole lines may be replaced in a given field (the audio notes live in the detective script, the card legend in the evidence cards).
const LINE_KEYS: Record<ScaffoldField, (key: string) => boolean> = {
  detective_script: (k) => !k.startsWith("*Display these"),
  evidence_cards: (k) => k.startsWith("*Display these"),
  game_overview: () => false,
};
const EVIDENCE_LEGEND = /^\*Display these one\b.*forensic image\.\*$/;
const ROUND_KEY = (n: number) => ["", "ROUND 1: INTRODUCTIONS & RUMORS", "ROUND 2: MOTIVES", "ROUND 3: METHOD", "ROUND 4: OPPORTUNITY"][n];

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
// "investigator" and "detective" are the same entry (the Parent picks the word by story; the sentence works with either).
const unInvestigator = (s: string) => s.replace(/\binvestigator\b/g, "detective").replace(/\bInvestigator\b/g, "Detective").replace(/\bINVESTIGATOR\b/g, "DETECTIVE");
const normHeader = (s: string) => unInvestigator(squash(s.replace(/[*_`]/g, "")).replace(/:$/, "")).toUpperCase();

export type ScaffoldEdit = { field: ScaffoldField; from: string; to: string };
export type ScaffoldResult = { text: string; edits: ScaffoldEdit[]; unmatched: string[] };

// Words a localized package uses for "round", used by consumers that must find a round heading in any language.
export const ROUND_WORDS = ["ROUND", "RONDA", "MANCHE", "RUNDE", "TURNO", "RODADA", "RONDE", "RUNDA", "KIERROS", "라운드", "ラウンド"];
/** The round number a heading names, in any language of the table ("MANCHE 3 : MÉTHODE", "第3轮：手法", "ラウンド3: 方法"), or null. */
export function roundNumberOf(heading: string): number | null {
  const h = heading.replace(/[*_`#]/g, " ");
  const m = h.match(new RegExp(`(?:${ROUND_WORDS.join("|")})\\s*([0-9])(?![0-9])`, "iu")) ?? h.match(/第\s*([0-9])\s*轮/u);
  return m ? Number(m[1]) : null;
}

/** English function words and the vocabulary of the template's stage directions. One hit is enough when the line has no word of the target language. */
const ENGLISH_HINT = /\b(the|and|each|read|then|after|before|their|they|with|until|when|your|that|this|steps?|guests?|players?|statement|approximately|reconvene|tally|slowly|lower)\b/gi;
/**
 * A leftover English line (report only). Latin-script targets: English vocabulary and none of that language's own stopwords.
 * Other scripts (and Finnish): English vocabulary and no non-ASCII letter at all.
 */
export function looksEnglish(text: string, lang: string): boolean {
  const en = (text.match(ENGLISH_HINT) ?? []).length;
  if (en === 0) return false;
  const own = LANG_STOPWORDS[lang];
  if (own && lang !== "en") return (text.match(own) ?? []).length === 0;
  return !/[^\x00-\x7F]/.test(text);
}

export function localizeScaffoldField(field: ScaffoldField, text: string, lang: string): ScaffoldResult {
  const table = SCAFFOLD_BY_CODE[lang];
  if (!table || !text) return { text: text ?? "", edits: [], unmatched: [] };
  const sep = text.includes("\n") ? "\n" : text.includes("\\n") ? "\\n" : "\n";
  const lines = text.split(sep);
  const edits: ScaffoldEdit[] = [];
  const unmatched: string[] = [];
  const headerKeys = HEADER_KEYS[field];
  const headerByNorm = new Map(headerKeys.map((k) => [normHeader(k), k]));
  const lineKeys = Object.keys(table.lines).filter(LINE_KEYS[field]);
  const lineByNorm = new Map(lineKeys.map((k) => [squash(k), k]));
  const dirKeys = field === "detective_script" ? Object.keys(table.directions) : [];
  const dirByNorm = new Map(dirKeys.map((k) => [squash(k), k]));

  const out = lines.map((raw) => {
    const line = raw.replace(/\r$/, "");
    const cr = raw.endsWith("\r") ? "\r" : "";
    const t = squash(line);
    if (!t) return raw;

    // 1. Headings.
    const h = line.match(/^(\s*)(#{1,6})[ \t]+(.*?)\s*$/);
    if (h) {
      let key = headerByNorm.get(normHeader(h[3])) ?? null;
      if (!key && field === "detective_script") {
        // "## ROUND 2: MOVENTI": the English word ROUND with another language's tail. Replace with the canonical heading of that round.
        const m = h[3].match(/^\*{0,2}ROUND\s*([1-4])\b/i);
        const ownWord = m ? (table.headers[ROUND_KEY(Number(m[1]))] ?? "") : "";
        if (m && ownWord && !/^ROUND\b/i.test(ownWord)) key = ROUND_KEY(Number(m[1]));
      }
      if (key && table.headers[key]) {
        const to = `${h[1]}${h[2]} ${table.headers[key]}${cr}`;
        if (to !== raw) { edits.push({ field, from: line.trim(), to: to.trim() }); return to; }
        return raw;
      }
      return raw;
    }

    // 2. Whole-line stage directions: *[ ... ]* or [ ... ].
    if (field === "detective_script") {
      const d = line.match(/^(\s*)(\*?)\[(.+)\](\*?)\s*$/);
      if (d) {
        const key = dirByNorm.get(unInvestigator(squash(d[3])));
        if (key) {
          const to = `${d[1]}${d[2]}[${table.directions[key]}]${d[4]}${cr}`;
          edits.push({ field, from: line.trim(), to: to.trim() });
          return to;
        }
        if (looksEnglish(d[3], lang) && !/Present Round \d Evidence/.test(d[3])) unmatched.push(t.slice(0, 160));
      }
    }

    // 2b. The English host note the "Remove a Character" feature appended before ADR-0161 (it now writes it in the package language).
    if (field === "detective_script") {
      const a = line.match(/^(\s*)\*\*Note \(host only\):\*\* (.+?) could not attend and has been cleared of suspicion ahead of time \(never in the house, no opportunity\) — proceed without them; no other character's script should reference them\.\s*$/);
      if (a && table.absent) {
        const to = `${a[1]}${table.absent.replace("{name}", a[2])}${cr}`;
        edits.push({ field, from: t.slice(0, 90), to: to.trim().slice(0, 90) });
        return to;
      }
    }

    // 3. Whole template lines (audio notes, card legend).
    const lk = lineByNorm.get(unInvestigator(t)) ?? lineByNorm.get(unInvestigator(t).replace("skip the bracketed stage directions", "skip the [bracketed stage directions]"))
      ?? (field === "evidence_cards" && EVIDENCE_LEGEND.test(t) ? lineKeys.find((k) => k.startsWith("*Display these")) : undefined);
    if (lk) {
      const lead = line.match(/^\s*/)![0];
      const to = `${lead}${table.lines[lk]}${cr}`;
      if (to !== raw) { edits.push({ field, from: t, to: to.trim() }); return to; }
      return raw;
    }
    if (field === "detective_script" && /^\s*- /.test(line) && looksEnglish(line, lang)) unmatched.push(t.slice(0, 160));
    return raw;
  });

  let result = out.join(sep);
  // 4. Inline evidence cue, wherever it sits.
  if (field === "detective_script") {
    result = result.replace(/(\*?)\[Present Round ([2-4]) Evidence\](\*?)/g, (m, a, n, b) => {
      const to = `${a}[${table.cue.replace("{n}", n)}]${b}`;
      edits.push({ field, from: m, to });
      return to;
    });
  }
  return { text: result, edits, unmatched };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Language of a package: the shared stopword detector first (en es fr de it pt nl da sv), then script and word hints for the languages it
// does not know (ko ja zh-cn fi). Returns null when unclear, and the caller then changes nothing.
// ---------------------------------------------------------------------------------------------------------------------------------
export function detectScaffoldLanguage(sample: string): string | null {
  const hangul = (sample.match(/[가-힯]/g) ?? []).length;
  const kana = (sample.match(/[぀-ヿ]/g) ?? []).length;
  const han = (sample.match(/[一-鿿]/g) ?? []).length;
  const letters = sample.replace(/\s+/g, "").length || 1;
  if (hangul / letters > 0.2) return "ko";
  if (kana / letters > 0.1) return "ja";
  if (han / letters > 0.2) return "zh-cn";
  const base = detectLanguage(sample);
  if (base) return base;
  const words = sample.split(/\s+/).filter(Boolean).length;
  if (words >= 40) {
    const fi = (sample.match(/\b(ja|ei|on|että|mutta|kuin|oli|olen|sinä|hän|meidän|myös|tämä|se|ne|vain)\b/gi) ?? []).length / words;
    if (fi > 0.12) return "fi";
  }
  return null;
}

/** Language of a package from its master_context (JSON keys removed), or null when unclear or not in the table. */
export function languageOfMasterContext(masterContext: unknown): string | null {
  const text = typeof masterContext === "string" ? masterContext : JSON.stringify(masterContext ?? "");
  const prose = text.replace(/"[A-Za-z_]+"\s*:/g, " ").replace(/[{}\[\]",]/g, " ").slice(0, 8000);
  const lang = detectScaffoldLanguage(prose);
  return lang && SCAFFOLD_BY_CODE[lang] ? lang : null;
}

/** The host-only note a character removal appends to the detective script, in the package language (English when the language is unknown). */
export function absentHostNote(characterName: string, lang: string | null): string {
  const tpl = lang ? SCAFFOLD_BY_CODE[lang]?.absent : undefined;
  return (tpl ?? "**Note (host only):** {name} could not attend and has been cleared of suspicion ahead of time (never in the house, no opportunity) — proceed without them; no other character's script should reference them.").replace("{name}", characterName);
}
