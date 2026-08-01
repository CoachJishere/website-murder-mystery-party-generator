import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * auto-remediate-packages — closed-loop auto-remediation worker. See ADR-0047.
 *
 * ADR-0042 gave us detection (read-only detectors + the 6-hourly health check
 * that opens a GitHub issue / emails the owner). Remediation stayed manual:
 * every live catch so far was found automatically but *fixed* only because the
 * owner was in the loop. This worker removes the owner from the loop for the
 * mechanical defect classes, and keeps a human gate exactly where judgment is
 * load-bearing.
 *
 * For each detector-flagged package in a bounded recent window it attempts a
 * class-specific fix, then RE-RUNS THAT DETECTOR and only accepts the fix if
 * the package now passes. That re-detect gate is the core safety invariant:
 * auto-remediation can never ship something worse than today's escalate-to-a-
 * human path, because the worst case *is* today's path.
 *
 *   Defect class                    Action
 *   ------------------------------  -----------------------------------------
 *   missing_images                  regenerate via generate-evidence-images
 *                                   (prompt derived from the card DESCRIPTION)
 *   self_directed_questions         deterministic retarget to a living suspect
 *   template_artifact               strip the offending line
 *   game_overview_victim_mismatch   regenerate-parent-content game_overview
 *   identity_contamination          ESCALATE — child-generated, judgment-heavy
 *   slip_culprit_leak               ESCALATE — no safe deterministic fix
 *
 * Safety rails (all mandatory, all enforced below — do not weaken):
 *   1. Re-detect gate after EVERY fix; revert if feasible + escalate on failure.
 *   2. Per-package/per-defect attempt cap (2), counted from auto_remediation_log,
 *      so the worker can never loop on something it cannot fix.
 *   3. Global daily spend cap, summed from auto_remediation_log; halt + escalate.
 *   4. Bounded window (30 days) so it never churns ancient/already-played packages.
 *   5. Every action logged with its before-value, so anything it did is
 *      reconstructable and recoverable by hand.
 *
 * POST {} — or { dry_run: true } to detect and report the planned actions
 * without mutating anything or spending a cent (use this to eval it).
 * Optional { window_days: number } to narrow (never widen) the window.
 */

// ---------------------------------------------------------------------------
// Safety constants. These are the rails. Changing them changes the blast radius.
// ---------------------------------------------------------------------------

/** Bounded window — matches the health check's 30-day alerting window. */
const WINDOW_DAYS = 30;

/** Per-package/per-defect attempt cap. Never loop on a package we can't fix. */
const MAX_ATTEMPTS_PER_DEFECT = 2;

/**
 * Global daily spend cap (USD). At ~$0.04/image and ~$0.01/overview regen this
 * is roughly 120 images a day — far above any plausible real backlog, so
 * hitting it means something is wrong and we should stop and shout.
 */
const DAILY_SPEND_CAP_USD = 5.0;

/** Replicate Flux 1.1 Pro, per image (ADR-0017). */
const IMAGE_COST_USD = 0.04;

/** One Claude Haiku game_overview regeneration (~1.5k output tokens). */
const OVERVIEW_REGEN_COST_USD = 0.01;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Outcome = "fixed" | "escalated" | "failed";

type DefectClass =
  | "missing_images"
  | "self_directed_questions"
  | "template_artifact"
  | "game_overview_victim_mismatch"
  | "identity_contamination"
  | "slip_culprit_leak";

/** The detector RPC that defines — and re-checks — each defect class. */
const DETECTOR_RPC: Record<DefectClass, string> = {
  missing_images: "list_packages_missing_evidence_images",
  self_directed_questions: "list_packages_with_self_directed_questions",
  template_artifact: "list_packages_with_meta_text_leak",
  game_overview_victim_mismatch: "list_packages_with_victim_mismatch",
  identity_contamination: "list_packages_with_identity_conflicts",
  slip_culprit_leak: "list_packages_with_slip_culprit_leak",
};

/**
 * Classes we deliberately never auto-fix. Both are child-generated and
 * judgment-heavy: there is no safe deterministic fix and no child-content
 * regenerator yet, so an auto-attempt could introduce new defects. The health
 * check already alerts on these; we log the escalation so the audit trail shows
 * the worker saw them and chose not to touch them.
 */
const ESCALATE_ONLY: DefectClass[] = ["identity_contamination", "slip_culprit_leak"];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

