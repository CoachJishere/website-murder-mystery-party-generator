import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Download, Loader2, MailQuestion } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

// Cold Case delivery/status page (ADR-0029). Guest access via the emailed
// delivery token — no login. Polls cold-case-status while the case is being
// generated (no fake progress bar: honest states only), then serves a fresh
// short-lived signed URL per download click.
const STATUS_URL =
  "https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/cold-case-status";

type OrderState =
  | { kind: "loading" }
  | { kind: "crafting"; status: "paid" | "generating"; ahead: number }
  | { kind: "ready"; downloadUrl: string }
  | { kind: "failed" }
  | { kind: "not_found" };

const POLL_MS = 30_000;

export default function ColdCaseDelivery() {
  const { token: routeToken } = useParams<{ token: string }>();
  // Post-payment landing: Stripe's success_url is /cold-case/thanks?sid=cs_... — resolve
  // the real delivery token from the session id (the webhook may still be writing the
  // order for a few seconds; "pending" just re-polls).
  const sid = new URLSearchParams(window.location.search).get("sid") || "";
  const [token, setToken] = useState(routeToken === "thanks" ? "" : routeToken || "");
  const [state, setState] = useState<OrderState>({ kind: "loading" });

  const check = useCallback(async (): Promise<OrderState> => {
    try {
      if (!token && sid) {
        const r = await fetch(`${STATUS_URL}?session=${encodeURIComponent(sid)}`);
        const b = await r.json().catch(() => ({}));
        if (b.status === "resolved" && b.token) {
          setToken(b.token);
          window.history.replaceState(null, "", `/cold-case/${b.token}`);
          return { kind: "loading" }; // next tick polls with the real token
        }
        return { kind: "loading" }; // webhook still writing — keep polling
      }
      const res = await fetch(`${STATUS_URL}?token=${encodeURIComponent(token || "")}`);
      if (res.status === 404) return { kind: "not_found" };
      if (!res.ok) return { kind: "loading" }; // transient (429/5xx) — keep polling
      const body = await res.json();
      if (body.status === "ready" && body.download_url)
        return { kind: "ready", downloadUrl: body.download_url };
      if (body.status === "paid" || body.status === "generating")
        return { kind: "crafting", status: body.status, ahead: body.ahead ?? 0 };
      return { kind: "failed" };
    } catch {
      return { kind: "loading" };
    }
  }, [token, sid]);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const tick = async () => {
      const next = await check();
      if (!alive) return;
      setState(next);
      if (next.kind === "loading" || next.kind === "crafting") {
        timer = window.setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [check]);

  // Signed URLs expire in 10 min — mint a fresh one at click time so a tab
  // left open overnight still downloads.
  const download = async () => {
    const next = await check();
    if (next.kind === "ready") {
      window.location.href = next.downloadUrl;
    } else {
      setState(next);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#14100e] text-[#f2ede6]">
      <Helmet>
        <title>Your Cold Case — Mystery Maker</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-lg w-full text-center">
          {state.kind === "loading" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#c2a14a] mb-6" />
              <p className="text-[#b5ad9f]">Checking on your case…</p>
            </>
          )}

          {state.kind === "crafting" && (
            <>
              <p className="font-mono text-xs tracking-[0.25em] uppercase text-[#c2a14a] mb-6">
                Case file in preparation
              </p>
              <h1 className="font-serif text-3xl mb-6">
                Your case is being assembled.
              </h1>
              <p className="text-[#cfc8bb] leading-relaxed mb-4">
                An original mystery is being generated for you alone, then checked by our
                fair-play gates. <strong>We'll email you the moment it's ready</strong> — usually
                within the hour{state.ahead > 0 ? ` (${state.ahead} case${state.ahead === 1 ? "" : "s"} ahead of yours in the queue)` : ""}.
              </p>
              <p className="text-sm text-[#8f887b]">
                You can close this page — the email will find you. Or leave it open; it checks
                by itself.
              </p>
            </>
          )}

          {state.kind === "ready" && (
            <>
              <p className="font-mono text-xs tracking-[0.25em] uppercase text-[#c2a14a] mb-6">
                Case file · Eyes only
              </p>
              <h1 className="font-serif text-3xl mb-6">The file is on your desk.</h1>
              <p className="text-[#cfc8bb] leading-relaxed mb-8">
                One self-contained file. It works offline on any device — save a copy somewhere
                safe. This page stays valid, so you can re-download any time.
              </p>
              <Button
                onClick={download}
                size="lg"
                className="bg-[#8a2b1d] hover:bg-[#a33726] text-[#f7f4ee] text-lg px-10 py-6"
              >
                <Download className="mr-2 h-5 w-5" /> Download your case file
              </Button>
            </>
          )}

          {state.kind === "failed" && (
            <>
              <MailQuestion className="h-8 w-8 mx-auto text-[#c2a14a] mb-6" />
              <h1 className="font-serif text-3xl mb-6">This one's taking longer.</h1>
              <p className="text-[#cfc8bb] leading-relaxed mb-4">
                Your case hit a snag in our quality gates and a human is on it. You don't need
                to do anything — we'll email you as soon as it's resolved.
              </p>
              <p className="text-sm text-[#8f887b]">
                Want to reach us anyway?{" "}
                <Link to="/support" className="underline text-[#c2a14a]">
                  Contact support
                </Link>
                .
              </p>
            </>
          )}

          {state.kind === "not_found" && (
            <>
              <h1 className="font-serif text-3xl mb-6">We can't find that case.</h1>
              <p className="text-[#cfc8bb] leading-relaxed mb-4">
                This link doesn't match any order. Check the link in your confirmation email —
                or if you think something's wrong,{" "}
                <Link to="/support" className="underline text-[#c2a14a]">
                  contact support
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
