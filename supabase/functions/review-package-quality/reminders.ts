// Pure, dependency-free "push" reminders (2026-10-16, Jonathan: "never count on me to remember anything"). Each reminder is a condition on data the system
// already holds; when it becomes true the daily digest cron emails support@ ONCE (the sent marker lives in pipeline_settings, key reminder_sent:<key>).
// A new reminder is one more entry in `dueReminders`, with a test. No Deno or network APIs: tested with plain node (reminders.test.mjs).

export type Reminder = { key: string; subject: string; body: string };
export type HistoryRow = { kind: string; version: number; effective_from: string };
export type PkgRow = { created_at: string; mystery_style: string | null; quality_review_released_at: string | null };

/** Detective packages created after `since` and already released to the customer. */
export const detectivePurchasesSince = (pkgs: PkgRow[], since: string): number =>
  pkgs.filter((p) => p.mystery_style === "detective" && p.quality_review_released_at && p.created_at >= since).length;

export function dueReminders(input: { history: HistoryRow[]; pkgs: PkgRow[]; sent: Set<string> }): Reminder[] {
  const out: Reminder[] = [];
  // Parent88 (ADR-0166) is held until Child68 has two detective purchases of data, so the two prompt changes do not blur each other's measurement.
  const child68 = input.history.find((h) => h.kind === "child" && h.version === 68);
  const parent88 = input.history.find((h) => h.kind === "parent" && h.version === 88);
  if (child68 && !parent88 && !input.sent.has("parent88_import")) {
    const n = detectivePurchasesSince(input.pkgs, child68.effective_from);
    if (n >= 2) {
      out.push({
        key: "parent88_import",
        subject: "Parent88 is ready to import into Make",
        body: `Child68 (imported ${child68.effective_from.slice(0, 16).replace("T", " ")} UTC) now has ${n} released detective purchases of data, which was the condition for importing Parent88 (it makes envelopes, photos, messages and remarks say what they contained; ADR-0166 decision 5). `
          + `The file is temp-files/MM Live - Parent88 (Contents Of The Hidden Thing).blueprint.json in the repo. After importing it, tell the next Claude session "Parent88 imported" and it logs the import and starts measuring. Rollback is re-importing Parent87. `
          + `The next sweep will also report the Child68 measurement (wrong position claims and early spoilers against the Till Death baseline of 17 and 3).`,
      });
    }
  }
  return out;
}
