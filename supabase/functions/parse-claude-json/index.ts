import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/**
 * Parse a Claude text response that's *supposed* to be JSON but may contain
 * common malformations:
 *   - leading/trailing ```json or ``` code fences
 *   - JS-style apostrophe escapes inside string values: `That\'s` → invalid JSON
 *   - JS-style escaped backslashes inside strings: `\\\\'` → invalid JSON
 *   - smart quotes (em-dash, curly quotes) — usually fine since UTF-8 string content is allowed
 *   - trailing commas (sometimes)
 *
 * Strategy: try strict JSON.parse first (most outputs are valid). On failure,
 * apply progressively more aggressive cleanups and retry. Return the parsed
 * object or an error explaining what we couldn't recover.
 */
function parseClaudeJson(text: string): { data?: any; error?: string; sanitized?: string } {
  if (!text) return { error: 'Empty input' };

  // Stage 1: strip code fences
  let s = text.trim();
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  s = s.replace(/\s*```\s*$/i, '');
  s = s.trim();

  // Stage 2: try strict JSON.parse — most outputs make it through here
  try {
    return { data: JSON.parse(s), sanitized: s };
  } catch {
    // fall through to repair
  }

  // Stage 3: replace invalid `\'` JS-escape with plain `'`. This is the most
  // common Claude failure mode for prompts that ask for JSON with single-quoted
  // dialogue. The model defensively escapes apostrophes the way JS would, but
  // JSON spec rejects `\'`.
  let s2 = s.replace(/\\'/g, "'");
  try {
    return { data: JSON.parse(s2), sanitized: s2 };
  } catch {
    // fall through
  }

  // Stage 4: also collapse `''` (double single-quote run) to single — sometimes
  // the model adds an extra closing apostrophe when wrapping up a quoted phrase.
  let s3 = s2.replace(/''+/g, "'");
  try {
    return { data: JSON.parse(s3), sanitized: s3 };
  } catch {
    // fall through
  }

  // Stage 5: strip trailing commas before } or ] (lenient JSON5-ish). Some models
  // produce these out of habit.
  let s4 = s3.replace(/,(\s*[}\]])/g, '$1');
  try {
    return { data: JSON.parse(s4), sanitized: s4 };
  } catch (e) {
    // Give up but include best-effort sanitized text and the parse error
    return {
      error: `JSON parse failed after all sanitization stages: ${(e as Error).message}`,
      sanitized: s4,
    };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept either a JSON body { text: "..." } or a plain text body. Make.com's
    // HTTP module is easier to configure with plain text — its expression engine
    // doesn't have a JSON-encode function, so wrapping arbitrary Claude output
    // in JSON inside an expression requires fragile escape handling.
    const contentType = req.headers.get('content-type') || '';
    let text: string;
    if (contentType.includes('application/json')) {
      const body = await req.json();
      text = body.text;
    } else {
      text = await req.text();
    }
    if (typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Body must be plain text or {"text": "..."}' }), {
        status: 400, headers: responseHeaders,
      });
    }

    const result = parseClaudeJson(text);
    if (result.error) {
      return new Response(JSON.stringify({
        error: result.error,
        sanitized_preview: result.sanitized?.slice(0, 500),
      }), { status: 422, headers: responseHeaders });
    }

    // On success we return the parsed object as the top-level body so Make.com's
    // HTTP module exposes each key directly (e.g. {{moduleId.rumors}}).
    return new Response(JSON.stringify(result.data), { headers: responseHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: responseHeaders,
    });
  }
});
