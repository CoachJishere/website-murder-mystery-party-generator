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

export async function runDetectorGuarded<T>(
  rpc: string,
  call: () => Promise<T[]>,
  failures: DetectorFailure[],
): Promise<T[]> {
  try {
    return await call();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ rpc, message });
    console.error(`auto-remediate detector skipped: ${rpc}: ${message}`);
    return [];
  }
}

/** One plain-text body for the single per-run alert, or null when nothing failed. */
export function detectorFailureAlert(failures: DetectorFailure[]): string | null {
  if (failures.length === 0) return null;
  const lines = failures.map((f) => `- ${f.rpc}: ${f.message}`);
  return `${failures.length} detector(s) failed in this auto-remediate run and were skipped (the other classes ran):\n${lines.join("\n")}`;
}
