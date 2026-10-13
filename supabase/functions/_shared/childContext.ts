// ADR-0156 Phase 3: the seam between the pure redaction functions (characterContext.ts, characterChat.ts) and the two callers that hand a
// detective character's inputs to a model: the Make Child scenario (through the child-context edge function) and regenerate-child-content.
// Pure, no Deno APIs, no I/O, no LLM. One rule above all: this never returns a blank or partial sheet's worth of input. Whenever anything is
// doubtful the result is `redacted: false`, which means "the caller keeps the full inputs it already has" (today's behaviour), plus a reason.
import { buildCharacterContext, CharacterContextError, parseMasterContext, sameCharacter } from "./characterContext.ts";
import { buildCharacterChatSafe, otherCharactersHiddenText } from "./characterChat.ts";

/** pipeline_settings.child_context_redaction. `off` is today's behaviour; `test_only` redacts only packages whose conversation is_test. */
export type RedactionMode = "on" | "off" | "test_only";
/** Anything unknown, empty or misspelt is `off`: the switch fails to today's behaviour, never to a surprise. */
export const parseMode = (v: unknown): RedactionMode => (v === "on" || v === "test_only" ? v : "off");

/** Where the Make HTTP module splits its raw text body: packageId, characterName, characterChatExcerpts, conversationContent. */
export const BODY_SEPARATOR = "\n<<<CHILD-CONTEXT-PART-7c2e91>>>\n";

export interface ChildContextRequest { packageId: string; characterName: string; excerpt: string; conversation: string }

export function parseRequestBody(text: string): ChildContextRequest | null {
  const parts = String(text ?? "").split(BODY_SEPARATOR);
  if (parts.length !== 4) return null;
  const packageId = parts[0].trim();
  const characterName = parts[1].trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packageId) || !characterName) return null;
  return { packageId, characterName, excerpt: parts[2], conversation: parts[3] };
}

const FULL_ROLES = new Set(["murderer", "accomplice"]);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

export interface DesignPeople { murderer?: string; accomplice?: string; roster: string[]; mysteryType?: string }

/** Who the design says the culprits are and who is in the cast (full names, from wrongedEachCharacter, else characterSpecificDetails). */
export function designPeople(mc: Record<string, unknown>): DesignPeople {
  const ms = isObj(mc.murdererSelection) ? mc.murdererSelection : {};
  const as = isObj(mc.accompliceSelection) ? mc.accompliceSelection : {};
  const ad = isObj(mc.accompliceDetails) ? mc.accompliceDetails : {};
  const names = (v: unknown): string[] => (Array.isArray(v) ? v : []).map((e) => (isObj(e) ? String(e.character ?? e.characterName ?? "") : "")).filter(Boolean);
  const vp = isObj(mc.victimProfile) ? mc.victimProfile : {};
  const cd = isObj(mc.conversationDetailsExtraction) ? mc.conversationDetailsExtraction : {};
  const roster: string[] = [];
  for (const n of [...names(vp.wrongedEachCharacter), ...names(cd.characterSpecificDetails)]) if (!roster.some((r) => sameCharacter(r, n))) roster.push(n);
  return {
    murderer: str(ms.character) ?? str(ms.characterName),
    accomplice: str(as.character) ?? str(as.characterName) ?? str(ad.character) ?? str(ad.accompliceName),
    roster,
    mysteryType: str(mc.mysteryType),
  };
}

/** murderer | accomplice | redHerring | suspect, from the design itself (never from a model). Throws CharacterContextError on an unreadable design. */
export function deriveRole(masterContext: string, characterName: string): string {
  const mc = parseMasterContext(masterContext);
  const p = designPeople(mc);
  if (p.murderer && sameCharacter(characterName, p.murderer)) return "murderer";
  if (p.accomplice && sameCharacter(characterName, p.accomplice)) return "accomplice";
  const vp = isObj(mc.victimProfile) ? mc.victimProfile : {};
  const own = (Array.isArray(vp.wrongedEachCharacter) ? vp.wrongedEachCharacter : []).find((e) => isObj(e) && sameCharacter(String(e.character ?? ""), characterName));
  if (isObj(own) && (own.isRedHerring === true || own.isRedHerring === "true")) return "redHerring";
  return "suspect";
}

export interface PrepareInput {
  mode: RedactionMode;
  /** conversations.is_test of the package (only read for `test_only`). */
  isTest: boolean;
  mysteryStyle: string | null | undefined;
  masterContext: string;
  characterName: string;
  /** mystery_characters.character_role when a row already exists (regeneration); the design decides when it is missing. */
  storedRole?: string | null;
  /** The two chat texts the Child receives today. Blank texts are passed through untouched. */
  excerpt?: string;
  conversation?: string;
}

export interface PrepareResult {
  /** true: use the returned context / excerpt / chat. false: keep the full inputs you already hold (today's behaviour). */
  redacted: boolean;
  role: string | null;
  context: string | null;
  excerpt: string | null;
  chat: string | null;
  flags: string[];
  /** Why the full inputs are being kept although redaction was wanted. Null when redacted, or when the switch/role decided. */
  fallback: { reason: string; alert: boolean } | null;
  sizes?: { contextBefore: number; contextAfter: number; chatBefore: number; chatAfter: number };
}

/** An innocent whose redacted design is smaller than this is almost certainly starved (real ones are 4,500 to 11,200 characters). */
export const MIN_CONTEXT_CHARS = 1500;

