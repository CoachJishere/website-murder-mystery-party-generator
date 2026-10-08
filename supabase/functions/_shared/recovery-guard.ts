/**
 * Character re-fire guard for notify-generation-issue (ADR-0148).
 *
 * A character re-fire sends the Child scenario a webhook that reads the package's master_context. With an empty one it cannot generate
 * anything, so the attempt only burns the per-character attempt budget and the daily spend estimate (2026-10-07: "Death And Dumplings",
 * 10 re-fires logged at 0.15 USD each = 1.50 USD, 0 characters written). When master_context is unusable the only repair is a
 * whole-package re-fire (paid, needs a yes), so the recovery loop skips and the alert says why.
 */
export const MASTER_CONTEXT_MIN_CHARS = 1000;

export function masterContextUsable(masterContext: string | null | undefined): boolean {
  return (masterContext ?? "").length >= MASTER_CONTEXT_MIN_CHARS;
}

export interface RecoveryPartition {
  /** characters the recovery loop may re-fire */
  fire: string[];
  /** characters held back because master_context is unusable */
  blocked: string[];
}

export function partitionRecoveryTargets(targets: string[], masterContext: string | null | undefined): RecoveryPartition {
  if (targets.length === 0 || masterContextUsable(masterContext)) return { fire: [...targets], blocked: [] };
  return { fire: [], blocked: [...targets] };
}
