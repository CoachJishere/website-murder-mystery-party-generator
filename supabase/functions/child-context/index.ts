import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleChildContext, type Deps } from "./handler.ts";

/**
 * child-context (ADR-0156 Phase 3): hands the detective Child its per-character redacted design and chat. No LLM, 0 USD.
 * Auth: verify_jwt stays true (the gateway), and the real gate is the x-child-context-key header against the CHILD_CONTEXT_KEY secret,
 * because the anon key that every other Make call uses is public. Kill switch: pipeline_settings.child_context_redaction
 * ('on' | 'off' | 'test_only', default off). Contract and failure policy: handler.ts and docs/adr/0156-phase3/design.md.
 */
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
const DEFECT_CLASS = "child_context";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const deps: Deps = {
  expectedKey: Deno.env.get("CHILD_CONTEXT_KEY") || undefined,
  async loadPackage(id) {
    const { data, error } = await supabase.from("mystery_packages").select("master_context, mystery_style, conversation_id").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  async loadIsTest(conversationId) {
    if (!conversationId) return false;
    const { data } = await supabase.from("conversations").select("is_test").eq("id", conversationId).maybeSingle();
    return (data as { is_test?: boolean } | null)?.is_test === true;
  },
  async loadMode() {
    const { data } = await supabase.from("pipeline_settings").select("value").eq("key", "child_context_redaction").maybeSingle();
    return (data as { value?: string } | null)?.value ?? null;
  },
  async logFallback(packageId, action) {
    const { error } = await supabase.from("auto_remediation_log").insert({ package_id: packageId, defect_class: DEFECT_CLASS, action, before_value: null, outcome: "escalated", cost_usd: 0 });
    if (error) console.error(`auto_remediation_log insert failed: ${error.message}`);
  },
  async alert(packageId, reason, detail) {
    // One email per package and reason: the first fallback inserts an `alert:<reason>` marker row, later characters of the same package see it.
    const marker = `alert:${reason}`;
    const { data: seen } = await supabase.from("auto_remediation_log").select("id").eq("package_id", packageId).eq("defect_class", DEFECT_CLASS).eq("action", marker).limit(1);
    if ((seen ?? []).length > 0) return;
    await supabase.from("auto_remediation_log").insert({ package_id: packageId, defect_class: DEFECT_CLASS, action: marker, before_value: null, outcome: "escalated", cost_usd: 0 });
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return;
    const subject = `Child kept the full design: ${reason}`;
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Mystery Maker Alerts <noreply@mysterymaker.party>", to: ["support@mysterymaker.party"], subject,
        html: `<div style="font-family:sans-serif;max-width:700px"><h3>${esc(subject)}</h3><p>Package ${esc(packageId)}. ${esc(detail)}</p><p style="color:#6b7280">The character was generated from today's full inputs (nothing is blank). Per-character rows are in auto_remediation_log, defect_class child_context. ADR-0156 Phase 3.</p></div>`,
      }),
    });
    if (!resp.ok) console.error(`alert email failed: ${resp.status}`);
  },
  log: (line) => console.log(line),
};

serve((req) => handleChildContext(req, deps));
