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
