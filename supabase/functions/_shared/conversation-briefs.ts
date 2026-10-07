/**
 * ADR-0144: customer-authored briefs written BEFORE the approved concept snapshot.
 *
 * `mystery-webhook-trigger` sends the approved concept message plus everything after
 * it (ADR-0059) and deliberately NOTHING before it, so a superseded AI draft cannot
 * bleed into the package (Madysn's lake-house/circus case, April 2026). That rule is
 * right for assistant drafts and wrong for a long document the customer wrote
 * themselves. The concept chat invites exactly that ("paste your detailed prompt,
 * split it across messages"), and the concept it then writes back is a short
 * restatement that routinely drops most of it.
 *
 * Live bug ("El Ultimo Trago", 2026-10-06): a 42,225-char canon (two homicides, a
 * 500/100/400 fraud, a UV-ink ledger, a closed list of five poison buyers) was pasted
 * in message 9; the concept approved at message 17 was 4,103 chars, just over the
 * 3,000-char "snapshot too thin" guard, so only that concept reached the generator
 * (8,504 chars in `user_conversation`). The delivered package contained none of the
 * canon's load-bearing facts. A corpus check found 3 more paid packages in 3 months
 * where a pre-snapshot customer brief 2x or more the size of the concept never reached
 * generation (The Raven And The Rose, Attendance For Dinner, El Ultimo Brindis De
 * Bellanotte).
 *
 * Selection rule: user-role messages, strictly earlier than the approved snapshot,
 * at least BRIEF_MIN_CHARS long. Short earlier user messages are mostly iteration
 * ("make it Victorian") that the approved concept already reflects, and including
 * them is where the pre-pivot contamination risk lives. If the briefs together exceed
 * BRIEF_MAX_TOTAL_CHARS the oldest are dropped first.
 */
export const BRIEF_MIN_CHARS = 4000;
export const BRIEF_MAX_TOTAL_CHARS = 50000;

export interface BriefCandidateMessage {
  id?: string;
  role?: string | null;
  is_ai?: boolean | null;
  content?: string | null;
  created_at: string;
}

export function selectPreSnapshotBriefs<T extends BriefCandidateMessage>(
  messages: T[],
  approvedCreatedAt: string,
): T[] {
  const approvedAt = new Date(approvedCreatedAt).getTime();
  const candidates = messages
    .filter((m) =>
      m.role === "user" &&
      !m.is_ai &&
      typeof m.content === "string" &&
      m.content.length >= BRIEF_MIN_CHARS &&
      new Date(m.created_at).getTime() < approvedAt
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let total = candidates.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
  while (candidates.length > 0 && total > BRIEF_MAX_TOTAL_CHARS) {
    total -= candidates.shift()!.content?.length ?? 0;
  }
  return candidates;
}

/**
 * Label placed in front of each brief. The tie-break sentence matters: an earlier
 * brief can legitimately be partly superseded by later chat (the customer changed a
 * name or dropped a character), and the approved concept is the reconciled version.
 */
export function formatPreSnapshotBrief(content: string): string {
  return `User (the customer's own brief, written earlier in the chat and before the concept below was approved - source material; where it conflicts with the approved concept below, the approved concept wins): ${content}`;
}

/**
 * ADR-0103 Addendum 87: an approved concept message that is only a DELTA.
 *
 * `findLatestConceptMessage` picks the latest assistant message that parses into a cast. When a
 * customer tweaks two characters after the full concept was written, the assistant answers with a
 * short "here is the refined lineup ... everything else stays exactly as before" message. That
 * message parses into a cast, so it becomes the approved snapshot, and the premise, victim,
 * setting and murder method (which live only in the earlier full concept) never reach the Parent.
 * Live bug ("Murder At Montero Manor", 2026-10-07, paid USD 19.99): `user_conversation` was the
 * 3,196-char delta, the Parent's master-context step had nothing to build on, and the package
 * shipped with an empty `master_context`, no detective script and a game overview that was an AI
 * request for the missing context.
 *
 * Rule: if the approved message has no concept section header (Premise / Victim / Setting / ...) AND says it
 * only amends something ("everything else stays exactly as before"), include the latest EARLIER assistant message that does, labelled as the draft the approved
 * message amends. Approved messages that carry their own concept section are untouched, so the
 * pre-pivot contamination guard (Madysn, April 2026) still holds for every complete concept.
 */
export const CONCEPT_BASE_MIN_CHARS = 1500;
const CONCEPT_SECTION_RE =
  /^[ \t]*#{1,4}[ \t]*\**[ \t]*(premise|victim|the victim|synopsis|setting|the setting|plot|the plot|story|the story|the mystery|concept|the concept)\b/im;

// The approved message must also SAY it only amends something ("everything else stays exactly as before").
// A corpus check (132 paid conversations, 2026-10-07) found 11 approved messages with no concept header but a full
// earlier draft; only 5 of them (Montero Manor, The Final Cut, Sweet Tea, Multiverse Gala, Ghost In The Uplink) state
// that they amend. The other 6 are complete concepts under different headings, and pulling in their earlier draft
// would be the pre-pivot contamination the narrow-context design exists to prevent. English phrases only for now.
const AMENDS_EARLIER_RE =
  /(as before|stays? (exactly )?(the same|as)|unchanged|everything else|rest (of the [a-z ]+ )?(stays|remains)|remains? (exactly )?(the same|as)|no other changes)/i;

export function amendsEarlierConcept(content: string | null | undefined): boolean {
  return typeof content === "string" && AMENDS_EARLIER_RE.test(content);
}

export function hasConceptSection(content: string | null | undefined): boolean {
  return typeof content === "string" && CONCEPT_SECTION_RE.test(content);
}

export function selectConceptBase<T extends BriefCandidateMessage>(
  messages: T[],
  approved: T,
): T | null {
  if (hasConceptSection(approved.content) || !amendsEarlierConcept(approved.content)) return null;
  const approvedAt = new Date(approved.created_at).getTime();
  const earlier = messages
    .filter((m) =>
      m.role === "assistant" &&
      m.id !== approved.id &&
      typeof m.content === "string" &&
      m.content.length >= CONCEPT_BASE_MIN_CHARS &&
      hasConceptSection(m.content) &&
      new Date(m.created_at).getTime() < approvedAt
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return earlier[0] ?? null;
}

export function formatConceptBase(content: string): string {
  return `AI (the earlier full concept that the approved message below amends - the approved message only restates part of it, so take the premise, victim, setting and murder method from here; where the two conflict, the approved message below wins): ${content}`;
}
