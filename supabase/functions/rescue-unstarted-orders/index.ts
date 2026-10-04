import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ADR-0139: start generation for paid orders that nobody started.
 *
 * Generation is normally started by the customer's browser clicking "Generate my mystery" after payment. A customer who pays and
 * leaves never starts it. Every 2 minutes (pg_cron) this asks list_paid_unstarted_orders() for paid orders older than 3 minutes with no
 * package and no generation attempt, and starts each one through mystery-webhook-trigger (service-role call, same path as a manual
 * re-fire). One alert email per rescued order so the customer-facing follow-up is not forgotten.
 *
 * Safe against a late click: the detector requires NO generation_attempts row, and the trigger writes one the instant it starts.
 * A concept that is not finished (needs_more_info) is NOT retried forever: the trigger logs no attempt for it, so we record one here.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const MAX_PER_RUN = 3;

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

async function sendAlert(subject: string, body: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Mystery Maker Alerts <noreply@mysterymaker.party>",
      to: ["support@mysterymaker.party"],
      subject,
      html: `<div style="font-family:sans-serif;max-width:700px"><h3>${esc(subject)}</h3><p>${esc(body)}</p></div>`,
    }),
  });
  if (!resp.ok) console.error(`alert email failed: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
}

serve(async () => {
  try {
    const { data, error } = await supabase.rpc("list_paid_unstarted_orders", { min_age_minutes: 3, max_age_hours: 72 });
    if (error) throw new Error(`detector failed: ${error.message}`);
    const orders = (data ?? []) as { conversation_id: string; title: string | null; age_minutes: number; player_count: number | null }[];
    const out: Record<string, unknown>[] = [];

    for (const o of orders.slice(0, MAX_PER_RUN)) {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/mystery-webhook-trigger`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: o.conversation_id, testMode: false }),
      });
      const text = (await resp.text()).slice(0, 300);
      const started = resp.ok && !/needs_more_info/.test(text);
      if (!started) {
        // Never retry a failed rescue every 2 minutes: record an attempt so the detector stops listing it, and tell a human.
        await supabase.from("generation_attempts").insert({
          conversation_id: o.conversation_id, is_service_call: true, outcome: resp.ok ? "rescue_needs_more_info" : "rescue_failed",
        });
      }
      await sendAlert(
        started
          ? `Paid order was never started, generation rescued: ${o.title ?? o.conversation_id}`
          : `Paid order was never started and the rescue could NOT start it: ${o.title ?? o.conversation_id}`,
        `Conversation ${o.conversation_id} was paid ${o.age_minutes} minutes ago (${o.player_count ?? "?"} players) and the customer never started generation. ` +
          (started
            ? "Generation was started automatically. Consider a short note to the customer; the normal new-purchase sweep applies."
            : `The trigger answered ${resp.status}: ${text}. Start it by hand and contact the customer.`),
      );
      out.push({ conversation_id: o.conversation_id, started, status: resp.status });
    }
    return new Response(JSON.stringify({ found: orders.length, handled: out }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("rescue-unstarted-orders failed:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
