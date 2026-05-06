import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * store-evidence-images
 *
 * Called by Make.com after evidence card images are generated.
 * Accepts either temporary URLs (legacy: Replicate Flux flow) or base64 bytes
 * (current: Imagen 4 via Gemini API), uploads them to Supabase Storage, and
 * updates the mystery_packages record.
 *
 * Expects POST body (one of):
 * {
 *   "package_id": "uuid",
 *   "image_urls": { "round2": "https://...", "round3": "...", "round4": "..." }
 * }
 * — or —
 * {
 *   "package_id": "uuid",
 *   "image_base64": { "round2": "<b64>", "round3": "<b64>", "round4": "<b64>" },
 *   "mime_type": "image/png"   // optional, defaults to image/png (Imagen's default output)
 * }
 */

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

serve(async (req) => {
  // CORS not needed — this is called by Make.com, not the browser
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const { package_id, image_urls, image_base64, mime_type } = await req.json();

    if (!package_id || (!image_urls && !image_base64)) {
      return new Response(
        JSON.stringify({ error: "package_id and either image_urls or image_base64 are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const rounds = ["round2", "round3", "round4"] as const;
    const publicUrls: Record<string, string> = {};

    const contentType = mime_type || "image/png";
    const ext = EXT_BY_MIME[contentType] ?? "bin";

    // Download/decode and upload each image in parallel
    const uploadPromises = rounds.map(async (round) => {
      const b64 = image_base64?.[round];
      const url = image_urls?.[round];
      if (!b64 && !url) {
        console.log(`No image source for ${round}, skipping`);
        return;
      }

      try {
        let imageBuffer: ArrayBuffer;
        let uploadContentType: string;
        let uploadExt: string;

        if (b64) {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          imageBuffer = bytes.buffer;
          uploadContentType = contentType;
          uploadExt = ext;
        } else {
          const imageResponse = await fetch(url);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download ${round}: ${imageResponse.status}`);
          }
          imageBuffer = await imageResponse.arrayBuffer();
          uploadContentType = "image/webp";
          uploadExt = "webp";
        }

        const filePath = `${package_id}/${round}.${uploadExt}`;

        // Upload to Supabase Storage (upsert to overwrite if regenerated)
        const { error: uploadError } = await supabase.storage
          .from("evidence-images")
          .upload(filePath, imageBuffer, {
            contentType: uploadContentType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed for ${round}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("evidence-images")
          .getPublicUrl(filePath);

        publicUrls[round] = urlData.publicUrl;
        console.log(`${round}: uploaded to ${filePath}`);
      } catch (err) {
        console.error(`Error processing ${round}:`, err);
        // Continue with other rounds even if one fails
      }
    });

    await Promise.all(uploadPromises);

    // Merge new URLs with any existing ones (don't overwrite partial updates)
    if (Object.keys(publicUrls).length > 0) {
      const { data: existing } = await supabase
        .from("mystery_packages")
        .select("evidence_card_images")
        .eq("id", package_id)
        .maybeSingle();

      const merged = { ...(existing?.evidence_card_images as Record<string, string> || {}), ...publicUrls };

      const { error: updateError } = await supabase
        .from("mystery_packages")
        .update({ evidence_card_images: merged })
        .eq("id", package_id);

      if (updateError) {
        console.error("DB update error:", updateError);
        return new Response(
          JSON.stringify({ error: `DB update failed: ${updateError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        evidence_card_images: publicUrls,
        uploaded: Object.keys(publicUrls).length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