async function callDetector(rpc: string, sinceIso: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc(rpc, { _since: sinceIso });
  if (error) throw new Error(`detector ${rpc} failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

/**
 * THE RE-DETECT GATE. Re-runs the class's own detector and answers "is this
 * package still flagged?". A fix is only ever accepted when this returns false.
 */
async function stillFlagged(
  defectClass: DefectClass,
  sinceIso: string,
  packageId: string,
): Promise<boolean> {
  const rows = await callDetector(DETECTOR_RPC[defectClass], sinceIso);
  return rows.some((r) => r.package_id === packageId);
}

async function logRow(entry: {
  package_id: string;
  defect_class: DefectClass;
  action: string;
  before_value: string | null;
  outcome: Outcome;
  cost_usd: number;
}): Promise<void> {
  const { error } = await supabase.from("auto_remediation_log").insert(entry);
  if (error) console.error(`auto_remediation_log insert failed: ${error.message}`, entry.action);
}

/**
 * Attempt-cap counter. Skip/no-op bookkeeping rows (action starting `skip:` or
 * `escalate:`) are excluded so the cap counts real remediation attempts only —
 * otherwise a package that merely got logged twice could never be tried.
 */
async function attemptsUsed(packageId: string, defectClass: DefectClass): Promise<number> {
  const { data, error } = await supabase
    .from("auto_remediation_log")
    .select("action")
    .eq("package_id", packageId)
    .eq("defect_class", defectClass);
  if (error) throw new Error(`attempt-cap lookup failed: ${error.message}`);
  return (data ?? []).filter(
    (r: { action: string }) => !r.action.startsWith("skip:") && !r.action.startsWith("escalate:"),
  ).length;
}

/** Has this exact bookkeeping action already been logged? Keeps the log from
 *  growing a duplicate row every 4 hours for a package nothing will ever fix. */
async function alreadyLogged(
  packageId: string,
  defectClass: DefectClass,
  action: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("auto_remediation_log")
    .select("id")
    .eq("package_id", packageId)
    .eq("defect_class", defectClass)
    .eq("action", action)
    .limit(1);
  if (error) throw new Error(`log lookup failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Sum of everything spent since UTC midnight — the global daily cap's input. */
async function spentToday(): Promise<number> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("auto_remediation_log")
    .select("cost_usd")
    .gte("created_at", midnight.toISOString());
  if (error) throw new Error(`spend lookup failed: ${error.message}`);
  return (data ?? []).reduce((sum: number, r: { cost_usd: number }) => sum + Number(r.cost_usd || 0), 0);
}

async function readField(scope: "package" | "character", rowId: string, field: string): Promise<string> {
  const { data, error } = await supabase.rpc("remediation_read_field", {
    _scope: scope,
    _row_id: rowId,
    _field: field,
  });
  if (error) throw new Error(`read ${scope}.${field} failed: ${error.message}`);
  return (data as string) ?? "";
}

async function writeField(
  scope: "package" | "character",
  rowId: string,
  field: string,
  value: string,
  opts?: { bypassLossGuard?: boolean },
): Promise<void> {
  // Content-loss guard — a backstop independent of any handler. The re-detect
  // gate cannot catch a gutted-but-clean field (a shorter, artifact-free field
  // still passes its detector), so this is what turns "silently destroyed paid
  // content" into a thrown error the gate handles as revert + escalate. Never
  // empty a substantive field or delete the bulk of it.
  //
  // `bypassLossGuard` is for REVERTS: restoring a captured before-value is always
  // legitimate, even when it's shorter than what's there now (e.g. the
  // victim-mismatch revert restores the shorter original over a longer
  // regenerated overview — finding #3). A forward fix must never pass it.
  if (!opts?.bypassLossGuard) {
    const current = (await readField(scope, rowId, field)).trim();
    if (current.length >= 40) {
      const newLen = value.trim().length;
      if (newLen === 0 || newLen < current.length * 0.7) {
        throw new Error(
          `content-loss guard: ${scope}.${field} ${current.length}->${newLen} chars (>30% loss) — refusing`,
        );
      }
    }
  }
  const { error } = await supabase.rpc("remediation_write_field", {
    _scope: scope,
    _row_id: rowId,
    _field: field,
    _value: value,
  });
  if (error) throw new Error(`write ${scope}.${field} failed: ${error.message}`);
}

async function invokeFunction(name: string, body: unknown): Promise<{ ok: boolean; detail: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const detail = await res.text();
  return { ok: res.ok, detail: detail.slice(0, 500) };
}

// ---------------------------------------------------------------------------
// Content transforms (pure, unit-testable by inspection)
// ---------------------------------------------------------------------------

/**
 * Pull one round's evidence card out of the evidence_cards markdown.
 *
 * CRITICAL: we take only the player-facing `#### DESCRIPTION` body and stop at
 * the next `####`. The `#### SIGNIFICANCE (Host Only)` block routinely names
 * the murderer (that is its job), and must never reach an image prompt.
 */
export function extractCard(
  ecText: string,
  roundNum: number,
): { title: string; description: string } | null {
  const sectionRx = new RegExp(
    `##\\s*EVIDENCE:\\s*ROUND\\s*${roundNum}\\b([\\s\\S]*?)(?=\\n##\\s*EVIDENCE:\\s*ROUND\\b|$)`,
    "i",
  );
  const section = sectionRx.exec(ecText);
  if (!section) return null;
  const body = section[1];

  const title = (/^[ \t]*###[ \t]+(.+)$/m.exec(body)?.[1] ?? `Round ${roundNum} evidence`).trim();
  // Stop at the next heading in ANY form — `#{2,6}` (with or without a trailing
  // space, so `####SIGNIFICANCE` and `##### SIGNIFICANCE` both terminate).
  let description = /####[ \t]*DESCRIPTION[ \t]*\r?\n([\s\S]*?)(?=\r?\n[ \t]*#{2,6}|$)/i
    .exec(body)?.[1]?.trim();

  if (!description) return null;
  // Belt-and-suspenders: the SIGNIFICANCE (Host Only) block names the murderer
  // and must NEVER reach an image prompt. Truncate at a line-anchored
  // "significance" whatever markup precedes it (####, #####, **…**, blockquote),
  // covering any heading form the terminator above might miss.
  description = description.replace(/\r?\n[ \t]*[#*>\s]*significance\b[\s\S]*$/i, "").trim();
  if (!description) return null;
  return { title, description };
}

/** House forensic style, matching the images the owner has generated by hand
 *  during past recoveries (cinematic low-key, no lettering — garbled evidence
 *  markers were the reason earlier manual re-rolls were needed). */
export function forensicPrompt(title: string, description: string): string {
  const desc = description.replace(/\s+/g, " ").trim().slice(0, 900);
  return (
    `Forensic evidence photograph of a single piece of physical evidence from a fictional ` +
    `murder-mystery investigation: ${title}. ${desc} ` +
    `Photorealistic still-life, cinematic low-key crime-scene lighting, shallow depth of field, ` +
    `the object catalogued on a neutral surface, 16:9. ` +
    `No text, no lettering, no labels, no numbers, no watermarks, no people, no faces.`
  );
}

/**
 * Retarget `**To <bad name>:**` questions onto a living suspect who is not
 * already questioned in this round.
 *
 * Deterministic by construction: candidates are filtered (no self, no victim,
 * nobody already targeted this round) then sorted, and consumed in order — so
 * the same input always produces the same output, and a re-run after a revert
 * behaves identically.
 */
export function retargetQuestions(
  text: string,
  badNames: string[],
  allCharacterNames: string[],
): { text: string; changed: number; exhausted: boolean } {
  if (!text) return { text, changed: 0, exhausted: false };

  const alreadyTargeted = new Set<string>();
  for (const m of text.matchAll(/\*\*\s*To\s+([^:*\n]+?)\s*:?\s*\*\*/gi)) {
    alreadyTargeted.add(norm(m[1]));
  }

  const bad = new Set(badNames.map(norm));
  const pool = allCharacterNames
    .filter((n) => !bad.has(norm(n)) && !alreadyTargeted.has(norm(n)))
    .sort((a, b) => a.localeCompare(b));

  let out = text;
  let changed = 0;

  for (const badName of badNames) {
    // Non-global regex: `replace` swaps the FIRST remaining occurrence, so each
    // offending question gets its own distinct replacement target.
    const rx = new RegExp(`(\\*\\*\\s*To\\s+)${escapeRx(badName)}(?=\\s*:?\\s*\\*\\*)`, "i");
    while (rx.test(out)) {
      const replacement = pool.shift();
      if (!replacement) return { text: out, changed, exhausted: true };
      out = out.replace(rx, (_full, prefix: string) => `${prefix}${replacement}`);
      changed++;
    }
  }

  return { text: out, changed, exhausted: false };
}

/**
 * Remove known template artifacts — but ONLY when doing so is safe, i.e. the
 * artifact sat on its own line as an authoring note (the shape it takes in the
 * Black Swan detective-reveal case). If an artifact is embedded inside
 * substantive content — e.g. an accusation "I believe [choose based on evidence]
 * is the murderer" — excising it leaves broken/gutted prose that the re-detect
 * gate CANNOT catch (a shorter, artifact-free field still passes the detector).
 * In that case we refuse (`safe: false`) so the handler escalates the package to
 * a human / regeneration instead of silently destroying paid content.
 *
 * Only the three ADR-0047 patterns, only as bracketed spans. Chain-of-thought
 * the meta-text detector also flags ("let me reconsider") is never touched here —
 * it needs a rewrite, so it fails the gate and escalates, which is correct.
 */
const ARTIFACT_SPAN_RX = [
  /\[choose[^\]]*\]/gi,
  /\[closing paragraph[^\]]*\]/gi,
  /\[[^\]]*master_context[^\]]*\]/gi,
];
/** Any surviving occurrence of these means the artifact wasn't cleanly removed. */
const ARTIFACT_TOKEN_RX = /\[choose\b|\[closing paragraph\b|master_context/i;

export function stripArtifactLines(
  text: string,
): { text: string; removed: string[]; safe: boolean } {
  if (!text) return { text, removed: [], safe: true };
  const removed: string[] = [];
  const outLines: string[] = [];

  for (const line of text.split("\n")) {
    if (!ARTIFACT_TOKEN_RX.test(line)) {
      outLines.push(line);
      continue;
    }
    // Excise every recognised bracketed artifact span from this line.
    let excised = line;
    for (const rx of ARTIFACT_SPAN_RX) excised = excised.replace(rx, "");
    // A token surviving excision means a bare/undelimited artifact (e.g. an
    // unbracketed master_context) we can't clean safely — refuse.
    if (ARTIFACT_TOKEN_RX.test(excised)) return { text, removed: [], safe: false };
    // If nothing substantive remains, the line was a standalone authoring note —
    // safe to drop entirely. Otherwise the artifact was embedded in real content,
    // and excising it would gut the line — refuse and escalate.
    const remainder = excised.replace(/[\s\p{P}]+/gu, "");
    if (remainder !== "") return { text, removed: [], safe: false };
    removed.push(line.trim());
  }

  if (removed.length === 0) return { text, removed, safe: true };
  return { text: outLines.join("\n").replace(/\n{3,}/g, "\n\n"), removed, safe: true };
}

// ---------------------------------------------------------------------------
// Run context + the single gated attempt path
// ---------------------------------------------------------------------------

interface RunCtx {
  sinceIso: string;
  dryRun: boolean;
  budgetRemaining: number;
  spendHalted: boolean;
  results: AttemptResult[];
}

interface AttemptResult {
  package_id: string;
  defect_class: DefectClass;
  action: string;
  outcome: Outcome | "skipped" | "planned";
  cost_usd: number;
  note?: string;
}

interface FixPlan {
  /** Human-readable description of what will be done, logged as `action`. */
  action: string;
  /** Money this fix will spend if it runs. 0 for the deterministic fixes. */
  costUsd: number;
  /** Perform the mutation. Returns the before-value(s) for the audit log. */
  apply: () => Promise<{ beforeValue: string | null; note?: string }>;
  /** Undo it. Return false when a revert isn't feasible (e.g. generated images). */
  revert: (beforeValue: string | null) => Promise<boolean>;
}

/**
 * The ONLY path by which a package is ever mutated. Every rail lives here so no
 * defect-class handler can accidentally bypass one:
 *   attempt cap -> spend cap -> apply -> RE-DETECT -> accept or revert+escalate.
 */
async function runGatedAttempt(
  ctx: RunCtx,
  packageId: string,
  defectClass: DefectClass,
  buildPlan: () => Promise<FixPlan | null>,
): Promise<void> {
  // --- Rail 2: per-package/per-defect attempt cap -------------------------
  const used = await attemptsUsed(packageId, defectClass);
  if (used >= MAX_ATTEMPTS_PER_DEFECT) {
    const action = "skip:attempt_cap";
    if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
      await logRow({
        package_id: packageId,
        defect_class: defectClass,
        action,
        before_value: null,
        outcome: "escalated",
        cost_usd: 0,
      });
    }
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action,
      outcome: "skipped",
      cost_usd: 0,
      note: `${used} prior attempts, cap ${MAX_ATTEMPTS_PER_DEFECT} — needs a human`,
    });
    return;
  }

  let plan: FixPlan | null;
  try {
    plan = await buildPlan();
  } catch (e) {
    const message = (e as Error).message;
    if (!ctx.dryRun) {
      await logRow({
        package_id: packageId,
        defect_class: defectClass,
        action: "plan_failed",
        before_value: null,
        outcome: "failed",
        cost_usd: 0,
      });
    }
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: "plan_failed",
      outcome: "failed",
      cost_usd: 0,
      note: message,
    });
    return;
  }

  // No mechanical fix available for this instance (e.g. no spare suspect to
  // retarget onto, no parsable card description) -> escalate, don't guess.
  if (!plan) {
    const action = "escalate:no_mechanical_fix";
    if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
      await logRow({
        package_id: packageId,
        defect_class: defectClass,
        action,
        before_value: null,
        outcome: "escalated",
        cost_usd: 0,
      });
    }
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action,
      outcome: "escalated",
      cost_usd: 0,
    });
    return;
  }

  // --- Rail 3: global daily spend cap -------------------------------------
  if (plan.costUsd > 0) {
    if (ctx.spendHalted || plan.costUsd > ctx.budgetRemaining) {
      ctx.spendHalted = true; // halt ALL further paid work this run
      const action = "skip:daily_spend_cap";
      if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
        await logRow({
          package_id: packageId,
          defect_class: defectClass,
          action,
          before_value: null,
          outcome: "escalated",
          cost_usd: 0,
        });
      }
      ctx.results.push({
        package_id: packageId,
        defect_class: defectClass,
        action,
        outcome: "escalated",
        cost_usd: 0,
        note: `needs $${plan.costUsd.toFixed(2)}, $${ctx.budgetRemaining.toFixed(2)} left of the $${DAILY_SPEND_CAP_USD.toFixed(2)} daily cap`,
      });
      return;
    }
  }

  if (ctx.dryRun) {
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "planned",
      cost_usd: plan.costUsd,
      note: "dry_run — nothing mutated, nothing spent",
    });
    return;
  }

  // --- Apply --------------------------------------------------------------
  let beforeValue: string | null = null;
  let note: string | undefined;
  try {
    const applied = await plan.apply();
    beforeValue = applied.beforeValue;
    note = applied.note;
  } catch (e) {
    // The fix itself errored. Money may still have been spent (e.g. the image
    // call charged then the DB write failed), so charge the run's budget.
    ctx.budgetRemaining -= plan.costUsd;
    // A throw mid-apply may have written some fields but not others (e.g. the
    // content-loss guard tripped on field 3 of 5). Revert to clean up the
    // partial mutation — the multi-field handlers read their edits from closure,
    // so revert works even though beforeValue was never returned. This preserves
    // the all-or-nothing invariant.
    const reverted = await plan.revert(beforeValue).catch(() => false);
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action: `${plan.action}|apply_failed${reverted ? "|reverted" : "|revert_not_feasible"}`,
      before_value: beforeValue,
      outcome: "failed",
      cost_usd: plan.costUsd,
    });
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "failed",
      cost_usd: plan.costUsd,
      note: `${(e as Error).message}${reverted ? " (reverted)" : ""}`,
    });
    return;
  }
  ctx.budgetRemaining -= plan.costUsd;

  // --- Rail 1: THE RE-DETECT GATE ----------------------------------------
  // Non-negotiable. A fix is accepted only when the detector that flagged this
  // package now returns clean for it.
  let flaggedAfter: boolean;
  try {
    flaggedAfter = await stillFlagged(defectClass, ctx.sinceIso, packageId);
  } catch (e) {
    // Can't confirm the fix -> treat exactly like a failed gate. Never accept
    // an unverified mutation.
    const reverted = await plan.revert(beforeValue).catch(() => false);
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action: `${plan.action}|redetect_error${reverted ? "|reverted" : "|revert_not_feasible"}`,
      before_value: beforeValue,
      outcome: "escalated",
      cost_usd: plan.costUsd,
    });
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "escalated",
      cost_usd: plan.costUsd,
      note: `re-detect failed: ${(e as Error).message}`,
    });
    return;
  }

  if (!flaggedAfter) {
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      before_value: beforeValue,
      outcome: "fixed",
      cost_usd: plan.costUsd,
    });
    ctx.results.push({
      package_id: packageId,
      defect_class: defectClass,
      action: plan.action,
      outcome: "fixed",
      cost_usd: plan.costUsd,
      note,
    });
    return;
  }

  // Gate rejected the fix: the package is still flagged. Put it back the way we
  // found it where that's possible, and hand it to a human.
  const reverted = await plan.revert(beforeValue).catch(() => false);
  await logRow({
    package_id: packageId,
    defect_class: defectClass,
    action: `${plan.action}|redetect_still_flagged${reverted ? "|reverted" : "|revert_not_feasible"}`,
    before_value: beforeValue,
    outcome: "escalated",
    cost_usd: plan.costUsd,
  });
  ctx.results.push({
    package_id: packageId,
    defect_class: defectClass,
    action: plan.action,
    outcome: "escalated",
    cost_usd: plan.costUsd,
    note: reverted
      ? "still flagged after fix — reverted, escalated"
      : "still flagged after fix — revert not feasible, escalated",
  });
}

