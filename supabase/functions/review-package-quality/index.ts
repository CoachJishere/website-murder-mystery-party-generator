import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as C from "./review-core.ts";
import * as LC from "./label-conformity.ts";
import * as RR from "./roster-reconcile.ts";
import * as LP from "./leak-probe.ts";
import * as FC from "./fact-check.ts";
import { LABELS_BY_CODE } from "./label-tables.ts";
import * as PS from "../_shared/packageScaffold.ts";
import { applyLaterRenames, extractRosterFromMessage, mergeRosterContinuations } from "../_shared/rosterExtraction.ts";

/**
 * ADR-0136: production LLM quality reviewer.
 *
 * REPORT-ONLY by default: it reads a finished package, asks the model one structured question per character (plus one for the shared
 * documents), validates every finding against the stored text (the quoted span must appear exactly once in the named field), stores the
 * findings in package_review_findings and emails a digest to support@. It never edits content unless REVIEW_AUTO_APPLY_CLASSES lists a
 * category (empty = off); the auto-apply path is wired but NOT yet exercised live.
 *
 * Invocation (service role): { mode: "sweep", max_packages?: number }  - reviews the next packages from list_packages_needing_review
 *                            { mode: "one", package_id, force?, dry_run? }
 *                            { mode: "release_queue" } - ADR-0138: packages held in status 'reviewing' are reviewed, their findings of the
 *                              classes in pipeline_settings.review_auto_apply_classes are applied (with the revert guard), and they are released.
 *                              A failed, stuck or cost-capped review never holds a customer: the package is released anyway and an alert is sent.
 * ADR-0152 modes: { mode: "conform_labels" | "reconcile_roster", package_id, dry_run?, force? }  (free heals; dry run by default)
 *                  { mode: "heal_scan", since?, limit?, offset? }  (read-only corpus check of both heals)
 *                  { mode: "leak_probe", package_id, paid?, write? }  (cross-sheet secret check; model calls only when paid:true)
 * Spend is logged in auto_remediation_log (defect_class "llm_review") so it counts against the same daily cap as the other heals.
 * Calibration and design: docs/adr/0136-llm-quality-review-pass-for-autonomous-packages.md (Addenda 1-4), docs/adr/0136-pilot/.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MODEL = Deno.env.get("REVIEW_MODEL") || C.DEFAULT_MODEL;
const EFFORT = Deno.env.get("REVIEW_EFFORT") || "high";
// Default "off" (Jonathan, 2026-10-03: no routine review email). "summary": counts + high items; "full": up to 40 findings. The full list is always in package_review_findings.
const DIGEST_MODE = (Deno.env.get("REVIEW_DIGEST") || "off").toLowerCase();
// Optional: email a summary only when a review has a HIGH finding (off by default; Jonathan wants email only for things that need his attention).
const ALERT_HIGH = Deno.env.get("REVIEW_ALERT_HIGH") === "1";
const AUTO_APPLY_CLASSES = (Deno.env.get("REVIEW_AUTO_APPLY_CLASSES") || "").split(",").map((s) => s.trim()).filter(Boolean);
const PER_PACKAGE_CAP_USD = 2.0;
const STALE_TWIN_CATEGORIES = ["wrong_fact", "cross_field_contradiction"];
const POINTFORM_RESYNC_COST_USD = 0.05; // same figure as auto-remediate-packages POINTFORM_REGEN_COST_USD
const DAILY_CAP_USD = 10.0; // same figure as auto-remediate-packages
const CONCURRENCY = 4;
const CALL_TIMEOUT_MS = 170_000;
const RUN_BUDGET_MS = 300_000;

type Row = Record<string, unknown>;

async function spentToday(): Promise<number> {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase.from("auto_remediation_log").select("cost_usd").gte("created_at", start.toISOString());
  if (error) throw new Error(`spend lookup failed: ${error.message}`);
  return (data ?? []).reduce((s: number, r: { cost_usd: number | string | null }) => s + Number(r.cost_usd ?? 0), 0);
}

type CallResult = { item: string; findings: C.RawFinding[]; usage: C.Usage; cost: number; stop: string; error?: string; secs: number };

async function callModel(apiKey: string, system: C.SystemBlock[], userText: string, opts: { schema?: unknown; effort?: string; maxTokens?: number } = {}): Promise<{ text: string; usage: C.Usage; stop: string }> {
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CALL_TIMEOUT_MS);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: opts.maxTokens ?? 12000,
          system,
          // Sonnet 5.5: thinking is on by default and cannot be sent as "disabled"; depth is controlled with effort.
          output_config: { effort: opts.effort ?? EFFORT, format: { type: "json_schema", schema: opts.schema ?? C.FINDINGS_SCHEMA } },
          messages: [{ role: "user", content: userText }],
        }),
        signal: ctl.signal,
      });
      if (resp.status === 429 || resp.status >= 500) {
        lastErr = `HTTP ${resp.status}`;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!resp.ok) throw new Error(`Anthropic HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      const j = await resp.json();
      const text = (j.content ?? []).find((b: { type: string }) => b.type === "text")?.text ?? "";
      return { text, usage: j.usage ?? {}, stop: j.stop_reason ?? "" };
    } catch (e) {
      lastErr = (e as Error).message;
      if ((e as Error).name !== "AbortError") throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`model call failed after retries: ${lastErr}`);
}

async function reviewItem(apiKey: string, system: C.SystemBlock[], name: string, userText: string): Promise<CallResult> {
  const t0 = Date.now();
  try {
    const r = await callModel(apiKey, system, userText);
    const cost = C.costUsd(r.usage);
    if (r.stop === "refusal") return { item: name, findings: [], usage: r.usage, cost, stop: r.stop, error: "refusal", secs: (Date.now() - t0) / 1000 };
    let findings: C.RawFinding[] = [];
    try { findings = JSON.parse(r.text).findings ?? []; } catch (e) {
      return { item: name, findings: [], usage: r.usage, cost, stop: r.stop, error: `parse: ${(e as Error).message}`, secs: (Date.now() - t0) / 1000 };
    }
    return { item: name, findings, usage: r.usage, cost, stop: r.stop, secs: (Date.now() - t0) / 1000 };
  } catch (e) {
    return { item: name, findings: [], usage: {}, cost: 0, stop: "", error: (e as Error).message, secs: (Date.now() - t0) / 1000 };
  }
}

/**
 * ADR-0155: when the Master Doc carries no requirements list, build one from the customer's own words (user_conversation) with one extra
 * call. Best effort: any failure returns null (the coverage check is then skipped, as before), never throws. The caller adds `cost` to the
 * package spend and logs it (defect_class llm_review, action requirements_extract).
 */
async function extractRequirements(apiKey: string, pkg: Row): Promise<{ reqs: C.CustomerRequirements | null; cost: number; secs: number; note?: string }> {
  const t0 = Date.now();
  const userText = C.requirementsExtractionText(pkg.user_conversation);
  if (!userText) return { reqs: null, cost: 0, secs: 0, note: "no user_conversation" };
  try {
    if ((await spentToday()) >= DAILY_CAP_USD) return { reqs: null, cost: 0, secs: 0, note: "daily cost cap" };
    const r = await callModel(apiKey, [{ type: "text", text: C.requirementsExtractionInstructions() }], userText, { schema: C.REQUIREMENTS_EXTRACT_SCHEMA, effort: "medium", maxTokens: 6000 });
    const cost = C.costUsd(r.usage);
    const secs = (Date.now() - t0) / 1000;
    if (r.stop === "refusal") return { reqs: null, cost, secs, note: "refusal" };
    const reqs = C.parseExtractedRequirements(r.text);
    return { reqs, cost, secs, note: reqs ? undefined : `no requirements parsed (stop ${r.stop})` };
  } catch (e) {
    console.error(`requirements extraction failed (ignored): ${(e as Error).message}`);
    return { reqs: null, cost: 0, secs: (Date.now() - t0) / 1000, note: `error: ${(e as Error).message.slice(0, 120)}` };
  }
}

async function logSpend(packageId: string, action: string, outcome: "fixed" | "escalated" | "failed", cost: number) {
  const { error } = await supabase.from("auto_remediation_log").insert({
    package_id: packageId, defect_class: "llm_review", action, before_value: null, outcome, cost_usd: Number(cost.toFixed(4)),
  });
  if (error) console.error(`auto_remediation_log insert failed: ${error.message}`);
}