const keepFull = (flags: string[], role: string | null = null): PrepareResult => ({ redacted: false, role, context: null, excerpt: null, chat: null, flags, fallback: null });
const fallback = (reason: string, alert: boolean, role: string | null, flags: string[] = []): PrepareResult => ({
  redacted: false, role, context: null, excerpt: null, chat: null, flags: [...flags, `fallback:${reason}`], fallback: { reason, alert },
});

export function prepareChildInputs(input: PrepareInput): PrepareResult {
  const { mode, characterName } = input;
  if (mode === "off") return keepFull(["switch-off"]);
  if (mode === "test_only" && !input.isTest) return keepFull(["test-only-skip"]);
  if (input.mysteryStyle !== "detective") return keepFull(["not-detective"]);

  // 1. The design must be readable and the role known. Doubt about the role resolves toward the FULL context: a starved culprit writes a wrong
  //    confession (worse), an innocent who keeps today's full context is only as leaky as today.
  let derived: string;
  let people: DesignPeople;
  let mc: Record<string, unknown>;
  try {
    mc = parseMasterContext(input.masterContext);
    people = designPeople(mc);
    derived = deriveRole(input.masterContext, characterName);
  } catch (e) {
    if (e instanceof CharacterContextError) return fallback("unreadable-design", true, null, [e.message.slice(0, 120)]);
    throw e;
  }
  const stored = String(input.storedRole ?? "").trim();
  const storedCulprit = FULL_ROLES.has(stored.toLowerCase());
  if (FULL_ROLES.has(derived) || storedCulprit) {
    const flags = ["culprit-full"];
    if (FULL_ROLES.has(derived) !== storedCulprit && stored) flags.push(`role-mismatch:stored=${stored},design=${derived}`);
    return keepFull(flags, storedCulprit && !FULL_ROLES.has(derived) ? stored : derived);
  }
  if (people.mysteryType === "intrigue") return fallback("unsupported-intrigue", false, derived);
  // An innocent whose design names no murderer at all would be treated as "everyone is innocent": that is a malformed design, not a redaction case.
  if (!people.murderer) return fallback("design-names-no-murderer", true, derived);

  // 2. The redacted design.
  let ctx;
  try {
    ctx = buildCharacterContext(input.masterContext, characterName, derived, { visibleMurderer: "omit" });
  } catch (e) {
    if (e instanceof CharacterContextError) return fallback(/unsupported schema/.test(e.message) ? "unsupported-schema" : "unreadable-design", true, derived, [e.message.slice(0, 120)]);
    throw e;
  }
  if (ctx.dropped.some((d) => d.includes("[self] (NOT FOUND)"))) return fallback("own-entry-not-found", true, derived);
  if (ctx.context.length < MIN_CONTEXT_CHARS) return fallback("context-too-small", true, derived, [`chars:${ctx.context.length}`]);

  // 3. The chat(s). A blank text has nothing to redact and is not judged.
  const culprits = [people.murderer, people.accomplice].filter((x): x is string => !!x);
  const hidden = otherCharactersHiddenText(input.masterContext, characterName);
  const chatCtx = { roster: people.roster, culprits };
  const flags: string[] = [];
  const runChat = (text: string | undefined, label: string): string => {
    if (!text || !text.trim()) return text ?? "";
    const r = buildCharacterChatSafe(text, characterName, derived, chatCtx, hidden);
    for (const f of r.flags) flags.push(`${label}:${f}`);
    if (r.flags.includes("self-not-in-roster")) throw new ChatDoubt("self-not-in-roster");
    // The character list could not be recognised AND the other characters' hidden text is still in the chat after the strict pass:
    // there is something to redact and no way to do it. (An unrecognised list in a chat that holds nothing hidden is harmless.)
    if (r.flags.includes("character-list-not-recognised") && r.survivors > 0) throw new ChatDoubt("chat-list-not-recognised");
    return r.text;
  };
  let excerptOut: string, chatOut: string;
  try {
    excerptOut = runChat(input.excerpt, "excerpt");
    chatOut = runChat(input.conversation, "chat");
  } catch (e) {
    if (e instanceof ChatDoubt) return fallback(e.reason, true, derived, flags);
    throw e;
  }

  const before = (input.excerpt ?? "").length + (input.conversation ?? "").length;
  return {
    redacted: true, role: derived, context: ctx.context, excerpt: excerptOut, chat: chatOut, flags, fallback: null,
    sizes: { contextBefore: input.masterContext.length, contextAfter: ctx.context.length, chatBefore: before, chatAfter: excerptOut.length + chatOut.length },
  };
}

class ChatDoubt extends Error {
  reason: string;
  constructor(reason: string) { super(reason); this.reason = reason; }
}

/** regenerate-child-content: the strings to put in its prompt. Falls back to the originals whenever `prepareChildInputs` says so. */
export function inputsForRegeneration(opts: {
  mode: RedactionMode; isTest: boolean; mysteryStyle: string | null | undefined; masterContext: string; transcript: string; characterName: string; storedRole?: string | null;
}): { masterContext: string; transcript: string; prep: PrepareResult } {
  let prep: PrepareResult;
  try {
    prep = prepareChildInputs({ mode: opts.mode, isTest: opts.isTest, mysteryStyle: opts.mysteryStyle, masterContext: opts.masterContext, characterName: opts.characterName, storedRole: opts.storedRole, conversation: opts.transcript });
  } catch (e) {
    // Never let the redaction layer break a heal: keep today's inputs.
    prep = fallback("exception", true, null, [String((e as Error)?.message ?? e).slice(0, 120)]);
  }
  return prep.redacted
    ? { masterContext: prep.context as string, transcript: prep.chat as string, prep }
    : { masterContext: opts.masterContext, transcript: opts.transcript, prep };
}