// ---------------------------------------------------------------------------
// Per-class handlers
// ---------------------------------------------------------------------------

async function getCharacters(packageId: string): Promise<{ id: string; character_name: string }[]> {
  const { data, error } = await supabase
    .from("mystery_characters")
    .select("id, character_name")
    .eq("package_id", packageId);
  if (error) throw new Error(`character lookup failed: ${error.message}`);
  return (data ?? []).filter((c: { character_name: string | null }) => !!c.character_name) as {
    id: string;
    character_name: string;
  }[];
}

/** Victim name from master_context's victimProfile — used to spot questions
 *  aimed at the dead as well as at oneself. Absence is not an error. */
async function getVictimName(packageId: string): Promise<string | null> {
  const { data } = await supabase
    .from("mystery_packages")
    .select("master_context")
    .eq("id", packageId)
    .maybeSingle();
  const mc = (data?.master_context as string) ?? "";
  return /"victimProfile"\s*:\s*\{[\s\S]{0,400}?"name"\s*:\s*"([^"]+)"/.exec(mc)?.[1]?.trim() ?? null;
}

const QUESTION_FIELDS = ["round2_questions", "round3_questions", "round4_questions"] as const;

async function handleSelfDirectedQuestions(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const offenders = (row.offenders as string[]) ?? [];

  await runGatedAttempt(ctx, packageId, "self_directed_questions", async () => {
    const characters = await getCharacters(packageId);
    const victim = await getVictimName(packageId);
    const allNames = characters.map((c) => c.character_name);

    // field-by-field plan; before-values captured for the audit log + revert
    const edits: { charId: string; field: string; before: string; after: string }[] = [];

    for (const offenderName of offenders) {
      const character = characters.find((c) => norm(c.character_name) === norm(offenderName));
      if (!character) continue;

      // A question may target the asking character OR the victim — neither can
      // answer. Both retarget onto a living suspect.
      const badNames = [character.character_name, ...(victim ? [victim] : [])];

      for (const field of QUESTION_FIELDS) {
        const before = await readField("character", character.id, field);
        if (!before) continue;
        const { text: after, changed, exhausted } = retargetQuestions(before, badNames, allNames);
        // Exhausted pool = every other suspect is already questioned this round.
        // No safe deterministic target left -> hand the whole package to a human.
        if (exhausted) return null;
        if (changed > 0) edits.push({ charId: character.id, field, before, after });
      }
    }

    if (edits.length === 0) return null; // detector saw something we can't parse

    return {
      action: `retarget_questions:${edits.map((e) => e.field).join(",")}`,
      costUsd: 0,
      apply: async () => {
        for (const e of edits) await writeField("character", e.charId, e.field, e.after);
        return {
          beforeValue: JSON.stringify(
            edits.map((e) => ({ character_id: e.charId, field: e.field, before: e.before })),
          ),
          note: `${edits.length} field(s) retargeted`,
        };
      },
      revert: async () => {
        for (const e of edits) await writeField("character", e.charId, e.field, e.before);
        return true;
      },
    };
  });
}