/** Email only when the reviewer itself needs attention (a failed, stuck or cost-capped run). */
async function sendAlert(subject: string, body: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Mystery Maker Alerts <noreply@mysterymaker.party>", to: ["support@mysterymaker.party"], subject,
      html: `<div style="font-family:sans-serif;max-width:700px"><h3>${C.escapeHtml(subject)}</h3><p>${C.escapeHtml(body)}</p><p style="color:#6b7280">Details are in auto_remediation_log and package_reviews. A held package is always released; the reviewer never blocks a customer.</p></div>` }),
  });
  if (!resp.ok) console.error(`alert email failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
}

/** ADR-0150: a second review pass AFTER release (never delays a customer). One package per call; kill switch pipeline_settings.review_second_pass = 'off'. */
async function secondPass(only?: string, force = false): Promise<Row> {
  if ((await setting("review_second_pass", "on")) !== "on") return { skipped: "review_second_pass off" };
  if ((await spentToday()) >= DAILY_CAP_USD) return { skipped: "daily cost cap" };
  const ver = C.PROMPT_VERSION + "+p2";
  let id = only ?? null;
  if (!id) {
    const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const before = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: rel } = await supabase.from("mystery_packages").select("id").gte("quality_review_released_at", since).lte("quality_review_released_at", before).order("quality_review_released_at", { ascending: true }).limit(40);
    const ids = ((rel ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length === 0) return { skipped: "nothing released in the last 12 hours" };
    const { data: rv } = await supabase.from("package_reviews").select("package_id,prompt_version,status").in("package_id", ids).in("prompt_version", [C.PROMPT_VERSION, ver]);
    const rows = (rv ?? []) as { package_id: string; prompt_version: string; status: string }[];
    const first = new Set(rows.filter((r) => r.prompt_version === C.PROMPT_VERSION && (r.status === "done" || r.status === "partial")).map((r) => r.package_id));
    const second = new Set(rows.filter((r) => r.prompt_version === ver).map((r) => r.package_id));
    id = ids.find((i) => first.has(i) && !second.has(i)) ?? null;
    if (!id) return { skipped: "no package waiting for a second pass" };
  }
  await runFreeHeals(id); // ADR-0152
  const r = await reviewPackage(id, { version: ver, pass2: true, force, applyClasses: [] });
  const classes = (await setting("review_auto_apply_classes", "")).split(",").map((c) => c.trim()).filter(Boolean);
  const applied = r.skipped ? { applied: 0, reverted: 0 } : await applyOpenFindings(id, classes);
  // ADR-0152 lever 3: the cross-sheet secret check is paid, so it runs only when pipeline_settings.review_leak_probe = 'on' (default off).
  let leak: Row | undefined;
  if (!r.skipped && (await setting("review_leak_probe", "off")) === "on") {
    try { leak = await leakProbe(id, { write: true }); } catch (e) { console.error(`leak probe failed (ignored): ${(e as Error).message}`); leak = { error: (e as Error).message }; }
  }
  let fact: Row | undefined;
  if (!r.skipped && (await setting("review_fact_check", "off")) === "on") {
    try { fact = await factProbe(id, { write: true }); } catch (e) { console.error(`fact check failed (ignored): ${(e as Error).message}`); fact = { error: (e as Error).message }; }
  }
  return { ...r, second_pass: true, applied: applied.applied, reverted: applied.reverted, leak, fact };
}

/** ADR-0149: one email per UTC day listing packages released in the last 26 hours that still carry unverified open findings. */
async function openDigest(dryRun: boolean): Promise<Row> {
  const minSev = (await setting("review_open_digest_min_severity", "high")).trim().toLowerCase();
  if (!["high", "medium"].includes(minSev)) return { skipped: `review_open_digest_min_severity=${minSev}` };
  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const { data: pk } = await supabase.from("mystery_packages").select("id,title,mystery_style,evidence_cards").gte("quality_review_released_at", since);
  const pkgs = (pk ?? []) as { id: string; title: string | null; mystery_style: string | null; evidence_cards: unknown }[];
  if (pkgs.length === 0) return { sent: false, packages: 0 };
  const titles = new Map(pkgs.map((p) => [p.id, p.title ?? ""]));
  const { data: fs } = await supabase.from("package_review_findings")
    .select("package_id,item_name,field,category,severity,exact_quote,explanation").in("package_id", [...titles.keys()]).eq("status", "open").is("human_verdict", null);
  const rows: C.OpenFindingRow[] = ((fs ?? []) as Omit<C.OpenFindingRow, "title">[]).map((f) => ({ ...f, title: titles.get(f.package_id) ?? "" }));
  // ADR-0151: deterministic check that no printed evidence card names the murderer or accomplice (detective style only).
  const detective = pkgs.filter((p) => p.mystery_style === "detective");
  if (detective.length > 0) {
    const { data: cs } = await supabase.from("mystery_characters").select("package_id,character_name,character_role").in("package_id", detective.map((p) => p.id)).in("character_role", ["murderer", "accomplice"]);
    for (const p of detective) {
      const names = ((cs ?? []) as { package_id: string; character_name: string }[]).filter((c) => c.package_id === p.id).map((c) => c.character_name);
      for (const h of C.culpritNameHits(p.evidence_cards, names)) {
        rows.push({ package_id: p.id, title: p.title ?? "", item_name: C.DOC_ITEM_NAME, field: "evidence_cards", category: "secret_leak", severity: "high",
          exact_quote: h.snippet, explanation: `A printed evidence card names the culprit ${h.name} (deterministic check, ADR-0035). Neutralise the name in the card DESCRIPTION.` });
      }
    }
  }
  // ADR-0103 Addendum 91: deterministic check that the props list is in the same language as the game overview (SQL detector, free).
  try {
    const { data: ml } = await supabase.rpc("list_packages_with_materials_language_mismatch", { _since: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() });
    for (const m of (ml ?? []) as { package_id: string; title: string | null; mismatch: string }[]) {
      if (!titles.has(m.package_id)) continue;
      rows.push({ package_id: m.package_id, title: titles.get(m.package_id) ?? "", item_name: C.DOC_ITEM_NAME, field: "materials", category: "language_slip", severity: "high",
        exact_quote: m.mismatch, explanation: "The props list (materials) is in a different language than the game overview (deterministic check, ADR-0103 Addendum 91). Translate the bullets by hand." });
    }
  } catch (e) { console.error(`materials language check failed (ignored): ${(e as Error).message}`); }
  const mail = C.openDigestEmail(rows, minSev);
  if (!mail) return { sent: false, packages: pkgs.length, qualifying: 0, min_severity: minSev };
  if (dryRun) return { sent: false, dry_run: true, subject: mail.subject, packages: mail.packages, findings: mail.findings };
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const { data: already } = await supabase.from("auto_remediation_log").select("id").eq("defect_class", "llm_review").eq("action", "alert:open_digest").gte("created_at", dayStart.toISOString()).limit(1);
  if (already && already.length > 0) return { sent: false, reason: "already sent today" };
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { sent: false, reason: "RESEND_API_KEY missing" };
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Mystery Maker Alerts <noreply@mysterymaker.party>", to: ["support@mysterymaker.party"], subject: mail.subject, html: mail.html }),
  });
  if (!resp.ok) return { sent: false, error: `${resp.status} ${(await resp.text()).slice(0, 200)}` };
  await logSpend(pkgs[0].id, "alert:open_digest", "escalated", 0);
  return { sent: true, packages: mail.packages, findings: mail.findings };
}

async function sendDigest(pkgTitle: string, packageId: string, style: string, kept: C.DigestFinding[], cost: number) {
  const key = Deno.env.get("RESEND_API_KEY");
  const mail = C.digestEmail(pkgTitle, packageId, style, MODEL, cost, kept, DIGEST_MODE);
  if (!key || !mail) return;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Mystery Maker Alerts <noreply@mysterymaker.party>", to: ["support@mysterymaker.party"], subject: mail.subject, html: mail.html }),
  });
  if (!resp.ok) console.error(`digest email failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
}

