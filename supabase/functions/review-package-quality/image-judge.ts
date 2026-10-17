// Pure, dependency-free core of the evidence-image judge (ADR-0165). No Deno or network APIs: tested with plain node (image-judge.test.mjs).
//
// Why: Flux turns "handwriting" on a document card (Leverage List, seating chart) into pseudo-words, and nothing looked at an image after it
// was generated; a sweep caught it by eye (Till Death Do Us Part-y, 2026-10-16, 2 of 3 images). A vision model judges each image against the
// evidence card it illustrates before the customer is released to see it; a failing image is re-rolled with a prompt that asks for no letters.

export type ReadableText = "none" | "real_words_only" | "some_gibberish" | "mostly_gibberish";
export type Match = "yes" | "partly" | "no";
export type Judge = { transcription: string; readable_text: ReadableText; watermark_or_logo: boolean; subject_matches_card: Match; problems: string; retry_prompt: string };
export type Candidate = { url?: string; judge: Judge; pass: boolean; score: number; label: string };

/** Haiku 4.5 price table, USD per million tokens (2026-10). Used for the logged cost only. */
export const JUDGE_PRICE = { in: 1.0, out: 5.0 };
export const DEFAULT_JUDGE_MODEL = "claude-haiku-4-5-20251001";
export const MAX_REROLLS_PER_ROUND = 2;
export const JUDGE_BUDGET_MS = 120_000;
export const REROLL_COST_USD = 0.04;

export const JUDGE_SYSTEM = [
  "You check one evidence-card image for a printed murder mystery party game. The image illustrates the card described below and will be printed and shown to guests.",
  "Look only at the image and answer through the report tool.",
  "transcription comes FIRST and is mandatory: copy every line of lettering you can see on the object exactly as the letters appear, character by character, one line per row. Do NOT correct, complete or guess words; if a stroke group does not form a clear word, write what the letters literally look like. Write NONE if there is no lettering. Image models often paint convincing handwriting that is really nonsense, so judge the transcription, not the look.",
  "readable_text, decided from your transcription: none = NONE or only marks that are plainly not letters; real_words_only = every transcribed line is correctly spelled, grammatical English (a printed heading such as 'LEVERAGE LIST' is fine); some_gibberish = at least one line or word is a non-word, misspelled or makes no sense as a sentence; mostly_gibberish = most lines are like that. A line such as 'Take love wild dy in coffee list' is gibberish. Tiny smudged marks too small to be read at all are not gibberish.",
  "watermark_or_logo: true only for a visible watermark, stock-photo mark, logo or caption that does not belong on the object.",
  "subject_matches_card: yes when the main object the card describes is the main object in the image; partly when it is similar but differs in a detail (a tumbler where the card says flute); no when the image shows something else. When the card text names a specific identity detail (which playing card, a name, a number, a colour) and the image shows a different one, answer no: the evidence would then point at the wrong person. A Joker is a jester figure and never a Jack, Queen, King or Ace with suit symbols and corner indices; a card of the wrong rank or suit is no.",
  "problems: one short sentence, empty when there are none.",
  "retry_prompt: always fill it. Write a prompt of at most 90 words for an image model that shows the same object as a cinematic low-key forensic photograph with nothing written anywhere. Image models cannot spell, and a page that is meant to carry writing comes out as pseudo-words even when you ask for bars or scribbles. So show a note, list, letter, page or card from its BLANK reverse side, folded or heavily crumpled, with the stains, coffee rings, torn edges, clips and props from the card around it (a pen, a clip); show a chart or plan only as plain circles and outlines with no labels. Never use the words lipstick, blood, body or nude (they trigger the safety filter): say red ink stain instead. Describe ONLY what is visible (for example: a plain, blank, unmarked reverse side) and NEVER mention writing, text, words, letters, headings, numbers or handwriting at all, not even to forbid them: the image model treats any such mention as a request to draw it. No watermark; no people. Keep the object, setting, stains and mood from the card, and never name a word that should appear on it. For a playing card, describe a full-bleed illustration filling the whole card face edge to edge (a smiling jester for a Joker); never mention indices, pips, suits or corner marks, because the image model draws whatever it is told about.",
].join("\n");

export const JUDGE_TOOL = {
  name: "report",
  description: "Report the verdict on the evidence-card image.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["transcription", "readable_text", "watermark_or_logo", "subject_matches_card", "problems", "retry_prompt"],
    properties: {
      transcription: { type: "string" },
      readable_text: { type: "string", enum: ["none", "real_words_only", "some_gibberish", "mostly_gibberish"] },
      watermark_or_logo: { type: "boolean" },
      subject_matches_card: { type: "string", enum: ["yes", "partly", "no"] },
      problems: { type: "string" },
      retry_prompt: { type: "string" },
    },
  },
} as const;

