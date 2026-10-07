/**
 * ADR-0103 Addendum 87 Update 3. One detector RPC failing (a statement timeout on list_packages_with_meta_text_leak,
 * seen 3 times on 2026-10-07) used to abort the whole auto-remediate run, so every later class (including the free
 * dangling_quote_mark heal) waited for the next cycle. A detector failure is now recorded and that class is skipped;
 * the run carries on with the others. Only the top-level class sweeps use this: the re-detect gate after a fix
 * (stillFlagged) must keep throwing, because "could not check" is never the same as "no longer flagged".
 */
export interface DetectorFailure {
  rpc: string;
  message: string;
}

const isStatementTimeout = (message: string) => /statement timeout/i.test(message);

/**
 * Update 4: the ten cron jobs that fire together at :00/:10/:50 can push a 2 s detector past the 8 s PostgREST limit,
 * so a statement timeout (and only that) is retried once before the class is skipped and counted.
 */
export async function runDetectorGuarded<T>(
  rpc: string,
  call: () => Promise<T[]>,
  failures: DetectorFailure[],
): Promise<T[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 1 && isStatementTimeout(message)) {
        console.error(`auto-remediate detector timed out, retrying once: ${rpc}`);
        continue;
      }
      failures.push({ rpc, message });
      console.error(`auto-remediate detector skipped: ${rpc}: ${message}`);
      return [];
    }
  }
}

/**
 * Update 4: the 5-minute held-package run only acts on needs_review packages, so it scans a short window; the
 * half-hourly full run still covers the whole standard window. An explicit backfill always wins.
 */
export const HELD_RUN_WINDOW_DAYS = 7;

export function runWindowDays(
  backfillDays: number,
  requestedDays: number,
  standardDays: number,
  onlyNeedsReview: boolean,
): number {
  if (backfillDays > 0) return backfillDays;
  const days = Math.min(requestedDays || standardDays, standardDays);
  return onlyNeedsReview ? Math.min(days, HELD_RUN_WINDOW_DAYS) : days;
}

/** One plain-text body for the single per-run alert, or null when nothing failed. */
export function detectorFailureAlert(failures: DetectorFailure[]): string | null {
  if (failures.length === 0) return null;
  const lines = failures.map((f) => `- ${f.rpc}: ${f.message}`);
  return `${failures.length} detector(s) failed in this auto-remediate run and were skipped (the other classes ran):\n${lines.join("\n")}`;
}
