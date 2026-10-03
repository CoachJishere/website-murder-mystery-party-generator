import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as C from "./review-core.ts";

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

async function callModel(apiKey: string, system: C.SystemBlock[], userText: string): Promise<{ text: string; usage: C.Usage; stop: string }> {
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
          max_tokens: 12000,
          system,
          // Sonnet 5.5: thinking is on by default and cannot be sent as "disabled"; depth is controlled with effort.
          output_config: { effort: EFFORT, format: { type: "json_schema", schema: C.FINDINGS_SCHEMA } },
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
      html: `<div style="font-family:sans-serif;max-width:700px"><h3>${C.escapeHtml(subject)}</h3><p>${C.escapeHtml(body)}</p><p style="color:#6b7280">The package itself is unaffected: the reviewer is report-only and runs after delivery.</p></div>` }),
  });
  if (!resp.ok) console.error(`alert email failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
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
async function autoApply(packageId: string, pkg: Row, chars: Row[], findingRows: { id: string; item_name: string; field: string; category: string; exact_quote: string; suggested_replacement: string }[]) {
  let applied = 0, reverted = 0;
  for (const f of findingRows) {
    if (!AUTO_APPLY_CLASSES.includes(f.category)) continue;
    const raw: C.RawFinding = { field: f.field, exact_quote: f.exact_quote, category: f.category, severity: "medium", explanation: "", suggested_replacement: f.suggested_replacement };
    if (!C.replacementIsSane(raw)) continue;
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
    }
  }
  return { applied, reverted };
}

async function reviewPackage(packageId: string, opts: { force?: boolean; dryRun?: boolean }): Promise<Row> {
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
  if (opts.dryRun) return { package_id: packageId, style, items: items.length, system_chars: system.reduce((n, b) => n + b.text.length, 0), dry_run: true };

  if (opts.force) await supabase.from("package_reviews").delete().eq("package_id", packageId).eq("prompt_version", C.PROMPT_VERSION);
  const { data: review, error: re } = await supabase.from("package_reviews")
    .insert({ package_id: packageId, prompt_version: C.PROMPT_VERSION, model: MODEL, mystery_style: style }).select("id").single();
  if (re || !review) return { package_id: packageId, skipped: "already reviewed for this prompt version", detail: re?.message };

  const started = Date.now();
  let spent = 0;
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
  await logSpend(packageId, `review:${inserted.length}_findings:${status}`, status === "failed" ? "failed" : "escalated", spent);

  let apply = { applied: 0, reverted: 0 };
  if (AUTO_APPLY_CLASSES.length > 0 && inserted.length > 0) apply = await autoApply(packageId, pkg as Row, chars, inserted);
  await sendDigest(String((pkg as Row).title ?? ""), packageId, style, inserted, spent);
  if (DIGEST_MODE === "off" && ALERT_HIGH && inserted.some((f) => f.severity === "high")) {
    const mail = C.digestEmail(String((pkg as Row).title ?? ""), packageId, style, MODEL, spent, inserted, "summary");
    const key = Deno.env.get("RESEND_API_KEY");
    if (mail && key) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "Mystery Maker Alerts <noreply@mysterymaker.party>", to: ["support@mysterymaker.party"], subject: mail.subject, html: mail.html }) });
  }
  if (status === "failed" || partialWhy || errors.length > 0) {
    await sendAlert(`Reviewer needs attention: ${String((pkg as Row).title ?? packageId)} (${status})`, `Review status ${status}; reviewed ${results.length} of ${items.length} items; ${[partialWhy, ...errors.slice(0, 3)].filter(Boolean).join(" | ") || "no detail"}. Package ${packageId}.`);
  }

  return { package_id: packageId, title: (pkg as Row).title, style, status, items: items.length, reviewed: results.length, findings: inserted.length,
    high: inserted.filter((f) => f.severity === "high").length, discarded, cost_usd: Number(spent.toFixed(4)), partial_reason: partialWhy || undefined, errors: errors.slice(0, 5), auto_apply: apply };
}

serve(async (req) => {
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = body.mode === "one" ? "one" : "sweep";
    const out: Row[] = [];
    if (mode === "one") {
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