export function judgeUserText(card: { title: string; description: string }): string {
  return `EVIDENCE CARD\nTitle: ${card.title}\nDescription: ${card.description}\n\nJudge the image.`;
}

const READABLE: ReadableText[] = ["none", "real_words_only", "some_gibberish", "mostly_gibberish"];
const MATCH: Match[] = ["yes", "partly", "no"];

/** Validate and normalise the tool input. Anything unusable is null (the caller treats the image as unjudged, never as failed). */
export function parseJudge(input: unknown): Judge | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (!READABLE.includes(o.readable_text as ReadableText)) return null;
  if (!MATCH.includes(o.subject_matches_card as Match)) return null;
  if (typeof o.watermark_or_logo !== "boolean") return null;
  return {
    transcription: typeof o.transcription === "string" ? o.transcription.slice(0, 600) : "",
    readable_text: o.readable_text as ReadableText,
    watermark_or_logo: o.watermark_or_logo,
    subject_matches_card: o.subject_matches_card as Match,
    problems: typeof o.problems === "string" ? o.problems.slice(0, 300) : "",
    retry_prompt: typeof o.retry_prompt === "string" ? o.retry_prompt.trim().slice(0, 900) : "",
  };
}

/** Pass: no gibberish text, no watermark, and the main subject is not the wrong object. "partly" passes (a re-roll costs 0.04 and may be no better). */
export const judgePasses = (j: Judge): boolean =>
  (j.readable_text === "none" || j.readable_text === "real_words_only") && !j.watermark_or_logo && j.subject_matches_card !== "no";

/** 10 is clean. Used only to keep the best candidate when no attempt passes. */
export function judgeScore(j: Judge): number {
  let s = 10;
  if (j.readable_text === "some_gibberish") s -= 4;
  if (j.readable_text === "mostly_gibberish") s -= 6;
  if (j.watermark_or_logo) s -= 3;
  if (j.subject_matches_card === "partly") s -= 1;
  if (j.subject_matches_card === "no") s -= 4;
  return s;
}

/** The re-roll prompt: the judge's own retry prompt (a description of what is visible, never of writing) plus a plain-surfaces line. Falls back to a generic one built from the card. */
export function rerollPrompt(j: Judge, card: { title: string; description: string }, attempt: number): string {
  // Drop every sentence that mentions writing, even to forbid it: Flux has no negative prompt and draws what it is told about.
  const stripWriting = (s: string) => s.split(/(?<=[.!?])\s+/).filter((x) => !/\b(text|texts|writing|written|words?|letters?|lettering|numbers?|headings?|handwriting|handwritten|legible|readable|scribbles?|ink bars?|ruled)\b/i.test(x)).join(" ");
  const cleaned = stripWriting(j.retry_prompt.replace(/lipstick/gi, "red ink").replace(/\s+/g, " ").trim()); // "lipstick smudge" was rejected as NSFW twice (2026-10-16)
  const base = cleaned.length >= 60
    ? cleaned
    : `Cinematic low-key forensic photograph of the object from an evidence card titled "${card.title}", seen from its plain blank reverse side, crumpled and stained, on a dark polished table with dramatic warm side lighting and shallow depth of field.`;
  // Re-rolls that mentioned writing failed 5 of 5; a prompt describing only a blank reverse side was clean (2026-10-16). The attempt number only changes Flux's seed.
  void attempt;
  return `${base} Every surface is plain, unmarked and blank.`.slice(0, 1200);
}

/** Highest score wins; on a tie the earlier candidate (the original) is kept so nothing is swapped for no gain. */
export function pickBest(cands: Candidate[]): number {
  let best = 0;
  for (let i = 1; i < cands.length; i++) if (cands[i].score > cands[best].score) best = i;
  return best;
}

export const judgeCostUsd = (u: { input_tokens?: number; output_tokens?: number }): number =>
  ((u.input_tokens ?? 0) * JUDGE_PRICE.in + (u.output_tokens ?? 0) * JUDGE_PRICE.out) / 1_000_000;

/** Prompt suffix appended by generate-evidence-images (v16). Keep in step with that function's copy. */
export const NO_HANDWRITING_SUFFIX = " Any handwriting or small print is rendered as loose illegible ink scribble marks, never as readable words; at most one short printed heading; no paragraphs of text; no watermark.";