const PACKAGE_ARTIFACT_FIELDS = [
  "game_overview",
  "detective_script",
  "host_guide",
  "timeline",
  "hosting_tips",
  "preparation_instructions",
  "evidence_cards",
];
const CHARACTER_ARTIFACT_FIELDS = [
  "introduction",
  "rumors",
  "background",
  "secret",
  "accusations",
  "relationships",
  "description",
  "round2_script",
  "round3_script",
  "round4_script",
  "final_statement",
  "round2_innocent",
  "round2_guilty",
  "round2_accomplice",
  "round3_innocent",
  "round3_guilty",
  "round3_accomplice",
  "round4_innocent",
  "round4_guilty",
  "round4_accomplice",
  "final_innocent",
  "final_guilty",
  "final_accomplice",
];

async function handleTemplateArtifacts(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const sources = (row.sources as string[]) ?? [];

  await runGatedAttempt(ctx, packageId, "template_artifact", async () => {
    const edits: {
      scope: "package" | "character";
      rowId: string;
      field: string;
      before: string;
      after: string;
      removed: string[];
    }[] = [];

    if (sources.includes("package")) {
      for (const field of PACKAGE_ARTIFACT_FIELDS) {
        const before = await readField("package", packageId, field);
        if (!before) continue;
        const { text: after, removed, safe } = stripArtifactLines(before);
        if (!safe) return null; // artifact embedded in real content — escalate, don't gut it
        if (removed.length > 0) {
          edits.push({ scope: "package", rowId: packageId, field, before, after, removed });
        }
      }
    }

    const characterSources = sources
      .filter((s) => s.startsWith("character:"))
      .map((s) => s.slice("character:".length));
    if (characterSources.length > 0) {
      const characters = await getCharacters(packageId);
      for (const name of characterSources) {
        const character = characters.find((c) => norm(c.character_name) === norm(name));
        if (!character) continue;
        for (const field of CHARACTER_ARTIFACT_FIELDS) {
          const before = await readField("character", character.id, field);
          if (!before) continue;
          const { text: after, removed, safe } = stripArtifactLines(before);
          if (!safe) return null; // artifact embedded in real content — escalate, don't gut it
          if (removed.length > 0) {
            edits.push({ scope: "character", rowId: character.id, field, before, after, removed });
          }
        }
      }
    }

    // Nothing matched our three authorised patterns — the detector fired on
    // chain-of-thought text instead, which needs a rewrite, not a deletion.
    if (edits.length === 0) return null;

    return {
      action: `strip_template_artifacts:${edits.map((e) => `${e.scope}.${e.field}`).join(",")}`,
      costUsd: 0,
      apply: async () => {
        for (const e of edits) await writeField(e.scope, e.rowId, e.field, e.after);
        return {
          beforeValue: JSON.stringify(
            edits.map((e) => ({ scope: e.scope, row_id: e.rowId, field: e.field, before: e.before })),
          ),
          note: `${edits.reduce((n, e) => n + e.removed.length, 0)} line(s) stripped`,
        };
      },
      revert: async () => {
        for (const e of edits) await writeField(e.scope, e.rowId, e.field, e.before);
        return true;
      },
    };
  });
}

