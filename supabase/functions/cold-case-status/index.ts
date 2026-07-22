// cold-case-status — public status + delivery endpoint for Cold Case Files (ADR-0029).
//
// GET ?token=<delivery_token>
//   paid|generating -> { status, position }        (the "still crafting" page)
//   ready           -> { status, title, download_url }  (10-min signed URL, re-mintable)
//   failed          -> { status }                  (page shows support copy)
//
// Guests only — no login. Auth IS the unguessable 48-hex delivery token (deny-all RLS;
// this function uses the service role). verify_jwt is disabled for that reason.
// Basic per-IP rate limit: the endpoint is public and pollable.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// Per-isolate best-effort rate limit (resets on cold start — good enough to blunt hammering)
const RL_WINDOW_MS = 5 * 60 * 1000;
const RL_MAX = 60;
const hits = new Map<string, { n: number; t: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > RL_WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > RL_MAX;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const sid = url.searchParams.get("session") || "";

  // Post-payment landing: the success_url carries the Stripe session id before the buyer
  // has their token (the webhook may still be writing the order). Resolve it here.
  if (sid) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json({ error: "not_found" }, 404);
    const { data: bySid } = await supabase
      .from("cold_case_orders")
      .select("delivery_token")
      .eq("stripe_session_id", sid)
      .single();
    // pending = webhook hasn't landed yet; the page shows "confirming your order" and re-polls
    if (!bySid) return json({ status: "pending" });
    return json({ status: "resolved", token: bySid.delivery_token });
  }

  if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "not_found" }, 404);

  const { data: order, error } = await supabase
    .from("cold_case_orders")
    .select("id, status, slug, storage_path, created_at")
    .eq("delivery_token", token)
    .single();

  if (error || !order) return json({ error: "not_found" }, 404);

  if (order.status === "ready" && order.storage_path) {
    const { data: signed, error: signErr } = await supabase.storage
      .from("cold-case-files")
      .createSignedUrl(order.storage_path, 600, {
        download: `${order.slug}.html`,
      });
    if (signErr || !signed) {
      console.error("[cold-case-status] signed URL failed:", signErr);
      return json({ status: "ready", error: "download_unavailable" }, 500);
    }
    return json({ status: "ready", download_url: signed.signedUrl });
  }

  if (order.status === "paid" || order.status === "generating") {
    // queue position: orders ahead of this one still awaiting completion
    const { count } = await supabase
      .from("cold_case_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["paid", "generating"])
      .lt("created_at", order.created_at);
    return json({ status: order.status, ahead: count ?? 0 });
  }

  return json({ status: order.status }); // failed | refunded
});