/** Auto-apply tier. OFF unless REVIEW_AUTO_APPLY_CLASSES names a category. Not yet exercised on a live package. */
async function autoApply(packageId: string, pkg: Row, chars: Row[], findingRows: { id: string; item_name: string; field: string; category: string; exact_quote: string; suggested_replacement: string }[], classes: string[] = AUTO_APPLY_CLASSES) {
  let applied = 0, reverted = 0;
  const staleTwins = new Set<string>();
  // Customer-wording guard: never auto-rewrite wording the customer typed themselves (they may have asked for it verbatim).
  const { data: userMsgs } = await supabase.from("messages").select("content").eq("conversation_id", String(pkg.conversation_id ?? "")).eq("role", "user");
  const customerTexts = ((userMsgs ?? []) as { content: string | null }[]).map((m) => m.content ?? "").filter(Boolean);
  for (const f of findingRows) {
    if (!classes.includes(f.category)) continue;
    const raw: C.RawFinding = { field: f.field, exact_quote: f.exact_quote, category: f.category, severity: "medium", explanation: "", suggested_replacement: f.suggested_replacement };
    if (!C.replacementIsSane(raw)) continue;
    if (C.quoteIsCustomerWording(f.exact_quote, customerTexts)) {
      await supabase.from("package_review_findings").update({ human_note: "Not auto-applied: the quoted wording appears in the customer's own chat messages (possibly requested verbatim). Left open for a human." }).eq("id", f.id);
      continue;
    }
    const isDoc = f.item_name === C.DOC_ITEM_NAME;
    const rowId = isDoc ? packageId : String(chars.find((c) => c.character_name === f.item_name)?.id ?? "");
    if (!rowId) continue;
    const table = isDoc ? "mystery_packages" : "mystery_characters";
    const { data: cur } = await supabase.from(table).select(f.field).eq("id", rowId).single();
    const before = cur ? (cur as unknown as Row)[f.field] : null;
    if (typeof before !== "string") continue; // only plain text fields
    const after = C.applyReplacement(before, raw);
    if (after === null) continue;
    const { data: defBefore } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
    const w = await supabase.rpc("remediation_write_field", { _scope: isDoc ? "package" : "character", _row_id: rowId, _field: f.field, _value: after });
    if (w.error) { console.error(`apply failed: ${w.error.message}`); continue; }
    // `secret` is duplicated in the `secrets` list column; keep them in sync (found on Boogie, 2026-10-03).
    const syncSecrets = async (value: string) => { if (!isDoc && f.field === "secret") await supabase.from("mystery_characters").update({ secrets: [value] }).eq("id", rowId); };
    await syncSecrets(after);
    const { data: defAfter } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
    const beforeSet = new Set((defBefore as string[] | null) ?? []);
    const introduced = ((defAfter as string[] | null) ?? []).filter((d) => !beforeSet.has(d));
    if (introduced.length > 0) {
      await supabase.rpc("remediation_write_field", { _scope: isDoc ? "package" : "character", _row_id: rowId, _field: f.field, _value: before });
      await syncSecrets(before);
      await supabase.from("package_review_findings").update({ status: "reverted", resolved_at: new Date().toISOString() }).eq("id", f.id);
      reverted++;
    } else {
      await supabase.from("package_review_findings").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", f.id);
      applied++;
      // ADR-0138: keep the pointform bullets in step when they quote the same span verbatim (best effort; bullets usually paraphrase).
      if (!isDoc) {
        const pfField = `${f.field}_pointform`;
        const { data: pfRow } = await supabase.from("mystery_characters").select(pfField).eq("id", rowId).single();
        const pf = pfRow ? (pfRow as unknown as Row)[pfField] : null;
        if (typeof pf === "string") {
          const pfAfter = C.applyReplacement(pf, raw);
          if (pfAfter !== null) await supabase.from("mystery_characters").update({ [pfField]: pfAfter }).eq("id", rowId);
          // ADR-0152: a FACT fix whose bullet twin does not quote the span leaves a stale bullet (The Last Thanksgiving, Edmund). Grammar fixes do not.
          else if (pf.trim() && STALE_TWIN_CATEGORIES.includes(f.category)) staleTwins.add(rowId);
        }
      }
    }
  }
  // ADR-0152: regenerate the bullet versions of characters whose fact fix left a stale bullet (about 0.05 USD per character, kill switch review_pointform_resync = off).
  if (applied > 0 && staleTwins.size > 0 && (await setting("review_pointform_resync", "on")) === "on") {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-pointform-summaries`, {
        method: "POST", headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, characterIds: [...staleTwins] }),
      });
      await logSpend(packageId, `pointform_resync:${staleTwins.size}_characters:${resp.status}`, resp.ok ? "fixed" : "failed", POINTFORM_RESYNC_COST_USD * staleTwins.size);
    } catch (e) { console.error(`pointform resync failed (ignored): ${(e as Error).message}`); }
  }
  return { applied, reverted };
}

/** ADR-0140: re-check the other fields that mention a corrected fact. Returns validated findings (never writes anything). */
type PropRow = { item_name: string; field: string; category: string; severity: string; exact_quote: string; explanation: string; suggested_replacement: string };
async function propagate(
  apiKey: string, system: C.SystemBlock[], items: { name: string; row: Row }[], kept: Row[], chars: Row[], extra: C.Correction[] = [],
): Promise<{ rows: PropRow[]; cost: number; calls: number; candidates: number; anchors: string[] }> {
  const corrections: C.Correction[] = [
    ...kept.filter((k) => C.PROPAGATION_CATEGORIES.includes(String(k.category))).map((k) => ({
      quote: String(k.exact_quote), explanation: String(k.explanation ?? ""), replacement: String(k.suggested_replacement ?? ""),
    })),
    ...extra,
  ];
  const anchors = [...new Set(corrections.flatMap((c) => C.anchorsFrom(c.quote, c.explanation, c.replacement)))];
  if (corrections.length === 0 || anchors.length === 0) return { rows: [], cost: 0, calls: 0, candidates: 0, anchors };
  const propItems = items.map((i) => ({ name: i.name, row: i.row, fields: i.name === C.DOC_ITEM_NAME ? C.DOC_FIELDS : C.CHARACTER_FIELDS }));
  const skip = new Set(kept.map((k) => `${k.item_name}\u0000${k.field}`));
  const cands = C.propagationCandidates(propItems, anchors, skip, chars.map((c) => String(c.character_name)));
  const byItem = new Map<string, C.PropCandidate[]>();
  for (const c of cands) byItem.set(c.item, [...(byItem.get(c.item) ?? []), c]);
  const rows: PropRow[] = [];
  let cost = 0, calls = 0;
  const rowOf = new Map(items.map((i) => [i.name, i.row]));
  for (const [name, list] of [...byItem.entries()].slice(0, 6)) {
    const r = await reviewItem(apiKey, system, `${name} (propagation)`, C.propagationText(name, corrections, list.map((c) => ({ field: c.field, text: c.text }))));
    calls++; cost += r.cost;
    for (const f of r.findings) {
      const row = rowOf.get(name)!;
      if (!C.validateFinding(row, f).ok) continue;
      if (kept.some((k) => k.item_name === name && k.field === f.field && k.exact_quote === f.exact_quote)) continue;
      if (!C.PROPAGATION_CATEGORIES.includes(f.category)) continue;
      rows.push({ item_name: name, field: f.field, category: f.category, severity: f.severity, exact_quote: f.exact_quote,
        explanation: `Same wrong fact elsewhere: ${(f.explanation ?? "").slice(0, 440)}`, suggested_replacement: f.suggested_replacement ?? "" });
    }
  }
  return { rows, cost, calls, candidates: cands.length, anchors };
}

async function reviewPackage(packageId: string, opts: { force?: boolean; dryRun?: boolean; applyClasses?: string[]; version?: string; pass2?: boolean; requirementsOnly?: boolean; forceExtract?: boolean; remove?: string[] }): Promise<Row> {
  const version = opts.version ?? C.PROMPT_VERSION;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { data: pkg, error: pe } = await supabase.from("mystery_packages").select("*").eq("id", packageId).single();
  if (pe || !pkg) throw new Error(`package ${packageId} not found`);
  const { data: charsData, error: ce } = await supabase.from("mystery_characters").select("*").eq("package_id", packageId).order("character_name");
  if (ce) throw new Error(`characters lookup failed: ${ce.message}`);
  const chars = (charsData ?? []) as Row[];
  const style: C.Style = (pkg as Row).mystery_style === "detective" ? "detective" : "character";

  const system = C.buildSystemBlocks(pkg as Row, chars, style);
  const items: { name: string; text: string; row: Row }[] = [
    ...chars.map((c) => ({ name: String(c.character_name), text: C.characterBlock(c, style), row: c })),
    { name: C.DOC_ITEM_NAME, text: C.packageDocsBlock(pkg as Row), row: pkg as Row },
  ];
  // ADR-0150: requirements coverage item (kill switch: pipeline_settings.review_requirements = 'off'); not in the second pass.
  let reqs: C.CustomerRequirements | null = null;
  let reqSource: "master_context" | "conversation" | "none" = "none";
  let extractCost = 0, extractSecs = 0, extractNote: string | undefined;
  if (!opts.pass2 && (opts.requirementsOnly || (await setting("review_requirements", "on")) === "on")) {
    reqs = opts.forceExtract && opts.requirementsOnly ? null : C.customerRequirements(pkg as Row); // forceExtract: probe-only, proves the fallback on a package that has a Master Doc list
    if (reqs) reqSource = "master_context";
    else if (!opts.dryRun) {
      // ADR-0155: the Master Doc carried no list (about 88 percent of orders); build one from the customer's own words. Logged on its own row.
      const x = await extractRequirements(apiKey, pkg as Row);
      reqs = x.reqs; extractCost = x.cost; extractSecs = x.secs; extractNote = x.note;
      if (reqs) reqSource = "conversation";
      if (x.cost > 0) await logSpend(packageId, `requirements_extract:${reqs?.count ?? 0}_lines`, reqs ? "escalated" : "failed", x.cost);
    }
  }
  const reqText = (chs: Row[]) => C.coverageBlock(reqs!, chs, style, pkg as Row);
  if (reqs && !opts.requirementsOnly) items.push({ name: C.REQUIREMENTS_ITEM_NAME, text: reqText(chars), row: { [C.REQUIREMENTS_FIELD]: reqs.text } });
  if (opts.requirementsOnly) {
    // Read-only probe: runs just the coverage call (optionally with phrases removed from the character text to prove it notices) and writes nothing.
    if (!reqs) return { package_id: packageId, skipped: "no customer requirements in master_context or user_conversation", extraction_note: extractNote, extraction_cost_usd: Number(extractCost.toFixed(4)) };
    const strip = (v: unknown) => { let t = typeof v === "string" ? v : ""; for (const ph of opts.remove ?? []) t = t.replace(new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), ""); return t; };
    const chs = (opts.remove?.length ? chars.map((c) => ({ ...c, ...Object.fromEntries(C.CHARACTER_FIELDS.map((f) => [f, strip(c[f])])) })) : chars);
    const r = await reviewItem(apiKey, system, C.REQUIREMENTS_ITEM_NAME, reqText(chs));
    const row = { [C.REQUIREMENTS_FIELD]: reqs.text } as Row;
    if (r.cost > 0) await logSpend(packageId, `requirements_probe:${r.findings.length}_findings`, "escalated", r.cost);
    return { package_id: packageId, requirements: reqs.count, requirements_source: reqSource, requirements_list: reqs.text, extraction_cost_usd: Number(extractCost.toFixed(4)), extraction_secs: Math.round(extractSecs),
      removed: opts.remove ?? [], cost_usd: Number((r.cost + extractCost).toFixed(4)), coverage_cost_usd: Number(r.cost.toFixed(4)), secs: Math.round(r.secs), error: r.error,
      findings: r.findings.map((f) => ({ ok: C.validateFinding(row, f).ok, severity: f.severity, quote: f.exact_quote.slice(0, 120), explanation: f.explanation })) };
  }
  if (opts.dryRun) return { package_id: packageId, style, items: items.length, requirements: reqs?.count ?? 0, system_chars: system.reduce((n, b) => n + b.text.length, 0), dry_run: true };

  if (opts.force) await supabase.from("package_reviews").delete().eq("package_id", packageId).eq("prompt_version", version);
  const { data: review, error: re } = await supabase.from("package_reviews")
    .insert({ package_id: packageId, prompt_version: version, model: MODEL, mystery_style: style }).select("id").single();
  if (re || !review) return { package_id: packageId, skipped: "already reviewed for this prompt version", detail: re?.message };

  const started = Date.now();
  let spent = extractCost; // the extraction is already logged on its own row; it counts toward the per-package cap
  const results: CallResult[] = [];
  const stopReason = () => {
    if (Date.now() - started > RUN_BUDGET_MS) return "run time budget";
    if (spent >= PER_PACKAGE_CAP_USD) return "per-package cost cap";
    return "";
  };
  let dailySpent = await spentToday();
  let partialWhy = "";

  // First call alone so the shared prefix is written to the cache; the rest then read it.
  const first = await reviewItem(apiKey, system, items[0].name, items[0].text);
  results.push(first); spent += first.cost; dailySpent += first.cost;
  const queue = items.slice(1);
  let next = 0;
  const worker = async () => {
    while (true) {
      const why = stopReason() || (dailySpent >= DAILY_CAP_USD ? "daily cost cap" : "");
      if (why) { partialWhy = why; return; }
      const idx = next++;
      if (idx >= queue.length) return;
      const r = await reviewItem(apiKey, system, queue[idx].name, queue[idx].text);
      results.push(r); spent += r.cost; dailySpent += r.cost;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const itemRow = new Map(items.map((i) => [i.name, i.row]));
  const kept: Row[] = [];
  let discarded = 0;
  for (const r of results) {
    const row = itemRow.get(r.item)!;
    for (const f of r.findings) {
      const v = C.validateFinding(row, f);
      if (!v.ok) { discarded++; continue; }
      kept.push({
        review_id: review.id, package_id: packageId, item_name: r.item, field: f.field, category: f.category, severity: f.severity,
        exact_quote: f.exact_quote, explanation: (f.explanation ?? "").slice(0, 500), suggested_replacement: f.suggested_replacement ?? "",
      });
    }
  }
  // ADR-0140: fact propagation (kill switch: pipeline_settings.review_propagate = 'off'). Never blocks the review: a failure only logs.
  let propagated = 0;
  try {
    if (!opts.pass2 && !partialWhy && spent < PER_PACKAGE_CAP_USD && dailySpent < DAILY_CAP_USD && (await setting("review_propagate", "on")) === "on") {
      const pr = await propagate(apiKey, system, items.filter((i) => i.name !== C.REQUIREMENTS_ITEM_NAME), kept, chars);
      for (const x of pr.rows) kept.push({ review_id: review.id, package_id: packageId, ...x });
      spent += pr.cost; dailySpent += pr.cost; propagated = pr.rows.length;
    }
  } catch (e) { console.error(`propagation failed (ignored): ${(e as Error).message}`); }
  if (opts.pass2 && kept.length > 0) {
    // The second pass re-reads the (already corrected) text; drop anything the first pass already recorded.
    const { data: ex } = await supabase.from("package_review_findings").select("item_name,field,exact_quote").eq("package_id", packageId);
    const seen = new Set(((ex ?? []) as { item_name: string; field: string; exact_quote: string }[]).map((e) => `${e.item_name}|${e.field}|${e.exact_quote}`));
    for (let i = kept.length - 1; i >= 0; i--) if (seen.has(`${kept[i].item_name}|${kept[i].field}|${kept[i].exact_quote}`)) kept.splice(i, 1);
  }
  let inserted: { id: string; item_name: string; field: string; category: string; exact_quote: string; suggested_replacement: string; severity: string; explanation: string }[] = [];
  if (kept.length > 0) {
    const { data: ins, error: ie } = await supabase.from("package_review_findings").insert(kept).select("id,item_name,field,category,exact_quote,suggested_replacement,severity,explanation");
    if (ie) throw new Error(`findings insert failed: ${ie.message}`);
    inserted = (ins ?? []) as typeof inserted;
  }

  const errors = results.filter((r) => r.error).map((r) => `${r.item}: ${r.error}`);
  const status = errors.length === results.length ? "failed" : (partialWhy || errors.length > 0 || results.length < items.length) ? "partial" : "done";
  const tokens = results.reduce((a, r) => ({
    input: a.input + (r.usage.input_tokens ?? 0), cache_write: a.cache_write + (r.usage.cache_creation_input_tokens ?? 0),
    cache_read: a.cache_read + (r.usage.cache_read_input_tokens ?? 0), output: a.output + (r.usage.output_tokens ?? 0),
  }), { input: 0, cache_write: 0, cache_read: 0, output: 0 });
  await supabase.from("package_reviews").update({
    status, finished_at: new Date().toISOString(), items_reviewed: results.length, findings_count: inserted.length, discarded_count: discarded,
    cost_usd: Number(spent.toFixed(4)), tokens, error: [partialWhy, ...errors].filter(Boolean).join(" | ").slice(0, 1000) || null,
  }).eq("id", review.id);
  await logSpend(packageId, `review:${inserted.length}_findings:${status}`, status === "failed" ? "failed" : "escalated", spent - extractCost);

  let apply = { applied: 0, reverted: 0 };
  const applyClasses = opts.applyClasses ?? AUTO_APPLY_CLASSES;
  if (applyClasses.length > 0 && inserted.length > 0) apply = await autoApply(packageId, pkg as Row, chars, inserted, applyClasses);
  if (!opts.pass2) await sendDigest(String((pkg as Row).title ?? ""), packageId, style, inserted, spent);
  if (DIGEST_MODE === "off" && ALERT_HIGH && inserted.some((f) => f.severity === "high")) {
    const mail = C.digestEmail(String((pkg as Row).title ?? ""), packageId, style, MODEL, spent, inserted, "summary");
    const key = Deno.env.get("RESEND_API_KEY");
    if (mail && key) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "Mystery Maker Alerts <noreply@mysterymaker.party>", to: ["support@mysterymaker.party"], subject: mail.subject, html: mail.html }) });
  }
  if (status === "failed" || partialWhy || errors.length > 0) {
    await sendAlert(`Reviewer needs attention: ${String((pkg as Row).title ?? packageId)} (${status})`, `Review status ${status}; reviewed ${results.length} of ${items.length} items; ${[partialWhy, ...errors.slice(0, 3)].filter(Boolean).join(" | ") || "no detail"}. Package ${packageId}.`);
  }

  return { package_id: packageId, title: (pkg as Row).title, style, status, items: items.length, reviewed: results.length, findings: inserted.length,
    high: inserted.filter((f) => f.severity === "high").length, propagated, discarded, requirements: reqs?.count ?? 0, requirements_source: reqSource, extraction_cost_usd: Number(extractCost.toFixed(4)), cost_usd: Number(spent.toFixed(4)), partial_reason: partialWhy || undefined, errors: errors.slice(0, 5), auto_apply: apply };
}

// ---------------------------------------------------------------------------------------------------------------------------
// ADR-0152: free deterministic heals (label conformity, renamed characters) and the cross-sheet secret check.
// Settings (pipeline_settings): label_conformity / roster_reconcile = "on" (write), "report" (default: compute and log, write nothing), "off".
// review_leak_probe = "on" runs the paid cross-sheet secret check in the second pass; default "off".
// ---------------------------------------------------------------------------------------------------------------------------
const WRITABLE_MODES = new Set(["on", "report", "off"]);
async function healMode(key: string): Promise<"on" | "report" | "off"> {
  const v = (await setting(key, "report")).trim().toLowerCase();
  return (WRITABLE_MODES.has(v) ? v : "report") as "on" | "report" | "off";
}

async function logHeal(packageId: string, defectClass: string, action: string, before: unknown, outcome: "fixed" | "escalated" | "failed") {
  const { error } = await supabase.from("auto_remediation_log").insert({
    package_id: packageId, defect_class: defectClass, action: action.slice(0, 200), before_value: JSON.stringify(before).slice(0, 4000), outcome, cost_usd: 0,
  });
  if (error) console.error(`auto_remediation_log insert failed: ${error.message}`);
}

/** Free label conformity heal for a non-English package (ADR-0152). dryRun = compute only. */
async function healLabels(packageId: string, opts: { dryRun?: boolean; force?: boolean } = {}): Promise<Row> {
  const mode = opts.force ? "on" : await healMode("label_conformity");
  if (mode === "off") return { skipped: "label_conformity off" };
  const { data: charsData } = await supabase.from("mystery_characters").select("*").eq("package_id", packageId).order("character_name");
  const chars = (charsData ?? []) as Row[];
  const lang = C.detectLanguage(C.languageSample(chars));
  if (!lang || !LABELS_BY_CODE[lang]) return { skipped: `language ${lang ?? "unclear"} has no label table` };
  const plan = LC.conformPackage(chars, lang);
  const agg = new Map<string, number>();
  for (const c of plan.changes) for (const e of c.edits) agg.set(`${e.from} => ${e.to}`, (agg.get(`${e.from} => ${e.to}`) ?? 0) + 1);
  const summary = { language: lang, edits: plan.total, characters: plan.changes.length, top: [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `${n}x ${k}`) };
  if (plan.total === 0) return summary;
  if (opts.dryRun || mode === "report") {
    if (!opts.dryRun) await logHeal(packageId, "label_conformity", `would_conform:${plan.total}_labels:${lang}`, plan.changes.flatMap((c) => c.edits.map((e) => ({ n: c.name, f: e.field, from: e.from, to: e.to }))), "escalated");
    return { ...summary, written: false, mode: opts.dryRun ? "dry_run" : "report" };
  }
  const { data: defBefore } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
  const written: { id: string; field: string; before: string }[] = [];
  let failed = "";
  for (const ch of plan.changes) {
    const row = chars.find((c) => String(c.id) === ch.id)!;
    for (const [field, value] of Object.entries(ch.fields)) {
      const w = await supabase.rpc("remediation_write_field", { _scope: "character", _row_id: ch.id, _field: field, _value: value });
      if (w.error) { failed = w.error.message; break; }
      written.push({ id: ch.id, field, before: String(row[field] ?? "") });
      if (field === "secret") await supabase.from("mystery_characters").update({ secrets: [value] }).eq("id", ch.id);
    }
    if (failed) break;
  }
  const { data: defAfter } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
  const beforeSet = new Set((defBefore as string[] | null) ?? []);
  const introduced = ((defAfter as string[] | null) ?? []).filter((d) => !beforeSet.has(d));
  if (failed || introduced.length > 0) {
    for (const w of written.reverse()) {
      await supabase.rpc("remediation_write_field", { _scope: "character", _row_id: w.id, _field: w.field, _value: w.before });
      if (w.field === "secret") await supabase.from("mystery_characters").update({ secrets: [w.before] }).eq("id", w.id);
    }
    await logHeal(packageId, "label_conformity", `conform_reverted:${failed ? "write_error" : introduced.join("+")}`, { failed, introduced }, "failed");
    return { ...summary, written: false, reverted: true, why: failed || introduced.join(", ") };
  }
  await logHeal(packageId, "label_conformity", `conform:${plan.total}_labels:${lang}`, plan.changes.flatMap((c) => c.edits.map((e) => ({ n: c.name, f: e.field, from: e.from, to: e.to }))), "fixed");
  return { ...summary, written: true };
}

/** Free scaffold localization for a non-English package (ADR-0161): the detective script, evidence card and Game Overview template lines the Parent copies in English. dryRun = compute only. */
async function healScaffold(packageId: string, opts: { dryRun?: boolean; force?: boolean; language?: string } = {}): Promise<Row> {
  const mode = opts.force ? "on" : await healMode("scaffold_localization");
  if (mode === "off") return { skipped: "scaffold_localization off" };
  const { data: pkg } = await supabase.from("mystery_packages").select("id,detective_script,evidence_cards,game_overview").eq("id", packageId).maybeSingle();
  if (!pkg) return { skipped: "package not found" };
  const { data: charsData } = await supabase.from("mystery_characters").select("introduction").eq("package_id", packageId).order("character_name");
  // `language` is a manual override for a package the detector cannot place (a manual run only).
  const lang = opts.language && opts.force ? opts.language : PS.detectScaffoldLanguage(C.languageSample((charsData ?? []) as Row[]));
  if (!lang || !PS.SCAFFOLD_LANGUAGES.includes(lang)) return { skipped: `language ${lang ?? "unclear"} has no scaffold table` };
  const plan: { field: PS.ScaffoldField; before: string; after: string; edits: PS.ScaffoldEdit[] }[] = [];
  const unmatched: string[] = [];
  for (const field of PS.SCAFFOLD_FIELDS) {
    const cur = (pkg as Row)[field];
    if (typeof cur !== "string" || !cur) continue; // evidence_cards can be a non-string jsonb in old packages: never rewritten
    const r = PS.localizeScaffoldField(field, cur, lang);
    unmatched.push(...r.unmatched);
    if (r.edits.length > 0 && r.text !== cur) plan.push({ field, before: cur, after: r.text, edits: r.edits });
  }
  const total = plan.reduce((a, f) => a + f.edits.length, 0);
  const summary = { language: lang, edits: total, fields: Object.fromEntries(plan.map((f) => [f.field, f.edits.length])), unmatched_english_lines: unmatched.slice(0, 10) };
  if (total === 0) return summary;
  const edits = plan.flatMap((f) => f.edits.map((e) => ({ f: f.field, from: e.from.slice(0, 120), to: e.to.slice(0, 120) })));
  if (opts.dryRun || mode === "report") {
    if (!opts.dryRun) await logHeal(packageId, "scaffold_localization", `would_localize:${total}_lines:${lang}`, edits, "escalated");
    return { ...summary, written: false, mode: opts.dryRun ? "dry_run" : "report" };
  }
  const { data: defBefore } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
  const written: { field: string; before: string }[] = [];
  let failed = "";
  for (const f of plan) {
    const w = await supabase.rpc("remediation_write_field", { _scope: "package", _row_id: packageId, _field: f.field, _value: f.after });
    if (w.error) { failed = w.error.message; break; }
    written.push({ field: f.field, before: f.before });
  }
  const { data: defAfter } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
  const beforeSet = new Set((defBefore as string[] | null) ?? []);
  const introduced = ((defAfter as string[] | null) ?? []).filter((d) => !beforeSet.has(d));
  if (failed || introduced.length > 0) {
    for (const w of written.reverse()) await supabase.rpc("remediation_write_field", { _scope: "package", _row_id: packageId, _field: w.field, _value: w.before });
    await logHeal(packageId, "scaffold_localization", `localize_reverted:${failed ? "write_error" : introduced.join("+")}`, { failed, introduced }, "failed");
    return { ...summary, written: false, reverted: true, why: failed || introduced.join(", ") };
  }
  await logHeal(packageId, "scaffold_localization", `localize:${total}_lines:${lang}`, edits, "fixed");
  return { ...summary, written: true };
}

// Detective-style sheets keep the honest round scripts here instead of the innocent/guilty branches.
const SCRIPT_FIELDS = ["round2_script", "round3_script", "round4_script", "final_statement"];
const RENAME_SKIP = new Set(["id", "package_id", "character_name", "created_at", "updated_at", "character_role"]);

/** Free heal for a character the customer renamed after approval (ADR-0152). Anything not certain becomes an open high finding. */
async function healRoster(packageId: string, opts: { dryRun?: boolean; force?: boolean } = {}): Promise<Row> {
  const mode = opts.force ? "on" : await healMode("roster_reconcile");
  if (mode === "off") return { skipped: "roster_reconcile off" };
  const { data: pkg } = await supabase.from("mystery_packages").select("id,master_context,extracted_characters,mystery_style").eq("id", packageId).single();
  const { data: charsData } = await supabase.from("mystery_characters").select("*").eq("package_id", packageId);
  const chars = (charsData ?? []) as Row[];
  const mc = String((pkg as Row | null)?.master_context ?? "");
  if (!mc || chars.length < 3) return { skipped: "no master_context or too few characters" };
  const sheets = chars.map((c) => ({ name: String(c.character_name), text: Object.entries(c).filter(([k, v]) => !RENAME_SKIP.has(k) && typeof v === "string").map(([, v]) => String(v)).join("\n") }));
  const plan = RR.planRenames(mc, sheets);
  const out: Row = { renames: plan.renames, unresolved: plan.unresolved };
  if (plan.renames.length === 0 && !plan.unresolved) return out;
  if (opts.dryRun) return { ...out, written: false, mode: "dry_run" };
  if (plan.unresolved) await logHeal(packageId, "roster_name_drift", "unresolved", plan.unresolved, "escalated");
  if (plan.renames.length === 0) return out;
  if (mode === "report") { await logHeal(packageId, "roster_name_drift", `would_rename:${plan.renames.map((r) => `${r.from}->${r.to}`).join(";")}`, plan.renames, "escalated"); return { ...out, written: false, mode: "report" }; }
  const { data: defBefore } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
  const undo: { table: string; id: string; patch: Row }[] = [];
  for (const r of plan.renames) {
    const row = chars.find((c) => String(c.character_name) === r.from);
    if (!row) continue;
    const patch: Row = {}, back: Row = {};
    for (const [k, v] of Object.entries(row)) {
      if (RENAME_SKIP.has(k)) continue;
      if (typeof v === "string") { const x = RR.replaceName(v, r.from, r.to); if (x.n > 0) { patch[k] = x.text; back[k] = v; } }
      else if (Array.isArray(v) && v.some((e) => typeof e === "string" && e.includes(r.from))) { patch[k] = v.map((e) => typeof e === "string" ? RR.replaceName(e, r.from, r.to).text : e); back[k] = v; }
    }
    patch.character_name = r.to; back.character_name = r.from;
    const { error } = await supabase.from("mystery_characters").update(patch).eq("id", String(row.id));
    if (error) { console.error(`rename failed: ${error.message}`); continue; }
    undo.push({ table: "mystery_characters", id: String(row.id), patch: back });
  }
  const ec = (pkg as Row).extracted_characters;
  if (typeof ec === "string") {
    let next = ec;
    for (const r of plan.renames) next = next.split(`"name":${JSON.stringify(r.from)}`).join(`"name":${JSON.stringify(r.to)}`);
    if (next !== ec) { await supabase.from("mystery_packages").update({ extracted_characters: next }).eq("id", packageId); undo.push({ table: "mystery_packages", id: packageId, patch: { extracted_characters: ec } }); }
  }
  const { data: defAfter } = await supabase.rpc("package_blocking_defects_by_id", { _id: packageId });
  const beforeSet = new Set((defBefore as string[] | null) ?? []);
  const introduced = ((defAfter as string[] | null) ?? []).filter((d) => !beforeSet.has(d));
  if (introduced.length > 0) {
    for (const u of undo.reverse()) await supabase.from(u.table).update(u.patch).eq("id", u.id);
    await logHeal(packageId, "roster_name_drift", `rename_reverted:${introduced.join("+")}`, plan.renames, "failed");
    return { ...out, written: false, reverted: true, why: introduced.join(", ") };
  }
  await logHeal(packageId, "roster_name_drift", `rename:${plan.renames.map((r) => `${r.from}->${r.to}`).join(";")}`, plan.renames, "fixed");
  return { ...out, written: true };
}

/** Records unresolved roster drift as an open high finding so it reaches the daily email (never writes content). */
async function recordRosterFinding(packageId: string, unresolved: RR.Unresolved) {
  const version = C.PROMPT_VERSION + "+roster";
  const { data: ex } = await supabase.from("package_reviews").select("id").eq("package_id", packageId).eq("prompt_version", version).maybeSingle();
  if (ex) return;
  const { data: rv } = await supabase.from("package_reviews").insert({ package_id: packageId, prompt_version: version, model: "deterministic", status: "done", finished_at: new Date().toISOString() }).select("id").single();
  if (!rv) return;
  await supabase.from("package_review_findings").insert({
    review_id: (rv as { id: string }).id, package_id: packageId, item_name: C.DOC_ITEM_NAME, field: "master_context", category: "cross_field_contradiction", severity: "high",
    exact_quote: unresolved.sheetOnly.join(" / ").slice(0, 200) || "(roster)", suggested_replacement: "",
    explanation: `Character names differ between master_context and the sheets and the automatic rename rule did not hold. Sheets only: ${unresolved.sheetOnly.join(", ") || "none"}. master_context only: ${unresolved.matrixOnly.join(", ") || "none"}. Check the customer's chat for a rename.`.slice(0, 500),
  });
}

