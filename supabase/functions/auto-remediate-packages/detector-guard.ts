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

/**
 * Update 7: a single skipped detector is contention noise (about 3 emails a day, nothing wrong). Each skip is now
 * recorded and an email goes out only when the SAME detector has failed ALERT_FAILURE_THRESHOLD times within
 * ALERT_WINDOW_MS, and at most once per ALERT_COOLDOWN_MS per detector. The skip is still logged either way.
 */
export const ALERT_FAILURE_THRESHOLD = 4;
export const ALERT_WINDOW_MS = 3 * 60 * 60 * 1000;
export const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Failures (this run included) to alert on, given each failed rpc's recent failure count and whether it alerted lately. */
export function failuresToAlert(
  failures: DetectorFailure[],
  recentCount: Record<string, number>,
  recentlyAlerted: Set<string>,
): DetectorFailure[] {
  return failures.filter(
    (f) => (recentCount[f.rpc] ?? 0) >= ALERT_FAILURE_THRESHOLD && !recentlyAlerted.has(f.rpc),
  );
}

/** One plain-text body for the per-run alert, or null when nothing is worth an email. */
export function detectorFailureAlert(failures: DetectorFailure[], recentCount: Record<string, number> = {}): string | null {
  if (failures.length === 0) return null;
  const lines = failures.map(
    (f) => `- ${f.rpc} (${recentCount[f.rpc] ?? "?"} failures in the last ${ALERT_WINDOW_MS / 3600000} h): ${f.message}`,
  );
  return `${failures.length} detector(s) keep failing in auto-remediate-packages and were skipped (the other classes ran):\n${lines.join("\n")}`;
}

/**
 * Update 6: the two slowest detectors (a regex scan of every character's text in the window) still timed out about
 * 11 times a day with 3 skipped runs after the retry. Their window is capped at 14 days on the normal runs; every
 * other detector keeps the full window. A window wider than the standard one is an explicit backfill and is left alone.
 */
export const HEAVY_DETECTOR_RPCS = new Set([
  "list_packages_with_meta_text_leak",
  "list_packages_with_pointform_language_mismatch",
]);
export const HEAVY_DETECTOR_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function detectorSinceIso(rpc: string, sinceIso: string, standardDays: number, nowMs: number = Date.now()): string {
  if (!HEAVY_DETECTOR_RPCS.has(rpc)) return sinceIso;
  const sinceMs = Date.parse(sinceIso);
  if (!Number.isFinite(sinceMs)) return sinceIso;
  if (nowMs - sinceMs > standardDays * DAY_MS + 60 * 60 * 1000) return sinceIso; // backfill: caller asked for more on purpose
  return new Date(Math.max(sinceMs, nowMs - HEAVY_DETECTOR_WINDOW_DAYS * DAY_MS)).toISOString();
}
