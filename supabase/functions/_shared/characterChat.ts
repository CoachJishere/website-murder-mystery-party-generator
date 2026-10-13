// ADR-0156 Phase 1b: the customer's chat, redacted per character.
//
// The detective Child receives the whole brainstorm chat (`conversationContent`) and, per character, every chat message that names the character
// (`characterChatExcerpts`). The approved concept in that chat lists EVERY character with a one-line blurb that already states their secret
// ("Harry Dunmore - A journalist posing as a society guest"), and some customers write the killer into the chat. Redacting master_context alone
// leaves this path open (ADR-0156 Phase 2: 2 of 10 replayed sheets repeated Harry's secret from the chat).
//
// What an innocent keeps: everything except (1) the blurb of every OTHER character (name and "played by" stay, the description is withheld),
// (2) sections headed as the killer/solution, and (3) sentences that name the murderer or accomplice next to a guilt word. Pure, no Deno APIs.
// Format-agnostic by design: blurbs are found as line-starts (numbered, bulleted, bold, heading, plain) or as heading blocks, matched to the roster
// by unique name tokens; when the list cannot be recognised the chat is NOT blanked (fail open, as today) and the result says so in `flags`.
import { culpritRegex, fold, parseMasterContext, sameCharacter, tokenSet } from "./characterContext.ts";

export interface ChatOptions {
  /** Also withhold lines that name another character next to a secret cue word (default true). Lines are replaced by a short marker. */
  dropResidual?: boolean;
  /** Withhold EVERY line that names another character (not only list entries and cue lines). For long customer-written story bibles. Default false. */
  strict?: boolean;
}

export interface ChatContext {
  /** Every character name of the cast (the roster / relationship-matrix names). */
  roster: string[];
  /** The murderer and accomplice names (from master_context.murdererSelection / accompliceSelection). */
  culprits: string[];
}

export interface ChatResult {
  text: string;
  redactedBlurbs: number;
  withheldBlocks: number;
  droppedSections: number;
  droppedSentences: number;
  /** Notes for the caller: "character-list-not-recognised", "self-not-in-roster", "residual:<n>", "unchanged-role". */
  flags: string[];
  /** Lines that still mention another character next to a secret cue word (not removed; for review). */
  residual: string[];
}