/** Runs both free heals for one package. Never throws: a heal problem must not hold a customer. */
async function runFreeHeals(packageId: string): Promise<Row> {
  const out: Row = {};
  try { out.labels = await healLabels(packageId); } catch (e) { console.error(`label heal failed (ignored): ${(e as Error).message}`); out.labels = { error: (e as Error).message }; }
  try { out.scaffold = await healScaffold(packageId); } catch (e) { console.error(`scaffold heal failed (ignored): ${(e as Error).message}`); out.scaffold = { error: (e as Error).message }; }
  try {
    const r = await healRoster(packageId);
    out.roster = r;
    // An open finding (which can reach the daily email) is written only once the roster heal is switched on; in "report" mode the evidence is the auto_remediation_log row.
    if (r.unresolved && !r.dry_run && (await healMode("roster_reconcile")) === "on") await recordRosterFinding(packageId, r.unresolved as RR.Unresolved);
  } catch (e) { console.error(`roster heal failed (ignored): ${(e as Error).message}`); out.roster = { error: (e as Error).message }; }
  return out;
}

/** ADR-0152 lever 3b: cross-sheet fact check. Paid unless dryRun. `overrides` ({sheet: {field: text}}) replaces text in memory only, to replay a package from before a hand fix. */
async function factProbe(packageId: string, opts: { dryRun?: boolean; write?: boolean; overrides?: Record<string, Record<string, string>> } = {}): Promise<Row> {
  const { data: pkg } = await supabase.from("mystery_packages").select("*").eq("id", packageId).single();
  const { data: charsData } = await supabase.from("mystery_characters").select("*").eq("package_id", packageId).order("character_name");
  const chars = ((charsData ?? []) as Row[]).map((c) => ({ ...c, ...(opts.overrides?.[String(c.character_name)] ?? {}) }));
  if (!pkg || chars.length < 3) return { skipped: "package not found or too few characters" };
  const objs = C.parseMasterContext((pkg as Row).master_context) as Record<string, unknown>[];
  const sheets: FC.FactSheet[] = chars.map((c) => ({
    name: String(c.character_name),
    // The guilty and accomplice branches and the confessions may lie by design (a culprit deflecting), so they are never a source of claims about others.
    texts: [...LC.CONFORM_FIELDS, ...SCRIPT_FIELDS].filter((f) => !/_(guilty|accomplice)$|^reveal_confession_/.test(f) && typeof c[f] === "string" && c[f]).map((f) => ({ field: f, text: String(c[f]) })),
    own: ["introduction", "round2_innocent", "round3_innocent", "round4_innocent", "final_innocent", ...SCRIPT_FIELDS].filter((f) => typeof c[f] === "string" && c[f]).map((f) => ({ field: f, text: String(c[f]) })),
    canon: FC.canonFor(String(c.character_name), objs),
  }));
  const cands = FC.factCandidates(sheets);
  const sentences = cands.reduce((n, c) => n + c.hits.length, 0);
  const promptChars = cands.reduce((n, c) => n + FC.factPromptText(c).length + FC.FACT_INSTRUCTIONS.length, 0);
  const estimate = { subjects: cands.length, sentences, approx_input_tokens: Math.round(promptChars / 3.2) };
  if (opts.dryRun || cands.length === 0) return { package_id: packageId, ...estimate, dry_run: true };
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  if ((await spentToday()) >= DAILY_CAP_USD) return { skipped: "daily cost cap" };
  const system: C.SystemBlock[] = [{ type: "text", text: FC.FACT_INSTRUCTIONS }];
  const found: Row[] = [];
  let cost = 0, calls = 0, dropped = 0, next = 0;
  const worker = async () => {
    while (true) {
      const idx = next++;
      if (idx >= cands.length || cost >= 0.9) return;
      const c = cands[idx];
      const r = await reviewItem(apiKey, system, `${c.subject} (fact check)`, FC.factPromptText(c));
      calls++; cost += r.cost;
      for (const f of r.findings) {
        const target = FC.resolveFact(c, f);
        const row = target ? chars.find((x) => String(x.character_name) === target.sheet) : null;
        const finding = target ? { ...f, field: target.field } : f;
        if (!target || !row || !C.validateFinding(row, finding).ok || f.category !== "cross_field_contradiction") { dropped++; continue; }
        found.push({ item_name: target.sheet, field: target.field, category: "cross_field_contradiction", severity: f.severity, exact_quote: f.exact_quote,
          explanation: `About ${c.subject}: ${(f.explanation ?? "").slice(0, 440)}`, suggested_replacement: f.suggested_replacement ?? "" });
      }
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  let stored = 0;
  if (opts.write && !opts.overrides && found.length > 0) {
    const version = C.PROMPT_VERSION + "+fact";
    const { data: rv } = await supabase.from("package_reviews").insert({ package_id: packageId, prompt_version: version, model: MODEL, mystery_style: String((pkg as Row).mystery_style ?? ""), status: "done", finished_at: new Date().toISOString(), items_reviewed: calls, findings_count: found.length, cost_usd: Number(cost.toFixed(4)) }).select("id").single();
    if (rv) { const { error } = await supabase.from("package_review_findings").insert(found.map((f) => ({ review_id: (rv as { id: string }).id, package_id: packageId, ...f }))); if (!error) stored = found.length; }
  }
  if (cost > 0) await logSpend(packageId, `fact_probe:${found.length}_findings`, "escalated", cost);
  return { package_id: packageId, ...estimate, calls, cost_usd: Number(cost.toFixed(4)), findings: found.length, dropped, stored, preview: opts.write ? undefined : found.map((f) => ({ item: f.item_name, field: f.field, severity: f.severity, quote: String(f.exact_quote).slice(0, 160), why: f.explanation, fix: String(f.suggested_replacement).slice(0, 160) })) };
}

/** ADR-0152 lever 3: cross-sheet secret check. Paid unless dryRun. write=false returns the findings without storing them. */
async function leakProbe(packageId: string, opts: { dryRun?: boolean; write?: boolean } = {}): Promise<Row> {
  const { data: pkg } = await supabase.from("mystery_packages").select("*").eq("id", packageId).single();
  const { data: charsData } = await supabase.from("mystery_characters").select("*").eq("package_id", packageId).order("character_name");
  const chars = (charsData ?? []) as Row[];
  if (!pkg || chars.length < 3) return { skipped: "package not found or too few characters" };
  const sheets: LP.LeakSheet[] = chars.map((c) => ({
    name: String(c.character_name), secret: typeof c.secret === "string" ? c.secret : "",
    texts: [...LC.CONFORM_FIELDS, ...SCRIPT_FIELDS].filter((f) => f !== "secret" && typeof c[f] === "string" && c[f]).map((f) => ({ field: f, text: String(c[f]) })),
    open: ["introduction", "round2_innocent", "round3_innocent", "round4_innocent", "final_innocent", ...SCRIPT_FIELDS].map((f) => (typeof c[f] === "string" ? String(c[f]) : "")).filter(Boolean).join("\n\n"),
  }));
  const cands = LP.leakCandidates(sheets, { evidence: LP.parseEvidenceCards((pkg as Row).evidence_cards) });
  const sentences = cands.reduce((n, c) => n + c.hits.length, 0);
  const promptChars = cands.reduce((n, c) => n + LP.leakPromptText(c).length + LP.LEAK_INSTRUCTIONS.length, 0);
  const estimate = { owners: cands.length, sentences, approx_input_tokens: Math.round(promptChars / 3.2) };
  if (opts.dryRun || cands.length === 0) return { package_id: packageId, ...estimate, dry_run: true };
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  if ((await spentToday()) >= DAILY_CAP_USD) return { skipped: "daily cost cap" };
  const system: C.SystemBlock[] = [{ type: "text", text: LP.LEAK_INSTRUCTIONS }];
  const found: Row[] = [];
  let cost = 0, calls = 0, dropped = 0;
  let next = 0;
  const worker = async () => {
    while (true) {
      const idx = next++;
      if (idx >= cands.length || cost >= 0.6) return;
      const c = cands[idx];
      const r = await reviewItem(apiKey, system, `${c.owner} (secret check)`, LP.leakPromptText(c));
      calls++; cost += r.cost;
      for (const f of r.findings) {
        const target = LP.resolveFinding(c, f);
        const row = target ? chars.find((x) => String(x.character_name) === target.sheet) : null;
        const finding = target ? { ...f, field: target.field } : f;
        if (!target || !row || !C.validateFinding(row, finding).ok || f.category !== "secret_leak") { dropped++; continue; }
        found.push({ item_name: target.sheet, field: target.field, category: "secret_leak", severity: f.severity, exact_quote: f.exact_quote,
          explanation: `Owner ${c.owner}: ${(f.explanation ?? "").slice(0, 440)}`, suggested_replacement: f.suggested_replacement ?? "" });
      }
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  let stored = 0;
  if (opts.write && found.length > 0) {
    const version = C.PROMPT_VERSION + "+leak";
    const { data: rv } = await supabase.from("package_reviews").insert({ package_id: packageId, prompt_version: version, model: MODEL, mystery_style: String((pkg as Row).mystery_style ?? ""), status: "done", finished_at: new Date().toISOString(), items_reviewed: calls, findings_count: found.length, cost_usd: Number(cost.toFixed(4)) }).select("id").single();
    if (rv) { const { error } = await supabase.from("package_review_findings").insert(found.map((f) => ({ review_id: (rv as { id: string }).id, package_id: packageId, ...f }))); if (!error) stored = found.length; }
  }
  if (cost > 0) await logSpend(packageId, `leak_probe:${found.length}_findings`, "escalated", cost);
  return { package_id: packageId, ...estimate, calls, cost_usd: Number(cost.toFixed(4)), findings: found.length, dropped, stored, preview: opts.write ? undefined : found.map((f) => ({ item: f.item_name, field: f.field, severity: f.severity, quote: String(f.exact_quote).slice(0, 140), why: f.explanation })) };
}

async function setting(key: string, fallback: string): Promise<string> {
  const { data } = await supabase.from("pipeline_settings").select("value").eq("key", key).maybeSingle();
  return (data as { value?: string } | null)?.value ?? fallback;
}

// ADR-0138 / ADR-0143: auto-apply is limited to languages whose reviewer precision has been measured. The list is a runtime setting
// (pipeline_settings.review_auto_apply_languages, comma separated, default "en,es"), so enabling a language after calibration is one
// UPDATE and needs no deploy. Detection is a stopword test (C.detectLanguage); unclear text is never allowed.
async function languageAllowedForAutoApply(chars: Row[]): Promise<{ ok: boolean; lang: string | null }> {
  const allowed = (await setting("review_auto_apply_languages", "en,es")).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const lang = C.detectLanguage(C.languageSample(chars));
  return { ok: lang !== null && allowed.includes(lang), lang };
}

/** Apply every still-open finding of the allowed classes for a package (used after a review that did not apply inline). */
async function applyOpenFindings(packageId: string, classes: string[]): Promise<{ applied: number; reverted: number; skipped?: string }> {
  if (classes.length === 0) return { applied: 0, reverted: 0 };
  const { data: pkg } = await supabase.from("mystery_packages").select("*").eq("id", packageId).single();
  const { data: chars } = await supabase.from("mystery_characters").select("*").eq("package_id", packageId);
  const langGate = await languageAllowedForAutoApply((chars ?? []) as Row[]);
  if (!langGate.ok) return { applied: 0, reverted: 0, skipped: `language ${langGate.lang ?? "unclear"} not enabled for auto-apply` };
  const { data: open } = await supabase.from("package_review_findings")
    .select("id,item_name,field,category,exact_quote,suggested_replacement").eq("package_id", packageId).eq("status", "open").in("category", classes);
  if (!pkg || !open || open.length === 0) return { applied: 0, reverted: 0 };
  return autoApply(packageId, pkg as Row, (chars ?? []) as Row[], open as never, classes);
}

/**
 * ADR-0138: review-and-release queue for packages held in status 'reviewing'. Never holds a customer on a reviewer problem:
 * a failed, stuck, errored or cost-capped review releases the package anyway and sends one alert.
 */
async function releaseQueue(): Promise<Row[]> {
  const started = Date.now();
  const maxMin = Number(await setting("review_max_minutes", "15")) || 15;
  const classes = (await setting("review_auto_apply_classes", "")).split(",").map((c) => c.trim()).filter(Boolean);
  const { data: held } = await supabase.from("mystery_packages").select("id,title,quality_review_started_at,updated_at")
    .eq("generation_status->>status", "reviewing").order("quality_review_started_at", { ascending: true }).limit(3);
  const out: Row[] = [];
  for (const p of (held ?? []) as { id: string; title: string | null; quality_review_started_at: string | null; updated_at: string }[]) {
    if (Date.now() - started > 200_000) break; // leave time for the next tick instead of running into the platform limit
    const ageMin = (Date.now() - new Date(p.quality_review_started_at ?? p.updated_at).getTime()) / 60000;
    let releaseReason = "reviewed";
    let alertWhy = "";
    let applied = { applied: 0, reverted: 0 };
    try {
      await runFreeHeals(p.id); // ADR-0152: free, before the model reads the text, so the review sees the healed sheets
      const { data: existing } = await supabase.from("package_reviews").select("id,status,started_at").eq("package_id", p.id).eq("prompt_version", C.PROMPT_VERSION).maybeSingle();
      const e = existing as { id: string; status: string; started_at: string } | null;
      if (e?.status === "running" && Date.now() - new Date(e.started_at).getTime() < 10 * 60 * 1000 && ageMin < maxMin) { out.push({ package_id: p.id, waiting: "review running" }); continue; }
      if (e?.status === "running") { await supabase.from("package_reviews").update({ status: "failed", finished_at: new Date().toISOString(), error: "stuck while releasing" }).eq("id", e.id); alertWhy = "review stuck while releasing"; }
      if (!e) {
        if (ageMin >= maxMin) { alertWhy = `review not started within ${maxMin} minutes`; }
        else if ((await spentToday()) >= DAILY_CAP_USD) { alertWhy = "daily cost cap reached, released without review"; }
        else {
          const r = await reviewPackage(p.id, { applyClasses: [] });
          if (r.skipped) { out.push({ package_id: p.id, waiting: "review started elsewhere" }); continue; }
          if (r.status !== "done") releaseReason = `review ${String(r.status)}`; // reviewPackage already sent its own alert
        }
      }
      applied = await applyOpenFindings(p.id, classes);
    } catch (err) {
      alertWhy = `review error: ${(err as Error).message}`.slice(0, 300);
    }
    if (alertWhy) releaseReason = alertWhy.slice(0, 60);
    const { data: state } = await supabase.rpc("release_package_after_review", { _package_id: p.id, _reason: releaseReason });
    if (alertWhy) await sendAlert(`Package released without a full quality review: ${p.title ?? p.id}`, `${alertWhy}. The package was released to the customer anyway (status now ${String(state)}). Package ${p.id}.`);
    out.push({ package_id: p.id, title: p.title, released: state, reason: releaseReason, applied: applied.applied, reverted: applied.reverted });
  }
  return out;
}

serve(async (req) => {
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = ["conform_labels", "reconcile_roster", "localize_scaffold", "heal_scan", "leak_probe", "roster_patch_scan", "fact_probe"].includes(body.mode) ? String(body.mode) : body.mode === "one" ? "one" : body.mode === "release_queue" ? "release_queue" : body.mode === "propagate_probe" ? "propagate_probe" : body.mode === "open_digest" ? "open_digest" : body.mode === "second_pass" ? "second_pass" : body.mode === "apply_open" ? "apply_open" : body.mode === "requirements_probe" ? "requirements_probe" : "sweep";
    const out: Row[] = [];
    if (mode === "conform_labels" || mode === "reconcile_roster" || mode === "localize_scaffold") {
      // ADR-0152: manual run for one package (delivered packages are only changed through here). dry_run:true computes and writes nothing; force:true writes even when the setting is "report".
      if (!body.package_id) return new Response(JSON.stringify({ error: "package_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      const f = mode === "conform_labels" ? healLabels : mode === "localize_scaffold" ? healScaffold : healRoster;
      return new Response(JSON.stringify(await f(String(body.package_id), { dryRun: body.dry_run !== false && body.force !== true, force: body.force === true, ...(mode === "localize_scaffold" && typeof body.language === "string" ? { language: body.language } : {}) } as never)), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "heal_scan") {
      // Read-only corpus check of both heals over completed packages created since `since` (default 2026-08-01): returns only packages that would change.
      const since = String(body.since ?? "2026-08-01");
      const limit = Math.min(Number(body.limit) || 40, 100), offset = Number(body.offset) || 0;
      const { data: ids } = await supabase.from("mystery_packages").select("id,title,created_at").gte("created_at", since).eq("generation_status->>status", "completed").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      const hits: Row[] = []; let scanned = 0;
      for (const p of (ids ?? []) as { id: string; title: string | null }[]) {
        scanned++;
        const l = await healLabels(p.id, { dryRun: true, force: true }).catch((e) => ({ error: (e as Error).message }));
        const r = await healRoster(p.id, { dryRun: true, force: true }).catch((e) => ({ error: (e as Error).message }));
        const sc = await healScaffold(p.id, { dryRun: true, force: true }).catch((e) => ({ error: (e as Error).message }));
        const changes = Number((l as Row).edits ?? 0) > 0 || ((r as Row).renames as unknown[] | undefined)?.length || (r as Row).unresolved || (l as Row).error || (r as Row).error || Number((sc as Row).edits ?? 0) > 0 || (sc as Row).error;
        if (changes) hits.push({ package_id: p.id, title: p.title, labels: l, roster: r, scaffold: sc });
      }
      return new Response(JSON.stringify({ since, scanned, offset, hits }), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "roster_patch_scan") {
      // Read-only: which approved concepts would get a later-rename patch (ADR-0152). Used to prove the rule has no false positives.
      const limit = Math.min(Number(body.limit) || 60, 150), offset = Number(body.offset) || 0;
      const { data: convs } = await supabase.from("conversations").select("id,title,approved_concept_message_id").not("approved_concept_message_id", "is", null).eq("is_paid", true).order("purchase_date", { ascending: false }).range(offset, offset + limit - 1);
      const hits: Row[] = []; let scanned = 0;
      for (const cv of (convs ?? []) as { id: string; title: string | null; approved_concept_message_id: string }[]) {
        const { data: ms } = await supabase.from("messages").select("id,role,content,created_at").eq("conversation_id", cv.id).order("created_at", { ascending: true });
        const messages = mergeRosterContinuations((ms ?? []) as never[]);
        const snap = messages.find((m: { id: string }) => m.id === cv.approved_concept_message_id);
        if (!snap) continue;
        scanned++;
        const roster = extractRosterFromMessage(String((snap as { content?: string }).content ?? ""));
        const r = applyLaterRenames(roster, messages, cv.approved_concept_message_id);
        if (r.renames.length > 0) hits.push({ conversation_id: cv.id, title: cv.title, renames: r.renames });
      }
      return new Response(JSON.stringify({ scanned, offset, hits }), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "fact_probe") {
      // Paid only with paid:true. overrides replay a package from before a hand fix (in memory, never written).
      if (!body.package_id) return new Response(JSON.stringify({ error: "package_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(await factProbe(String(body.package_id), { dryRun: body.paid !== true, write: body.write === true, overrides: body.overrides && typeof body.overrides === "object" ? body.overrides : undefined })), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "leak_probe") {
      // Paid only when paid:true is sent; otherwise it only retrieves candidates and estimates tokens. write:true stores the findings.
      if (!body.package_id) return new Response(JSON.stringify({ error: "package_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(await leakProbe(String(body.package_id), { dryRun: body.paid !== true, write: body.write === true })), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "propagate_probe") {
      // Read-only check of the propagation pass against a stored package with hand-supplied corrections. Writes nothing.
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY"); if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
      const { data: pkg } = await supabase.from("mystery_packages").select("*").eq("id", String(body.package_id)).single();
      const { data: cd } = await supabase.from("mystery_characters").select("*").eq("package_id", String(body.package_id)).order("character_name");
      const chars = (cd ?? []) as Row[]; const style: C.Style = (pkg as Row).mystery_style === "detective" ? "detective" : "character";
      const items = [...chars.map((c) => ({ name: String(c.character_name), row: c })), { name: C.DOC_ITEM_NAME, row: pkg as Row }];
      const pr = await propagate(apiKey, C.buildSystemBlocks(pkg as Row, chars, style), items, [], chars, (body.corrections ?? []) as C.Correction[]);
      return new Response(JSON.stringify({ probe: true, ...pr, cost: Number(pr.cost.toFixed(4)) }), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "second_pass") {
      return new Response(JSON.stringify(await secondPass(body.package_id ? String(body.package_id) : undefined, body.force === true)), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "apply_open") {
      if (!body.package_id) return new Response(JSON.stringify({ error: "package_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      const classes = (await setting("review_auto_apply_classes", "")).split(",").map((c) => c.trim()).filter(Boolean);
      return new Response(JSON.stringify(await applyOpenFindings(String(body.package_id), classes)), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "requirements_probe") {
      return new Response(JSON.stringify(await reviewPackage(String(body.package_id), { requirementsOnly: true, forceExtract: body.force_extract === true, remove: Array.isArray(body.remove) ? body.remove.map(String) : [] })), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "open_digest") {
      return new Response(JSON.stringify(await openDigest(body.dry_run === true)), { headers: { "Content-Type": "application/json" } });
    }
    if (mode === "release_queue") {
      out.push(...await releaseQueue());
    } else if (mode === "one") {
      if (!body.package_id) return new Response(JSON.stringify({ error: "package_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      out.push(await reviewPackage(String(body.package_id), { force: body.force === true, dryRun: body.dry_run === true }));
    } else {
      // A run that died mid-way (timeout, crash) stays "running" forever: mark it failed and tell Jonathan.
      const staleCut = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: stale } = await supabase.from("package_reviews").update({ status: "failed", finished_at: new Date().toISOString(), error: "stuck in running for over 15 minutes" })
        .eq("status", "running").lt("started_at", staleCut).select("package_id");
      for (const r of (stale ?? []) as { package_id: string }[]) await sendAlert("Reviewer needs attention: a review got stuck", `Package ${r.package_id} was still "running" after 15 minutes and was marked failed. Re-run it with {"mode":"one","package_id":"${r.package_id}","force":true}.`);
      if ((await spentToday()) >= DAILY_CAP_USD) {
        // Once per UTC day, not on every 5-minute tick: a marker row in auto_remediation_log (any package id works; it needs a real one).
        const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
        const { data: sent } = await supabase.from("auto_remediation_log").select("id").eq("defect_class", "llm_review").eq("action", "alert:daily_cap").gte("created_at", dayStart.toISOString()).limit(1);
        if (!sent || sent.length === 0) {
          await sendAlert("Reviewer needs attention: daily cost cap reached", `Today's automatic spend reached the $${DAILY_CAP_USD} cap, so reviews are paused until tomorrow (UTC).`);
          const { data: anyPkg } = await supabase.from("mystery_packages").select("id").limit(1);
          if (anyPkg?.[0]?.id) await logSpend(String(anyPkg[0].id), "alert:daily_cap", "escalated", 0);
        }
        return new Response(JSON.stringify({ skipped: "daily cost cap" }), { headers: { "Content-Type": "application/json" } });
      }
      const max = Math.min(Number(body.max_packages) || 1, 3);
      const { data, error } = await supabase.rpc("list_packages_needing_review", { _version: C.PROMPT_VERSION, _limit: max });
      if (error) throw new Error(`selector failed: ${error.message}`);
      for (const p of (data ?? []) as { package_id: string }[]) out.push(await reviewPackage(p.package_id, { dryRun: body.dry_run === true }));
    }
    console.log(`review-package-quality: ${JSON.stringify(out.map((o) => ({ t: o.title, f: o.findings, c: o.cost_usd, s: o.status })))}`);
    return new Response(JSON.stringify({ model: MODEL, effort: EFFORT, prompt_version: C.PROMPT_VERSION, auto_apply_classes: AUTO_APPLY_CLASSES, results: out }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("review-package-quality fatal:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
