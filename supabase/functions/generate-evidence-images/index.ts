import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * generate-evidence-images
 *
 * Called by Make.com (one call per route) with the three evidence-card image
 * prompts. Generates each image via Replicate Flux 1.1 Pro, uploads it to the
 * `evidence-images` storage bucket, and merges the public URLs into
 * mystery_packages.evidence_card_images.
 *
 * Replaces the previous flow of 3 in-Make Imagen HTTP modules + a
 * store-evidence-images call (per route). See ADR-0017.
 *
 * Each round is generated/uploaded independently (Promise.allSettled), so one
 * round failing (Replicate error, timeout) cannot lose the others — the
 * batch-abort data loss documented in ADR-0016 can no longer happen here.
 *
 * Expects POST body:
 * {
 *   "package_id": "uuid",
 *   "prompts": { "round2": "<prompt>", "round3": "<prompt>", "round4": "<prompt>" }
 * }
 *
 * Returns:
 * {
 *   "success": true,
 *   "evidence_card_images": { "round2": "https://...", ... },  // newly generated
 *   "generated": ["round2", "round3"],
 *   "failed": [{ "round": "round4", "error": "..." }]
 * }
 */

const REPLICATE_MODEL_URL =
  "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";

// Retry + polling tuning for Replicate. TWO distinct failure modes have hit
// production, both dropping a round while the other two succeed:
//   (1) 429 rate-limit — an account under $5 credit is throttled to 6/min with a
//       burst of 1, so parallel rounds get rejected. Fixed by keeping the token's
//       account funded (auto-reload) + the 429 retry below.
//   (2) slow generation — `Prefer: wait=60` returns a still-`processing`
//       prediction when Flux doesn't finish inside the wait window (cold start /
//       queue). The old code threw on any non-succeeded status and the round was
//       lost (v13 retried only 429). We now POLL the prediction to completion,
//       and retry the POST on 5xx / network errors too — not just 429.
//       ("The Cognitive Dissonance Incident", 2026-07-28: round2 dropped on a
//       healthy-credit account after a 27s run — this path.)
const MAX_PREDICTION_ATTEMPTS = 5;
const DEFAULT_RETRY_AFTER_SECONDS = 10;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20; // ~60s of polling after the wait window
const MAX_IMAGE_FETCH_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * POST a prediction to Replicate, retrying TRANSIENT failures — 429 (rate limit),
 * 5xx (server), and network errors. Non-retryable responses (2xx, or 4xx other
 * than 429) are returned for the caller to handle.
 */
async function createPredictionWithRetry(
  body: unknown,
  token: string
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_PREDICTION_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(REPLICATE_MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify(body),
      });
    } catch (netErr) {
      // network/DNS/connection reset — retry with backoff
      if (attempt === MAX_PREDICTION_ATTEMPTS) throw netErr;
      const waitMs = DEFAULT_RETRY_AFTER_SECONDS * 1000 + Math.floor(Math.random() * 2000);
      console.log(
        `Replicate POST network error (attempt ${attempt}/${MAX_PREDICTION_ATTEMPTS}): ${netErr instanceof Error ? netErr.message : netErr}; retrying in ${waitMs}ms`
      );
      await sleep(waitMs);
      continue;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_PREDICTION_ATTEMPTS) {
      return res;
    }

    // Determine how long to wait: prefer the Retry-After header, then the
    // retry_after field in the JSON body, then a sane default.
    let retryAfter = DEFAULT_RETRY_AFTER_SECONDS;
    const headerRetryAfter = Number(res.headers.get("retry-after"));
    if (Number.isFinite(headerRetryAfter) && headerRetryAfter > 0) {
      retryAfter = headerRetryAfter;
    } else {
      try {
        const j = await res.clone().json();
        if (typeof j?.retry_after === "number" && j.retry_after > 0) {
          retryAfter = j.retry_after;
        }
      } catch {
        // body wasn't JSON — keep the default
      }
    }

    const waitMs = retryAfter * 1000 + Math.floor(Math.random() * 2000);
    console.log(
      `Replicate ${res.status} (attempt ${attempt}/${MAX_PREDICTION_ATTEMPTS}); waiting ${waitMs}ms before retry`
    );
    await sleep(waitMs);
  }

  // Unreachable: the loop returns on the final attempt.
  throw new Error("createPredictionWithRetry exhausted attempts without returning");
}

/**
 * Poll a prediction's get-URL until it reaches a terminal state. Needed when
 * `Prefer: wait=60` returns before generation finishes (slow render / cold
 * start) — otherwise a still-`processing` prediction would be dropped (failure
 * mode 2 above). Transient GET failures are tolerated (keep polling).
 */
async function pollPredictionUntilDone(getUrl: string, token: string): Promise<any> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    let res: Response;
    try {
      res = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      continue; // transient network blip — keep polling
    }
    if (!res.ok) continue;
    const j = await res.json();
    if (j.status === "succeeded") return j;
    if (j.status === "failed" || j.status === "canceled") {
      throw new Error(`Flux prediction ${j.status}: ${j.error || "unknown error"}`);
    }
    // starting / processing → keep polling
  }
  throw new Error(
    `Flux prediction did not complete within ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s of polling`
  );
}

