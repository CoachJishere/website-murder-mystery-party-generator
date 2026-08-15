import { supabase } from "@/integrations/supabase/client";

// "Recast" — ADR-0036/0082/0088 (staging only). Thin wrapper around the
// adaptation edge functions, matching the supabase.functions.invoke()
// convention already used in mysteryPackageService.ts.

export interface CreateAdaptationCharacter {
  characterId: string;
  replacementCharacterId?: string; // only meaningful for a murderer/accomplice target
}

export interface CreateAdaptationResult {
  batch_id: string;
  adaptation_ids: string[];
  checkout_url: string | null;
  note?: string;
}

export type AdaptationStatusValue = "pending" | "paid" | "processing" | "verified" | "failed" | "rolled_back";

export interface AdaptationReassignmentInfo {
  promoted_character_id: string;
  promoted_character_name?: string;
  new_role: string;
  selection: "host_selected" | "auto";
}

export interface AdaptationBatchRow {
  id: string;
  batch_sequence: number;
  status: AdaptationStatusValue;
  character_name: string;
  character_role: string | null;
  error_message: string | null;
  transform_result: {
    reassignment?: AdaptationReassignmentInfo;
    host_review_recommended?: boolean;
    needs_review?: string[];
  } | null;
}

const TERMINAL_STATUSES: ReadonlySet<AdaptationStatusValue> = new Set(["verified", "rolled_back", "failed"]);

export function isTerminalStatus(status: AdaptationStatusValue): boolean {
  return TERMINAL_STATUSES.has(status);
}

export async function createAdaptation(
  packageId: string,
  characters: CreateAdaptationCharacter[],
  requestedByEmail?: string,
): Promise<CreateAdaptationResult> {
  // __BATCH_ID__ is substituted server-side by adapt-mystery-create, which is
  // the one place the new batch's id is known before the Stripe session is
  // created.
  const { data, error } = await supabase.functions.invoke("adapt-mystery-create", {
    body: {
      package_id: packageId,
      characters: characters.map((c) => ({
        character_id: c.characterId,
        replacement_character_id: c.replacementCharacterId ?? null,
      })),
      requested_by_email: requestedByEmail,
      success_url: `${window.location.origin}/adaptation-success?batch_id=__BATCH_ID__`,
      cancel_url: window.location.href,
    },
  });
  if (error) throw error;
  return data as CreateAdaptationResult;
}

export async function getAdaptationBatchStatus(batchId: string): Promise<AdaptationBatchRow[]> {
  const { data, error } = await supabase
    .from("mystery_adaptations")
    .select("id, batch_sequence, status, character_name, character_role, error_message, transform_result")
    .eq("batch_id", batchId)
    .order("batch_sequence", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdaptationBatchRow[];
}

/** Finds the currently in-flight batch for a package, if any (only one is
 *  ever allowed at a time — see adapt-mystery-create's package-wide guard).
 *  Used to show live progress directly on the Recast card, not just on the
 *  post-payment success page, so a host doesn't have to keep that other tab
 *  open to know it's working. Returns null when nothing is in progress. */
export async function getActiveAdaptationBatch(packageId: string): Promise<AdaptationBatchRow[] | null> {
  const { data: anyRow, error: anyErr } = await supabase
    .from("mystery_adaptations")
    .select("batch_id")
    .eq("package_id", packageId)
    .in("status", ["pending", "paid", "processing"])
    .limit(1)
    .maybeSingle();
  if (anyErr) throw anyErr;
  if (!anyRow) return null;
  return getAdaptationBatchStatus(anyRow.batch_id);
}

/** Re-POSTs adapt-mystery-apply for a specific row that appears stuck. Safe
 *  to call redundantly: the row-level claim is an atomic conditional UPDATE
 *  (status:'paid'->'processing'), so a nudge on a row another invocation has
 *  already claimed is a clean no-op, not a double-apply. Only meant to be
 *  called when the row's OWN predecessor is already terminal — see
 *  AdaptationSuccess.tsx — never as a blind timer-based retry, which could
 *  race a predecessor that's simply still (legitimately) mid-flight. */
export async function nudgeStuckAdaptation(adaptationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("adapt-mystery-apply", {
    body: { adaptation_id: adaptationId },
  });
  if (error) throw error;
}
