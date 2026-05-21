import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Function: submit-contact-form
//
// Public endpoint backing the /support and /contact contact form.
// See docs/adr/0002-contact-form-architecture.md for architecture rationale.
//
// Responsibilities:
//   1. Validate input (length caps, required fields, email shape)
//   2. Honeypot check — reject silently if filled
//   3. IP rate limit — max 5 submissions/hour
//   4. Capture user_id server-side from JWT when present
//   5. Insert into contact_messages (DB trigger then fires notify-contact-message)

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

const RATE_LIMIT_PER_HOUR = 5;

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 10_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonResponse({ ok: false, error: 'invalid_payload' }, 400, corsHeaders);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const language = typeof body.language === 'string' ? body.language.trim().slice(0, 10) : 'en';
    const honeypot = typeof body.website === 'string' ? body.website : '';

    // Honeypot — pretend success so bots don't learn what tripped them.
    if (honeypot.length > 0) {
      console.log('Honeypot tripped — silently dropping submission');
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }

    // Validation
    if (!name || !email || !subject || !message) {
      return jsonResponse({ ok: false, error: 'missing_fields' }, 400, corsHeaders);
    }
    if (name.length > MAX_NAME || subject.length > MAX_SUBJECT) {
      return jsonResponse({ ok: false, error: 'field_too_long' }, 400, corsHeaders);
    }
    if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return jsonResponse({ ok: false, error: 'invalid_email' }, 400, corsHeaders);
    }
    if (message.length > MAX_MESSAGE) {
      return jsonResponse({ ok: false, error: 'message_too_long' }, 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || null;

    // Rate limit by IP — count submissions in the last hour
    if (ipAddress) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countErr } = await supabase
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ipAddress)
        .gte('created_at', oneHourAgo);

      if (countErr) {
        // Fail open on rate-limit query errors — better to accept the message
        // than to silently drop a legitimate submission if the DB hiccups.
        console.error('Rate-limit query failed, allowing submission:', countErr);
      } else if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
        return jsonResponse(
          { ok: false, error: 'rate_limited' },
          429,
          corsHeaders,
        );
      }
    }

    // Resolve user_id from JWT if present. Anon submissions are fine — user_id stays null.
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7);
      const userClient = createClient(supabaseUrl, serviceKey);
      const { data: userData } = await userClient.auth.getUser(token);
      if (userData?.user?.id) userId = userData.user.id;
    }

    const { error: insertErr } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
        language,
        user_id: userId,
        user_agent: userAgent,
        ip_address: ipAddress,
      });

    if (insertErr) {
      console.error('Insert into contact_messages failed:', insertErr);
      return jsonResponse({ ok: false, error: 'insert_failed' }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true }, 200, corsHeaders);
  } catch (err) {
    console.error('submit-contact-form error:', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500, corsHeaders);
  }
});