const FULL_ROLES = new Set(["murderer", "accomplice"]);
const TITLES = new Set(["dr", "mr", "mrs", "ms", "prof", "professor", "lady", "lord", "sir", "dame", "captain", "kaptajn", "chef", "camper", "officer", "inspector", "detective", "madame", "monsieur", "herr", "frau", "fru", "don", "dona", "count", "countess", "baron", "baroness", "father", "sister", "sergeant", "colonel", "major", "judge", "miss", "the"]);
const LEAD = /^\s*(?:(?:[-*•>]|\d+[.)]|#{1,6})\s+)*(?:\*\*|__|\*|_)?\s*/;
const HEADING = /^\s*(?:#{1,6}\s+\S|\*\*[^*]{2,80}\*\*\s*:?\s*$|[A-Z0-9][A-Z0-9 '\-—:&]{5,80}$|[⸻—–-]{3,}\s*$)/;
const SOLUTION_HEADING = /(killer|murderer|culprit|solution|the truth|who did it|whodunit|reveal(ed)? (the )?(killer|murderer)|how (it|the (murder|crime)) (was|is) (done|committed)|secret ending)/i;
const NOT_SOLUTION = /(mechanism|mechanic|host role|accomplice (rule|setting))/i;
const GUILT = /(murder(er|ed|s)?|kill(er|ed|s|ing)?|poison(ed|er|s)?|culprit|guilty|did it|accomplice|framed|frames|alibi|the truth|stabbed|strangled|shot)/i;
const CUE = /(secret|hidden|blackmail|posing|pretend|disguis|affair|debt|embezzl|stole|steal|launder|identity|in truth|really is|actually|undercover|false (name|identity)|cover story|journalist|reporter)/i;

function words(s: string): string[] {
  return fold(s).replace(/[*_`#>]/g, " ").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

export function buildCharacterChat(chat: string, characterName: string, role: string, ctx: ChatContext, options: ChatOptions = {}): ChatResult {
  const dropResidual = options.dropResidual !== false;
  const out: ChatResult = { text: chat, redactedBlurbs: 0, withheldBlocks: 0, droppedSections: 0, droppedSentences: 0, flags: [], residual: [] };
  if (FULL_ROLES.has(String(role ?? "").trim().toLowerCase())) { out.flags.push("unchanged-role"); return out; }

  const roster = ctx.roster;
  const own = roster.findIndex((r) => sameCharacter(r, characterName));
  if (own < 0) out.flags.push("self-not-in-roster");

  // Unique alias tokens: a token that belongs to exactly one character ("Calloway" belongs to two, so it never identifies a line).
  const owners = new Map<string, Set<number>>();
  roster.forEach((r, i) => { for (const t of tokenSet(r)) if (t.length >= 3 && !TITLES.has(t)) { (owners.get(t) ?? owners.set(t, new Set()).get(t)!).add(i); } });
  const uniqueOwner = (tok: string): number => { const o = owners.get(tok); return o && o.size === 1 ? [...o][0] : -1; };
  const aliasesOf = (i: number) => new Set(tokenSet(roster[i]).filter((t) => t.length >= 3 && !TITLES.has(t)));

  /** Which character does this line start with (after list marks, markdown and titles)? */
  function lineOwner(line: string): { idx: number; rest: string; head: string } | null {
    const body = line.replace(LEAD, "");
    const toks = body.split(/\s+/);
    let k = 0;
    while (k < toks.length - 1 && TITLES.has(fold(toks[k]).replace(/[^\p{L}]/gu, ""))) k++;
    // "Theo/Thea" (dual-gender cast names): any slash part that is a unique alias identifies the line
    const parts = (t: string) => fold(t ?? "").split("/").map((x) => x.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
    let idx = -1;
    for (const part of parts(toks[k])) { const u = uniqueOwner(part); if (u >= 0) { idx = u; break; } }
    if (idx < 0) return null;
    // consume the rest of the name: further tokens of the same character, nicknames in quotes or parentheses, slashes
    const aliases = aliasesOf(idx);
    let j = k + 1;
    while (j < toks.length) {
      const ps = parts(toks[j]);
      if (ps.length && ps.every((x) => aliases.has(x))) { j++; continue; }
      if (/^[("'‘“\/]/.test(toks[j]) && !/played/i.test(toks[j]) && toks[j].length < 24) { j++; continue; }
      break;
    }
    return { idx, head: toks.slice(0, j).join(" "), rest: toks.slice(j).join(" ") };
  }
  const isBlurb = (rest: string) => rest.replace(/^\*\*|^[\s*_:,\-–—)(]+/g, "").replace(/\(?played by [^)]*\)?/i, "").replace(/^[\s*_:,\-–—)]+/, "").length >= 25;

  /** Does this line name a character other than the viewer (a unique alias of 4+ letters)? */
  const recognisedOthers = (line: string): boolean => {
    const ws = new Set(words(line));
    for (const [tok, set] of owners) if (set.size === 1 && !set.has(own) && tok.length >= 4 && ws.has(tok)) return true;
    return false;
  };

  const lines = chat.split("\n");
  const kept: string[] = [];
  const guard = culpritRegex(ctx.culprits);
  let blurbsFound = 0;
  let blockOwner = -1;      // inside a heading block of another character
  let dropSection = false;  // inside a solution section
  let sectionLevelBlank = 0;

  // Pass 0: how many roster members have a recognisable blurb line? (decides whether the list was recognised at all)
  const seen = new Set<number>();
  for (const l of lines) { const o = lineOwner(l); if (o && isBlurb(o.rest)) seen.add(o.idx); }
  blurbsFound = seen.size;
  const recognised = roster.length < 3 ? true : blurbsFound >= Math.ceil(roster.length / 2);
  if (!recognised) out.flags.push("character-list-not-recognised");

  for (const line of lines) {
    const isHeading = HEADING.test(line);
    const blank = line.trim() === "";
    // solution sections end at the next heading of any kind
    if (dropSection) {
      if (isHeading && !SOLUTION_HEADING.test(line)) dropSection = false;
      else if (isHeading) { out.droppedSections++; continue; }
      else continue;
    }
    if (isHeading && SOLUTION_HEADING.test(line) && !NOT_SOLUTION.test(line)) { dropSection = true; out.droppedSections++; blockOwner = -1; continue; }

    const o = recognised ? lineOwner(line) : null;
    if (blockOwner >= 0) {
      // a heading block of another character: drop body lines until the next heading, blurb line or separator
      const startsNew = isHeading || (o && o.idx !== blockOwner && isBlurb(o.rest));
      if (!startsNew) { if (!blank) continue; else { kept.push(line); continue; } }
      blockOwner = -1;
    }
    if (o && o.idx !== own) {
      if (isBlurb(o.rest)) {
        const played = line.match(/\(?played by [^)]*\)?/i);
        const lead = line.match(LEAD)![0];
        kept.push(`${lead}${o.head.replace(/^(\*\*|__)/, "")}${played && !o.head.includes("played") ? " " + played[0] : ""} - [details withheld]`.replace(/\s+\*\*\s*-/, " -"));
        out.redactedBlurbs++;
        continue;
      }
      if (isHeading || /^\s*(?:#{1,6}\s+|\*\*)/.test(line)) {  // name-only heading: the paragraph(s) below describe this character
        kept.push(line); out.withheldBlocks++; blockOwner = o.idx; kept.push("[details withheld]");
        continue;
      }
    }
    if (options.strict && recognisedOthers(line)) {
      if (kept[kept.length - 1] !== "[details withheld]") kept.push("[details withheld]");
      out.withheldBlocks++;
      continue;
    }
    // sentence scrub: a sentence that names the murderer or accomplice next to a guilt word goes
    let text = line;
    if (guard && own !== -2) {
      const sentences = line.split(/(?<=[.!?…])\s+/);
      const keep = sentences.filter((s) => { guard.lastIndex = 0; return !(guard.test(fold(s)) && GUILT.test(s)); });
      if (keep.length < sentences.length) { out.droppedSentences += sentences.length - keep.length; text = keep.join(" "); if (!text.trim()) continue; }
    }
    // residual: another character named in a line with a secret cue (left in place, reported)
    if (CUE.test(text)) {
      const ws = new Set(words(text));
      for (const [tok, set] of owners) if (set.size === 1 && !set.has(own) && ws.has(tok) && tok.length >= 4) {
        out.residual.push(text.trim().slice(0, 160));
        if (dropResidual) { text = "[details withheld]"; out.withheldBlocks++; }
        break;
      }
    }
    kept.push(text);
  }
  out.text = kept.join("\n");
  if (out.residual.length) out.flags.push(`residual:${out.residual.length}`);
  return out;
}

/** The hidden text the design holds about OTHER characters (their wronged-by-victim entries and character-specific details). */
export function otherCharactersHiddenText(masterContext: string, characterName: string): string[] {
  let mc: Record<string, any>;
  try { mc = parseMasterContext(masterContext) as Record<string, any>; } catch { return []; }
  const out: string[] = [];
  for (const w of mc.victimProfile?.wrongedEachCharacter ?? []) {
    if (!sameCharacter(String(w.character ?? ""), characterName) && w.howVictimWrongedThem) out.push(String(w.howVictimWrongedThem));
  }
  for (const d of mc.conversationDetailsExtraction?.characterSpecificDetails ?? []) {
    if (sameCharacter(String(d.character ?? ""), characterName)) continue;
    const t = [d.threatsOrPressures, d.pastEvents, d.otherDetails, d.financialDetails].filter(Boolean).join(" ");
    if (t) out.push(t);
  }
  return out;
}

const runSet = (t: string, n = 6): Set<string> => {
  const w = fold(t).replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
  const s = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(" "));
  return s;
};

/** How many of the other characters' hidden texts still share a 6-word run with this chat text. */
export function hiddenSurvivors(text: string, hiddenTexts: string[]): number {
  const have = runSet(text);
  let n = 0;
  for (const h of hiddenTexts) for (const r of runSet(h)) if (have.has(r)) { n++; break; }
  return n;
}

/** Normal redaction; if the design's hidden text about other characters still shows in the result, redo it strictly and say so in `flags`. */
export function buildCharacterChatSafe(chat: string, characterName: string, role: string, ctx: ChatContext, hiddenTexts: string[]): ChatResult & { survivors: number } {
  const first = buildCharacterChat(chat, characterName, role, ctx);
  const s1 = hiddenSurvivors(first.text, hiddenTexts);
  if (s1 === 0) return { ...first, survivors: 0 };
  const strict = buildCharacterChat(chat, characterName, role, ctx, { strict: true });
  const s2 = hiddenSurvivors(strict.text, hiddenTexts);
  strict.flags.push(`strict (survivors ${s1} -> ${s2})`);
  return { ...strict, survivors: s2 };
}
