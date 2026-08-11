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
 * Escape raw control-character bytes (literal newline/tab/CR) that appear
 * inside a JSON string literal, leaving everything outside strings (including
 * legitimate structural whitespace in pretty-printed JSON) untouched. Tracks
 * string-open/close state character by character, respecting `\"` escapes so
 * an escaped quote doesn't get mistaken for a string boundary.
 */
function escapeControlCharsInStrings(s: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

/**
 * Parse a Claude text response that's *supposed* to be JSON but may contain
 * common malformations:
 *   - leading/trailing ```json or ``` code fences
 *   - raw control characters (literal newline/tab/CR bytes) left unescaped
 *     inside a string value instead of the two-character \n/\t/\r sequence
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

  // Stage 3: escape raw control-character bytes that should have been
  // JSON-escaped as \n/\t/\r. Claude (Sonnet 5, seen 2026-08-11) occasionally
  // emits a real line break mid-paragraph inside a string value instead of
  // the two-character escape sequence — JSON.parse rejects any unescaped
  // control character (U+0000-U+001F) inside a string literal ("Bad control
  // character in string literal"). Must be scoped to inside strings only —
  // a naive global replace also mangles legitimate structural newlines in
  // pretty-printed JSON (real newlines between top-level fields), breaking
  // otherwise-valid input. Already-correct `\n` two-character sequences are
  // untouched either way since they're two ordinary characters, not a
  // control byte.
  let s1b = escapeControlCharsInStrings(s);
  try {
    return { data: JSON.parse(s1b), sanitized: s1b };
  } catch {
    // fall through
  }

  // Stage 4: replace invalid `\'` JS-escape with plain `'`. This is the most
  // common Claude failure mode for prompts that ask for JSON with single-quoted
  // dialogue. The model defensively escapes apostrophes the way JS would, but
  // JSON spec rejects `\'`.
  let s2 = s1b.replace(/\\'/g, "'");
  try {
    return { data: JSON.parse(s2), sanitized: s2 };
  } catch {
    // fall through
  }

  // Stage 5: also collapse `''` (double single-quote run) to single — sometimes
  // the model adds an extra closing apostrophe when wrapping up a quoted phrase.
  let s3 = s2.replace(/''+/g, "'");
  try {
    return { data: JSON.parse(s3), sanitized: s3 };
  } catch {
    // fall through
  }

  // Stage 6: strip trailing commas before } or ] (lenient JSON5-ish). Some models
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

    // Defense-in-depth: if the parsed object looks like image-prompt output
    // (top-level `round2` / `round3` / `round4` string fields), make those
    // values safe to embed directly in a JSON body via Make.com's plain
    // `{{...round2}}` substitution. The evidence-image generation now calls the
    // `generate-evidence-images` edge function with a raw JSON body that uses
    // plain substitution (ADR-0017) — the old Imagen HTTP modules' IML escape
    // chain (which neutralized `"`, `\`, and newlines) is gone. So we strip the
    // JSON-breaking characters here at the single server-side source instead:
    //   - `"`  → `'`   (double quotes terminate the JSON string)
    //   - `\`  → removed (stray backslash = invalid escape)
    //   - C0 control chars (newlines, tabs, CR, …) → single space
    // The parent prompt already instructs Claude to avoid double quotes and
    // newlines; this makes a slip survivable. Verified safe against child
    // scenarios — none produce top-level round2/3/4 keys (they use
    // `description`, `background`, `relationships`, `round2_innocent`, etc.).
    const data = result.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const key of ['round2', 'round3', 'round4']) {
        if (typeof data[key] === 'string') {
          data[key] = data[key]
            .replace(/"/g, "'")
            .replace(/\\/g, '')
            .replace(/[\u0000-\u001f]+/g, ' ')
            .trim();
        }
      }
    }

    // On success we return the parsed object as the top-level body so Make.com's
    // HTTP module exposes each key directly (e.g. {{moduleId.rumors}}).
    return new Response(JSON.stringify(data), { headers: responseHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: responseHeaders,
    });
  }
});
