// ADR-0156 Phase 3: request handling for the child-context edge function. Web-standard Request/Response only and every I/O call injected, so
// `child-context.test.mjs` runs the whole path under Node. index.ts wires the real Supabase client.
//
// Contract (POST, text/plain body, see BODY_SEPARATOR in _shared/childContext.ts):
//   header  x-child-context-key: the shared secret (env CHILD_CONTEXT_KEY). The gateway's JWT check lets the public anon key through, which
//           must NOT be enough to read a customer's design, so this header is the real gate.
//   body    packageId, characterName, characterChatExcerpts, conversationContent, joined by BODY_SEPARATOR.
//   200     { redacted, role, context, excerpt, chat, flags, mode, fallback }  When `redacted` is false the three text fields are null and the
//           caller (Make) keeps the full inputs it already holds, so "off", "not detective", a culprit, and every failure give exactly today's input.
//   other   401 wrong or missing key, 503 key not configured, 405, 400 bad body, 404 package unknown, 500 unexpected. Make treats any non-200
//           (or a response without redacted:true) as "keep the full inputs".
// Customer text is never logged; only ids, role, sizes and flags are.
import { parseMode, parseRequestBody, prepareChildInputs, type PrepareResult, type RedactionMode } from "../_shared/childContext.ts";

export interface PackageRow { master_context: string | null; mystery_style: string | null; conversation_id: string | null }

export interface Deps {
  expectedKey: string | undefined;
  loadPackage(id: string): Promise<PackageRow | null>;
  loadIsTest(conversationId: string | null): Promise<boolean>;
  loadMode(): Promise<string | null>;
  /** One auto_remediation_log row, defect_class "child_context". Must not throw (the handler also guards it). */
  logFallback(packageId: string, action: string): Promise<void>;
  /** Alert once per (package, reason); the dependency decides whether one was already sent. */
  alert(packageId: string, reason: string, detail: string): Promise<void>;
  log(line: string): void;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sameKey(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ax = new Uint8Array(x), by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ by[i];
  return diff === 0;
}

export async function handleChildContext(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  if (!deps.expectedKey) return json(503, { error: "not configured" });
  const given = req.headers.get("x-child-context-key") ?? "";
  if (!given || !(await sameKey(given, deps.expectedKey))) return json(401, { error: "unauthorized" });

  const body = parseRequestBody(await req.text());
  if (!body) return json(400, { error: "bad body" });

  let pkg: PackageRow | null;
  let mode: RedactionMode;
  try {
    pkg = await deps.loadPackage(body.packageId);
    mode = parseMode(await deps.loadMode());
  } catch (e) {
    deps.log(`child-context: lookup failed ${body.packageId}: ${(e as Error).message}`);
    return json(500, { error: "lookup failed" });
  }
  if (!pkg) return json(404, { error: "package not found" });

  let prep: PrepareResult;
  try {
    const isTest = mode === "test_only" ? await deps.loadIsTest(pkg.conversation_id) : false;
    prep = prepareChildInputs({
      mode, isTest, mysteryStyle: pkg.mystery_style, masterContext: pkg.master_context ?? "", characterName: body.characterName,
      excerpt: body.excerpt, conversation: body.conversation,
    });
  } catch (e) {
    // Anything unexpected: keep the full inputs, say so, and tell Jonathan. Never a 500 that could be mistaken for success.
    prep = { redacted: false, role: null, context: null, excerpt: null, chat: null, flags: ["fallback:exception"], fallback: { reason: "exception", alert: true } };
    deps.log(`child-context: exception ${body.packageId}: ${(e as Error).message}`);
  }

  if (prep.fallback) {
    const action = `fallback:${prep.fallback.reason}:${body.characterName}`.slice(0, 200);
    try { await deps.logFallback(body.packageId, action); } catch (e) { deps.log(`child-context: log failed: ${(e as Error).message}`); }
    if (prep.fallback.alert) {
      try { await deps.alert(body.packageId, prep.fallback.reason, `${body.characterName}: full inputs were kept (flags ${prep.flags.join(", ")})`); } catch (e) { deps.log(`child-context: alert failed: ${(e as Error).message}`); }
    }
  }
  deps.log(`child-context: ${body.packageId} role=${prep.role} mode=${mode} redacted=${prep.redacted} flags=${prep.flags.join("|")} sizes=${JSON.stringify(prep.sizes ?? null)}`);

  return json(200, {
    redacted: prep.redacted,
    role: prep.role,
    context: prep.redacted ? prep.context : null,
    excerpt: prep.redacted ? prep.excerpt : null,
    chat: prep.redacted ? prep.chat : null,
    flags: prep.flags,
    mode,
    fallback: prep.fallback?.reason ?? null,
  });
}