async function handleVictimMismatch(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;

  await runGatedAttempt(ctx, packageId, "game_overview_victim_mismatch", async () => {
    // Capture the before-value at plan-build time so it lives in this closure.
    // The revert then reads it from closure rather than from its argument, which
    // is why it still works when apply THREW after regenerate-parent-content had
    // already overwritten game_overview (the arg is null on that path — finding
    // #4: previously that left the regenerated text with no recoverable original).
    const before = await readField("package", packageId, "game_overview");
    return {
      action: "regenerate_parent_content:game_overview",
      costUsd: OVERVIEW_REGEN_COST_USD,
      apply: async () => {
        const res = await invokeFunction("regenerate-parent-content", {
          packageId,
          fields: ["game_overview"],
        });
        if (!res.ok) throw new Error(`regenerate-parent-content: ${res.detail}`);
        return { beforeValue: before, note: res.detail.slice(0, 200) };
      },
      // Restores the captured original. Reads `before` from closure (not the
      // arg) so it survives an apply-failure, and bypasses the content-loss guard
      // because the original is legitimately shorter than the regeneration
      // (finding #3 — otherwise the revert threw and the bad overview stayed).
      revert: async () => {
        await writeField("package", packageId, "game_overview", before, { bypassLossGuard: true });
        return true;
      },
    };
  });
}