/**
 * Generate one image via Replicate Flux 1.1 Pro and return the raw PNG bytes.
 *
 * Mirrors scripts/pinterest/lib/compose.mjs `callFlux11Pro` (Node) — see ADR-0017.
 * `Prefer: wait=60` usually returns a finished prediction (flux-1.1-pro is 5-15s).
 * If it comes back still processing, we POLL to completion rather than dropping
 * the round. Transient POST failures (429/5xx/network) are retried, and the
 * final image fetch is retried too.
 */
async function callFlux11Pro(prompt: string, token: string): Promise<ArrayBuffer> {
  const body = {
    input: {
      prompt,
      aspect_ratio: "16:9", // evidence cards are 16:9 (matches the old Imagen config)
      output_format: "png",
      safety_tolerance: 2,
      prompt_upsampling: false,
    },
  };

  const res = await createPredictionWithRetry(body, token);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Replicate API ${res.status}: ${txt.slice(0, 500)}`);
  }

  let json = await res.json();
  if (json.status !== "succeeded") {
    if (json.status === "failed" || json.status === "canceled") {
      throw new Error(`Flux prediction ${json.status}: ${json.error || "unknown error"}`);
    }
    // Still starting/processing after the wait window — poll to completion
    // instead of throwing the round away.
    const getUrl = json?.urls?.get;
    if (typeof getUrl !== "string") {
      throw new Error(`Flux non-succeeded (${json.status}) and no poll URL available`);
    }
    console.log(`Flux still ${json.status} after wait window; polling for completion`);
    json = await pollPredictionUntilDone(getUrl, token);
  }

  if (!json.output) {
    throw new Error(`Flux succeeded but returned no output: ${JSON.stringify(json).slice(0, 200)}`);
  }
  // flux-1.1-pro output is a single URL string; some Replicate models return an array.
  const outputUrl = Array.isArray(json.output) ? json.output[0] : json.output;
  if (typeof outputUrl !== "string") {
    throw new Error(`Unexpected Flux output shape: ${JSON.stringify(json.output).slice(0, 200)}`);
  }

  // Fetch the image bytes, retrying transient fetch failures.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_IMAGE_FETCH_ATTEMPTS; attempt++) {
    try {
      const imgRes = await fetch(outputUrl);
      if (imgRes.ok) return await imgRes.arrayBuffer();
      lastErr = new Error(`${imgRes.status} ${imgRes.statusText}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < MAX_IMAGE_FETCH_ATTEMPTS) await sleep(1500);
  }
  throw new Error(
    `Failed to fetch generated image from ${outputUrl}: ${lastErr instanceof Error ? lastErr.message : lastErr}`
  );
}

serve(async (req) => {
  // CORS not needed — this is called by Make.com, not the browser
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const { package_id, prompts } = await req.json();

    if (!package_id || !prompts || typeof prompts !== "object") {
      return new Response(
        JSON.stringify({ error: "package_id and prompts { round2, round3, round4 } are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    if (!replicateToken) {
      return new Response(
        JSON.stringify({ error: "REPLICATE_API_TOKEN is not set in edge-function secrets" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rounds = ["round2", "round3", "round4"] as const;
    const publicUrls: Record<string, string> = {};
    const failed: Array<{ round: string; error: string }> = [];

    // Generate + upload each round independently. allSettled so one round's
    // failure never aborts the others (the ADR-0016 batch-abort failure mode).
    await Promise.all(
      rounds.map(async (round) => {
        const prompt = prompts[round];
        if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
          console.log(`No prompt for ${round}, skipping`);
          return;
        }

        try {
          const imageBuffer = await callFlux11Pro(prompt, replicateToken);
          const filePath = `${package_id}/${round}.png`;

          const { error: uploadError } = await supabase.storage
            .from("evidence-images")
            .upload(filePath, imageBuffer, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from("evidence-images")
            .getPublicUrl(filePath);

          publicUrls[round] = urlData.publicUrl;
          console.log(`${round}: generated + uploaded to ${filePath}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Error processing ${round}:`, message);
          failed.push({ round, error: message });
        }
      })
    );

    // Merge new URLs with any existing ones (don't overwrite partial updates)
    if (Object.keys(publicUrls).length > 0) {
      const { data: existing } = await supabase
        .from("mystery_packages")
        .select("evidence_card_images")
        .eq("id", package_id)
        .maybeSingle();

      const merged = {
        ...((existing?.evidence_card_images as Record<string, string>) || {}),
        ...publicUrls,
      };

      const { error: updateError } = await supabase
        .from("mystery_packages")
        .update({ evidence_card_images: merged })
        .eq("id", package_id);

      if (updateError) {
        console.error("DB update error:", updateError);
        return new Response(
          JSON.stringify({ error: `DB update failed: ${updateError.message}`, failed }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Surface partial/total failure to the caller instead of silently skipping.
    const status = failed.length > 0 && Object.keys(publicUrls).length === 0 ? 502 : 200;

    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        evidence_card_images: publicUrls,
        generated: Object.keys(publicUrls),
        failed,
      }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
