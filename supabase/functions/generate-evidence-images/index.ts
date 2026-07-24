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

// Retry tuning for Replicate 429s. When the account has < $5 credit, Replicate
// throttles prediction creation to 6/min with a burst of 1, so 2 of our 3
// parallel rounds get rejected on every run (see the evidence-image recovery
// saga). We honor Replicate's retry_after and add jitter so the retrying rounds
// don't collide on the burst-of-1 window again. This is a safety net — the real
// fix is keeping the token's account funded above $5.
const MAX_PREDICTION_ATTEMPTS = 5;
const DEFAULT_RETRY_AFTER_SECONDS = 10;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * POST a prediction to Replicate, retrying on 429 (rate limit). Returns the
 * final Response; non-429 responses (success or other errors) are returned
 * immediately for the caller to handle.
 */
async function createPredictionWithRetry(
  body: unknown,
  token: string
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_PREDICTION_ATTEMPTS; attempt++) {
    const res = await fetch(REPLICATE_MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify(body),
    });

    if (res.status !== 429 || attempt === MAX_PREDICTION_ATTEMPTS) {
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
      `Replicate 429 (attempt ${attempt}/${MAX_PREDICTION_ATTEMPTS}); waiting ${waitMs}ms before retry`
    );
    await sleep(waitMs);
  }

  // Unreachable: the loop returns on the final attempt.
  throw new Error("createPredictionWithRetry exhausted attempts without returning");
}

/**
 * Generate one image via Replicate Flux 1.1 Pro and return the raw PNG bytes.
 *
 * Mirrors scripts/pinterest/lib/compose.mjs `callFlux11Pro` (Node). Kept as a
 * deliberate ~30-line duplicate rather than a shared module because that file is
 * Node (process.env/Buffer) and this is Deno (Deno.env/ArrayBuffer) — see ADR-0017.
 * `Prefer: wait=60` keeps the request synchronous; flux-1.1-pro usually finishes
 * in 5-15s, so we get a final prediction back without polling. Prediction
 * creation is retried on 429 via createPredictionWithRetry.
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

  const json = await res.json();
  if (json.status === "failed") {
    throw new Error(`Flux prediction failed: ${json.error || "unknown error"}`);
  }
  if (json.status !== "succeeded" || !json.output) {
    throw new Error(
      `Flux returned non-succeeded status (${json.status}); output: ${JSON.stringify(json.output).slice(0, 200)}`
    );
  }

  // flux-1.1-pro output is a single URL string; some Replicate models return an array.
  const outputUrl = Array.isArray(json.output) ? json.output[0] : json.output;
  if (typeof outputUrl !== "string") {
    throw new Error(`Unexpected Flux output shape: ${JSON.stringify(json.output).slice(0, 200)}`);
  }

  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch generated image from ${outputUrl}: ${imgRes.status} ${imgRes.statusText}`);
  }
  return await imgRes.arrayBuffer();
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