async function handleMissingImages(ctx: RunCtx, row: Record<string, unknown>): Promise<void> {
  const packageId = row.package_id as string;
  const missingRounds = (row.missing_rounds as string[]) ?? [];
  if (missingRounds.length === 0) return;

  await runGatedAttempt(ctx, packageId, "missing_images", async () => {
    const ecText = await readField("package", packageId, "evidence_cards");
    if (!ecText) return null;

    const prompts: Record<string, string> = {};
    for (const round of missingRounds) {
      const n = Number(round.replace(/\D/g, ""));
      if (!n) continue;
      const card = extractCard(ecText, n);
      if (!card) continue; // unparsable card -> don't invent a prompt
      prompts[round] = forensicPrompt(card.title, card.description);
    }
    if (Object.keys(prompts).length === 0) return null;

    const rounds = Object.keys(prompts).sort();
    return {
      action: `regenerate_images:${rounds.join(",")}`,
      costUsd: IMAGE_COST_USD * rounds.length,
      apply: async () => {
        // before-value = the image map as it stood, so the audit trail shows
        // exactly which rounds were empty before we spent money.
        const { data } = await supabase
          .from("mystery_packages")
          .select("evidence_card_images")
          .eq("id", packageId)
          .maybeSingle();
        const res = await invokeFunction("generate-evidence-images", {
          package_id: packageId,
          prompts,
        });
        if (!res.ok) throw new Error(`generate-evidence-images: ${res.detail}`);
        return {
          beforeValue: JSON.stringify(data?.evidence_card_images ?? null),
          note: res.detail.slice(0, 200),
        };
      },
      // Not feasible, and not desirable: an extra generated image is never
      // worse than a missing one, and deleting it would only re-open the defect.
      revert: async () => false,
    };
  });
}

