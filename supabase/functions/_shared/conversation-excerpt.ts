/**
 * ADR-0097 Addendum (2026-09-11, extended 2026-09-12): bounds how much of a
 * customer's raw chat transcript gets sent in a payload that also needs to
 * carry a specific character's context, regardless of how long that
 * transcript actually is.
 *
 * Original incident: notify-generation-issue's Make.com re-fire sent the
 * full `user_conversation` transcript. One customer's was ~180,000 chars;
 * the Make scenario execution reported success while silently writing
 * nothing (7 ops/~47s instead of the normal 19 ops/~100s a real character
 * generation takes). A name-windowed excerpt (~15,000 chars: opening
 * context + ±1,200 chars around every mention of the target character's
 * name) fixed it immediately.
 *
 * Extended here to `regenerate-child-content`, which has the identical
 * `conversationContent: pkg.user_conversation ?? ""` pattern feeding a
 * direct Claude API call rather than a Make.com scenario. That path doesn't
 * share the original's silent-failure shape (errors there are caught and
 * logged, not swallowed) — Sonnet 5's context window comfortably fits
 * 180,000 raw chars — but it does mean every affected regeneration call
 * pays for tokens irrelevant to the character being generated. Same fix,
 * different motivation: cost/quality, not correctness.
 */
const OPENING_CHARS = 3000;
const WINDOW_CHARS = 1200;
const MAX_CHARS = 14000;
const MAX_MATCHES = 8;

export function buildConversationExcerpt(fullConversation: string, characterName: string): string {
  if (!fullConversation) return "";
  if (fullConversation.length <= MAX_CHARS) return fullConversation;

  let excerpt = fullConversation.slice(0, OPENING_CHARS);
  let cursor = 0;
  let matches = 0;
  while (matches < MAX_MATCHES && excerpt.length < MAX_CHARS) {
    const relPos = fullConversation.indexOf(characterName, cursor);
    if (relPos === -1) break;
    const windowStart = Math.max(0, relPos - WINDOW_CHARS);
    const windowEnd = Math.min(fullConversation.length, relPos + characterName.length + WINDOW_CHARS);
    excerpt += "\n---\n" + fullConversation.slice(windowStart, windowEnd);
    cursor = relPos + characterName.length;
    matches++;
  }
  return excerpt;
}
