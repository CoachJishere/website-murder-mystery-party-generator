// Per-character context for the detective Child (ADR-0156 Phase 1). Pure, no Deno APIs, no LLM, no I/O.
// Gives each non-culprit character an allowlist-built slice of master_context instead of the whole design (solution, culprit lies,
// everyone's secrets). Murderer and accomplice get the text unchanged. Nothing calls this yet: Phase 1 only proves what the
// function hands over, not that the model then leaks less.
import { buildVariantRegex, nameVariants } from "./nameVariants.ts";

export interface CharacterContextResult {
  /** JSON text, one object. For murderer/accomplice it is the input string unchanged. */
  context: string;
  /** Paths that were NOT passed on (unknown top-level keys, known-but-excluded nested keys, filtered entries). */
  dropped: string[];
  /** Paths that were passed on. */
  kept: string[];
}

/** Thrown when master_context cannot be read. Callers must decide the fallback; this function never returns the full text for an innocent. */
export class CharacterContextError extends Error {}

type Obj = Record<string, unknown>;

// ---------------------------------------------------------------------------------------------------------------------------------
// Parsing. master_context is two JSON objects concatenated (Part 1 planning, Part 2 gameplay). Brace-depth splitter that knows strings.
// ---------------------------------------------------------------------------------------------------------------------------------
export function parseMasterContext(text: string): Obj {
  const merged: Obj = {};
  let i = 0;
  let parts = 0;
  const n = text.length;
  while (i < n) {
    while (i < n && /\s/.test(text[i])) i++;
    if (i >= n) break;
    if (text[i] !== "{") throw new CharacterContextError(`master_context: expected "{" at offset ${i}`);
    let depth = 0, inStr = false, esc = false, j = i;
    for (; j < n; j++) {
      const ch = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) break;
    }
    if (depth !== 0) throw new CharacterContextError("master_context: unbalanced braces");
    let obj: unknown;
    try {
      obj = JSON.parse(text.slice(i, j + 1));
    } catch (e) {
      throw new CharacterContextError(`master_context: invalid JSON (${(e as Error).message})`);
    }
    Object.assign(merged, obj as Obj);
    parts++;
    i = j + 1;
  }
  if (parts === 0) throw new CharacterContextError("master_context: empty");
  return merged;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------------------------------------------------------------
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Paulina Guzmán ('La Sirena')" -> base "Paulina Guzmán" and extra "La Sirena". Quotes inside names ("Jazz-Jo") are kept as extras. */
function nameParts(raw: string): { base: string; extras: string[] } {
  const extras: string[] = [];
  let base = raw;
  for (const m of raw.matchAll(/[(“"'‘]([^()"'”’]{3,})[)”"'’]/g)) extras.push(m[1].trim());
  base = raw.replace(/\([^)]*\)/g, " ").replace(/["“”]([^"“”]*)["“”]/g, " ").split(",")[0].replace(/\s+/g, " ").trim(); // "Elara Voss, Royal Apothecary" -> "Elara Voss"
  return { base: base || raw.trim(), extras };
}

/** Full-name forms of a character used to match an entry to a character (no bare-surname fallbacks: two Ashworths must not merge). */
function fullForms(raw: string): Set<string> {
  const { base } = nameParts(raw);
  const forms = new Set<string>([fold(base)]);
  const slash = base.match(/^(.*?)\/(\S+)( .*)?$/);
  if (slash) {
    forms.add(fold(`${slash[1]}${slash[3] ?? ""}`.trim()));
    forms.add(fold(`${slash[2]}${slash[3] ?? ""}`.trim()));
    forms.add(fold(`${slash[1]}/${slash[2]}`));
  }
  return forms;
}

const TITLE = /^(?:dr|mr|mrs|ms|prof|professor|lady|lord|sir|dame|captain|kaptajn|chef|camper|officer|inspector|detective|madame|monsieur|senor|senora|don|dona|herr|frau|fru|greve|baronesse|konsul|bedstemor)\.?$/;
const stripTitle = (f: string) => f.split(/\s+/).filter((t, idx, a) => !(idx < a.length - 1 && TITLE.test(t))).join(" ");

/** Folded, title-stripped word set of a name, nickname words included ("Josephine 'Josie' Beaumont" -> josephine, josie, beaumont). */
export function tokenSet(raw: string): string[] {
  const { base, extras } = nameParts(raw);
  const words = [...fullForms(raw)].flatMap((f) => stripTitle(f).split(/[\s/]+/)).concat(extras.flatMap((e) => fold(e).split(/\s+/)));
  return [...new Set(words.filter(Boolean))];
}

export function sameCharacter(a: string, b: string): boolean {
  if (!a || !b) return false;
  const fa = fullForms(a), fb = fullForms(b);
  for (const x of fa) if (fb.has(x)) return true;
  // One side may omit a title, a middle name or use the nickname: the smaller word set must sit inside the bigger (>= 2 words, or one long word).
  const ta = tokenSet(a), tb = tokenSet(b);
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const enough = small.length >= 2 || (small.length === 1 && small[0].length >= 5);
  return enough && small.every((w) => big.includes(w));
}

/** Regex matching any name variant of the given characters (full name, nickname, first name, surname), diacritics ignored at match time. */
export function culpritRegex(names: string[]): RegExp | null {
  const variants = new Set<string>();
  for (const raw of names) {
    const { base, extras } = nameParts(raw);
    for (const v of nameVariants(base)) variants.add(fold(v));
    // Every non-title word of 4+ letters ("Camper Daisy Higgins" -> daisy, higgins): nameVariants alone would pick the title "Camper".
    for (const w of fold(base).replace("/", " ").split(/\s+/)) if (w.length >= 4 && !TITLE.test(w)) variants.add(w);
    for (const e of extras) variants.add(fold(e));
  }
  // A bare title ("chef", "camper") is a common word, not the character.
  const list = [...variants].filter((v) => v.length >= 3 && !TITLE.test(v));
  return list.length ? buildVariantRegex(list) : null;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------------------
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const entryName = (e: unknown): string => (isObj(e) ? String(e.character ?? e.characterName ?? "") : "");

class Tracker {
  kept: string[] = [];
  dropped: string[] = [];
  keep(p: string) { this.kept.push(p); }
  drop(p: string) { this.dropped.push(p); }
}

/** Copy the named keys of src into a new object; report every other key of src as dropped. */
function pick(src: Obj, allowed: string[], path: string, t: Tracker): Obj {
  const out: Obj = {};
  for (const k of Object.keys(src)) {
    if (allowed.includes(k)) {
      if (src[k] !== undefined && src[k] !== null && src[k] !== "") { out[k] = src[k]; t.keep(`${path}.${k}`); }
    } else t.drop(`${path}.${k}`);
  }
  return out;
}

/** Public narrative text: any sentence that names the murderer or accomplice is removed (the field stays, minus those sentences). */
function scrub(text: string, rx: RegExp | null, path: string, t: Tracker): string | undefined {
  if (!rx) { t.keep(path); return text; }
  const sentences = text.split(/(?<=[.!?…])\s+/);
  const keep = sentences.filter((s) => { rx.lastIndex = 0; return !rx.test(fold(s)); });
  if (keep.length < sentences.length) t.drop(`${path} (${sentences.length - keep.length} sentence(s) naming the murderer or accomplice)`);
  if (!keep.length) return undefined;
  t.keep(path);
  return keep.join(" ");
}

const FULL_ROLES = new Set(["murderer", "accomplice"]);
/** Parent86 asks for 8 to 25 words. Anything much longer is a model explaining the act, so the text is not used (fail closed to the old behaviour). */
const MAX_OBSERVER_WORDS = 45;

// ---------------------------------------------------------------------------------------------------------------------------------
// The allowlist. Anything not named here is dropped, including keys the Parent adds in future.
// ---------------------------------------------------------------------------------------------------------------------------------
export interface CharacterContextOptions {
  /**
   * What a character who can see the murderer is told about the murderer's position when the entry has NO `whatAnObserverSees` text
   * (packages made before Parent86): "claimed" (default, the stated alibi, same shape as other entries) or "omit" (no entry at all).
   * An entry that carries `whatAnObserverSees` is always given as that text and this option is ignored for it.
   */
  visibleMurderer?: "claimed" | "omit";
}

export function buildCharacterContext(masterContext: string, characterName: string, role: string, options: CharacterContextOptions = {}): CharacterContextResult {
  const normRole = String(role ?? "").trim().toLowerCase();
  // Culprits and accomplices must lie consistently and confess correctly: they get the design as stored, not even re-serialised.
  if (FULL_ROLES.has(normRole)) return { context: masterContext, dropped: [], kept: ["*"] };

  // Any other role, including an unknown or empty one, is treated as an innocent: fail closed.
  const mc = parseMasterContext(masterContext);
  // The classic detective schema only. The "intrigue" variant (2 of the 14 recent packages) has a different shape (pair-list matrix,
  // characterLocations, no wrongedEachCharacter), and a thin guess at it would silently starve the character. Fail loudly instead.
  const vpCheck = isObj(mc.victimProfile) ? mc.victimProfile : {};
  const cdCheck = isObj(mc.conversationDetailsExtraction) ? mc.conversationDetailsExtraction : {};
  if (
    mc.mysteryType === "intrigue" || typeof mc.relationshipMatrix !== "string" ||
    !Array.isArray(vpCheck.wrongedEachCharacter) || !Array.isArray(cdCheck.characterSpecificDetails)
  ) throw new CharacterContextError("master_context: unsupported schema (expected the classic detective design)");
  const t = new Tracker();
  const out: Obj = {};

  // Who the culprits are, from the design itself (not from the viewer's role).
  const ms = isObj(mc.murdererSelection) ? mc.murdererSelection : {};
  const as = isObj(mc.accompliceSelection) ? mc.accompliceSelection : {};
  const ad = isObj(mc.accompliceDetails) ? mc.accompliceDetails : {};
  const murderer = str(ms.character) ?? str(ms.characterName);
  const accomplice = str(as.character) ?? str(as.characterName) ?? str(ad.character) ?? str(ad.accompliceName);
  const culpritNames = [murderer, accomplice].filter((x): x is string => !!x);
  const rx = culpritRegex(culpritNames);
  const isMurderer = (n: string) => !!murderer && sameCharacter(n, murderer);
  const isAccomplice = (n: string) => !!accomplice && sameCharacter(n, accomplice);
  const isSelf = (n: string) => sameCharacter(n, characterName);

  const KNOWN = new Set([
    "mysteryStyle", "mysteryType", "victimProfile", "relationshipMatrix", "murderMethod", "evidenceProgression", "timelineFramework",
    "conversationDetailsExtraction",
    // Known and deliberately excluded:
    "murdererSelection", "accompliceSelection", "accompliceDetails", "deceptionGuidelines", "hostBriefing", "motiveDistribution",
  ]);
  for (const k of Object.keys(mc)) if (!KNOWN.has(k)) t.drop(`${k} (unknown key)`);
  for (const k of ["murdererSelection", "accompliceSelection", "accompliceDetails", "deceptionGuidelines", "hostBriefing", "motiveDistribution"]) {
    if (k in mc) t.drop(k);
  }

  out.contextFor = { character: characterName, role: String(role ?? "").trim() || "suspect" };

  for (const k of ["mysteryStyle", "mysteryType"]) {
    const v = str(mc[k]);
    if (v) { out[k] = v; t.keep(k); }
  }

  // Victim: public profile only. activitiesAndSchemes named a culprit in 8 of 12 real packages and describes hidden wrongdoing: dropped.
  if (isObj(mc.victimProfile)) {
    const vp = mc.victimProfile;
    const o: Obj = {};
    const vname = str(vp.name);
    if (vname) { o.name = vname; t.keep("victimProfile.name"); }
    for (const k of ["role", "personality", "powerSource"]) {
      const v = str(vp[k]);
      if (v) { const s = scrub(v, rx, `victimProfile.${k}`, t); if (s) o[k] = s; }
    }
    for (const k of Object.keys(vp)) if (!["name", "role", "personality", "powerSource", "wrongedEachCharacter"].includes(k)) t.drop(`victimProfile.${k}`);
    if (Array.isArray(vp.wrongedEachCharacter)) {
      const own = vp.wrongedEachCharacter.find((e) => isSelf(entryName(e)));
      const others = vp.wrongedEachCharacter.length - (own ? 1 : 0);
      if (others > 0) t.drop(`victimProfile.wrongedEachCharacter (${others} other entries)`);
      if (own && isObj(own)) {
        // isMurderer / isRedHerring flags are dropped: the role is passed separately, and the flags are the solution in data form.
        o.wrongedEachCharacter = [pick(own, ["character", "howVictimWrongedThem", "motiveStrength"], "victimProfile.wrongedEachCharacter[self]", t)];
      } else t.drop("victimProfile.wrongedEachCharacter[self] (NOT FOUND)");
    }
    if (Object.keys(o).length) out.victimProfile = o;
  }

  out.relationshipMatrix = mc.relationshipMatrix;
  t.keep("relationshipMatrix");

  // Weapon only. execution, evidenceLeftBehind, methodDetails, whyMurdererCouldDoThis etc. are the solution.
  if (isObj(mc.murderMethod)) {
    const mm = mc.murderMethod;
    const w = str(mm.weapon);
    if (w) { const s = scrub(w, rx, "murderMethod.weapon", t); if (s) out.murderMethod = { weapon: s }; }
    for (const k of Object.keys(mm)) if (k !== "weapon") t.drop(`murderMethod.${k}`);
  }

  // Evidence: the item description of rounds 2 to 4, never what it reveals or implicates.
  if (isObj(mc.evidenceProgression)) {
    const ep = mc.evidenceProgression;
    const o: Obj = {};
    for (const r of ["round2", "round3", "round4"]) {
      const round = ep[r];
      if (!isObj(round)) continue;
      const item = str(round.item);
      if (item) { const s = scrub(item, rx, `evidenceProgression.${r}.item`, t); if (s) o[r] = { item: s }; }
      for (const k of Object.keys(round)) if (k !== "item") t.drop(`evidenceProgression.${r}.${k}`);
    }
    for (const k of Object.keys(ep)) if (!["round2", "round3", "round4"].includes(k)) t.drop(`evidenceProgression.${k}`);
    if (Object.keys(o).length) out.evidenceProgression = o;
  }

  // Timeline: public facts, then the position map filtered to what this character could observe.
  if (isObj(mc.timelineFramework)) {
    const tf = mc.timelineFramework;
    const o: Obj = {};
    for (const k of ["gatheringStarted", "specificEvents", "victimLastSeen", "bodyDiscovered"]) {
      const v = str(tf[k]);
      if (v) { const s = scrub(v, rx, `timelineFramework.${k}`, t); if (s) o[k] = s; }
    }
    const kmp = tf.keyMomentPositions;
    if (Array.isArray(kmp)) {
      const claimed = str(tf.murdererClaimedLocation);
      const seen: Obj[] = [];
      let scrubbedInOthers = 0;
      let observerUsed = 0;
      const viewerSees = (e: Obj) => Array.isArray(e.canBeSeenBy) && e.canBeSeenBy.some((n) => typeof n === "string" && isSelf(n));
      // Observer-safe text (ADR-0156 Phase 4, written by Parent86): what a bystander would literally see. Used instead of truePosition for
      // every entry this character can see, so a culprit's entry is the same kind of text as an innocent's. Absent, empty or too long: not used.
      const observer = new Map<Obj, string>();
      for (const e of kmp) {
        if (!isObj(e) || isSelf(entryName(e))) continue;
        const o = str(e.whatAnObserverSees)?.trim();
        if (!o) continue;
        if (o.split(/\s+/).length > MAX_OBSERVER_WORDS) { t.drop(`timelineFramework.keyMomentPositions[${entryName(e)}].whatAnObserverSees (over ${MAX_OBSERVER_WORDS} words, not used)`); continue; }
        observer.set(e, o);
      }
      // A culprit this character can see (with usable observer text) may be named in other entries; every other culprit name is still removed.
      const visibleCulprits = kmp.filter((e): e is Obj => isObj(e) && observer.has(e) && viewerSees(e) && (isMurderer(entryName(e)) || isAccomplice(entryName(e)))).map(entryName);
      const hiddenCulprits = culpritNames.filter((n) => !visibleCulprits.some((v) => sameCharacter(v, n)));
      const hiddenRx = culpritRegex(hiddenCulprits);
      const isHiddenCulprit = (n: string) => hiddenCulprits.some((h) => sameCharacter(h, n));
      const namesNoHidden = (v: unknown) => (Array.isArray(v) ? v : []).filter((n) => typeof n === "string" && !isHiddenCulprit(n));
      for (const e of kmp) {
        if (!isObj(e)) continue;
        const who = entryName(e);
        const canSee = viewerSees(e);
        const obs = observer.get(e);
        if (isSelf(who)) {
          seen.push({ character: e.character, position: e.truePosition, besideOrNear: e.besideOrNear ?? [], canBeSeenBy: e.canBeSeenBy ?? [] });
        } else if (canSee && obs) {
          const isCulpritEntry = isMurderer(who) || isAccomplice(who);
          // One sentence by design, so it is kept or withheld whole (splitting on full stops breaks "Dr. Quill").
          if (hiddenRx) hiddenRx.lastIndex = 0;
          const namesHidden = !!hiddenRx && hiddenRx.test(fold(obs));
          const near = namesNoHidden(e.besideOrNear);
          const by = namesNoHidden(e.canBeSeenBy);
          scrubbedInOthers += (namesHidden ? 1 : 0) + ((Array.isArray(e.besideOrNear) ? e.besideOrNear.length : 0) - near.length);
          if (isCulpritEntry && namesHidden) t.drop(`timelineFramework.keyMomentPositions[${who}] (observer text names another culprit this character cannot see)`);
          else { observerUsed++; seen.push({ character: e.character, position: namesHidden ? null : obs, besideOrNear: near, canBeSeenBy: by }); }
        } else if (canSee && isMurderer(who)) {
          // Entry without observer text (older package). Same shape as every other entry, so the culprit is not recognisable from the structure.
          if (options.visibleMurderer === "omit") t.drop(`timelineFramework.keyMomentPositions[${who}] (visible murderer, omitted by option)`);
          else if (claimed) seen.push({ character: e.character, position: claimed, besideOrNear: [], canBeSeenBy: [characterName] });
          else t.drop(`timelineFramework.keyMomentPositions[${who}] (visible murderer, no claimed position)`);
        } else if (canSee && isAccomplice(who)) {
          t.drop(`timelineFramework.keyMomentPositions[${who}] (visible accomplice, no observer text and no claimed position field exists)`);
        } else if (canSee) {
          // Another innocent's entry without observer text. What they did next to the culprit is the culprit's true position seen from the side,
          // and would contradict the stated position above, so sentences and neighbours naming a culprit are removed (the viewer's own entry is untouched).
          const pos = String(e.truePosition ?? "");
          const sentences = pos.split(/(?<=[.!?…])\s+/);
          const keepS = rx ? sentences.filter((x) => { rx.lastIndex = 0; return !rx.test(fold(x)); }) : sentences;
          const near = (Array.isArray(e.besideOrNear) ? e.besideOrNear : []).filter((n) => typeof n === "string" && !isMurderer(n) && !isAccomplice(n));
          scrubbedInOthers += (sentences.length - keepS.length) + ((Array.isArray(e.besideOrNear) ? e.besideOrNear.length : 0) - near.length);
          // When every sentence names a culprit the text is withheld, but who stood beside whom and who can see whom still travels (alibi witnesses).
          seen.push({ character: e.character, position: keepS.length ? keepS.join(" ") : null, besideOrNear: near, canBeSeenBy: e.canBeSeenBy ?? [] });
        }
      }
      if (scrubbedInOthers) t.drop(`timelineFramework.keyMomentPositions (${scrubbedInOthers} sentence(s) or neighbour(s) naming a culprit, removed from other characters' entries)`);
      if (observerUsed) t.keep(`timelineFramework.keyMomentPositions.whatAnObserverSees (${observerUsed} entries)`);
      if (seen.length) { o.keyMomentPositions = seen; t.keep(`timelineFramework.keyMomentPositions (${seen.length} of ${kmp.length})`); }
      t.drop(`timelineFramework.keyMomentPositions (${kmp.length - seen.length} not observable by this character)`);
    }
    for (const k of Object.keys(tf)) if (!["gatheringStarted", "specificEvents", "victimLastSeen", "bodyDiscovered", "keyMomentPositions"].includes(k)) t.drop(`timelineFramework.${k}`);
    if (Object.keys(o).length) out.timelineFramework = o;
  }

  // Conversation details: this character's own entry only.
  if (isObj(mc.conversationDetailsExtraction)) {
    const cd = mc.conversationDetailsExtraction;
    for (const k of Object.keys(cd)) if (k !== "characterSpecificDetails") t.drop(`conversationDetailsExtraction.${k}`);
    if (Array.isArray(cd.characterSpecificDetails)) {
      const own = cd.characterSpecificDetails.find((e) => isSelf(entryName(e)));
      const others = cd.characterSpecificDetails.length - (own ? 1 : 0);
      if (others > 0) t.drop(`conversationDetailsExtraction.characterSpecificDetails (${others} other entries)`);
      if (own && isObj(own)) {
        out.conversationDetailsExtraction = { characterSpecificDetails: [own] };
        t.keep("conversationDetailsExtraction.characterSpecificDetails[self]");
      } else t.drop("conversationDetailsExtraction.characterSpecificDetails[self] (NOT FOUND)");
    }
  }

  return { context: JSON.stringify(out, null, 2), dropped: t.dropped, kept: t.kept };
}