/** Escalate-only classes: log once per package, never mutate. */
async function handleEscalateOnly(
  ctx: RunCtx,
  defectClass: DefectClass,
  row: Record<string, unknown>,
): Promise<void> {
  const packageId = row.package_id as string;
  const action = "escalate:no_safe_autofix";
  if (!ctx.dryRun && !(await alreadyLogged(packageId, defectClass, action))) {
    await logRow({
      package_id: packageId,
      defect_class: defectClass,
      action,
      before_value: null,
      outcome: "escalated",
      cost_usd: 0,
    });
  }
  ctx.results.push({
    package_id: packageId,
    defect_class: defectClass,
    action,
    outcome: "escalated",
    cost_usd: 0,
    note: "child-generated / judgment-heavy — the health check alerts on this",
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  const startedAt = Date.now();

  try {
    let body: { dry_run?: boolean; window_days?: number } = {};
    try {
      body = await req.json();
    } catch {
      body = {}; // pg_cron posts '{}'; an empty body is also fine
    }

    const dryRun = body.dry_run === true;
    // Rail 4: bounded window. A caller may narrow it, never widen it.
    const windowDays = Math.min(Number(body.window_days) || WINDOW_DAYS, WINDOW_DAYS);
    const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    const alreadySpent = await spentToday();
    const ctx: RunCtx = {
      sinceIso,
      dryRun,
      budgetRemaining: Math.max(0, DAILY_SPEND_CAP_USD - alreadySpent),
      spendHalted: false,
      results: [],
    };

    // Free work first, so a spend halt can never starve the deterministic fixes.
    // 1-2. Escalate-only classes (no mutation, no spend).
    for (const defectClass of ESCALATE_ONLY) {
      const rows = await callDetector(DETECTOR_RPC[defectClass], sinceIso);
      for (const row of rows) await handleEscalateOnly(ctx, defectClass, row);
    }

    // 3. Self/victim-directed questions — deterministic, free.
    for (const row of await callDetector(DETECTOR_RPC.self_directed_questions, sinceIso)) {
      await handleSelfDirectedQuestions(ctx, row);
    }

    // 4. Template artifacts — deterministic, free.
    for (const row of await callDetector(DETECTOR_RPC.template_artifact, sinceIso)) {
      await handleTemplateArtifacts(ctx, row);
    }

    // 5. game_overview victim mismatch — paid (Haiku).
    for (const row of await callDetector(DETECTOR_RPC.game_overview_victim_mismatch, sinceIso)) {
      await handleVictimMismatch(ctx, row);
    }

    // 6. Missing evidence images — paid (Replicate).
    for (const row of await callDetector(DETECTOR_RPC.missing_images, sinceIso)) {
      await handleMissingImages(ctx, row);
    }

    const spentThisRun = ctx.results.reduce((sum, r) => sum + (r.outcome === "planned" ? 0 : r.cost_usd), 0);
    const summary = {
      dry_run: dryRun,
      window_days: windowDays,
      since: sinceIso,
      considered: ctx.results.length,
      fixed: ctx.results.filter((r) => r.outcome === "fixed").length,
      escalated: ctx.results.filter((r) => r.outcome === "escalated").length,
      failed: ctx.results.filter((r) => r.outcome === "failed").length,
      skipped: ctx.results.filter((r) => r.outcome === "skipped").length,
      planned: ctx.results.filter((r) => r.outcome === "planned").length,
      spent_usd: Number(spentThisRun.toFixed(4)),
      spent_today_usd: Number((alreadySpent + spentThisRun).toFixed(4)),
      daily_cap_usd: DAILY_SPEND_CAP_USD,
      spend_halted: ctx.spendHalted,
      duration_ms: Date.now() - startedAt,
      results: ctx.results,
    };

    console.log(
      `auto-remediate: ${summary.fixed} fixed, ${summary.escalated} escalated, ` +
        `${summary.failed} failed, ${summary.skipped} skipped, $${summary.spent_usd} spent` +
        (dryRun ? " (DRY RUN)" : ""),
    );

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-remediate fatal:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
