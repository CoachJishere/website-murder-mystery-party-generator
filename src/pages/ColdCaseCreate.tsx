import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import { useAuth } from "@/context/AuthContext";
import { useWelcomeDiscount } from "@/hooks/useWelcomeDiscount";
import { ORIGINAL_PRICE, DISCOUNTED_PRICE } from "@/lib/discountUtils";
import { supabase } from "@/lib/supabase";

// Cold Case premise chat (ADR-0029 amendment 2026-07-05) — the same flow shape as the
// party product: brief box → sign in → AI CHAT that co-designs the concept → checkout.
// The chat's job is PREMISE design only (setting, era, victim, why the case went cold,
// why it's reopening) — never the killer or solution, which are generated post-purchase
// by the engine. The agreed premise becomes the BUYER_BRIEF the engine's Pass 0 honors.
// Rides the existing mystery-ai edge function with a custom system prompt (no new backend).

const CHECKOUT_URL =
  "https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/create-cold-case-checkout";

const MAX_TURNS = 12; // user messages; premise design converges in 2-4
const STORAGE_KEY = "cold-case-premise-chat";

const SYSTEM_PROMPT = `You are the intake officer for Cold Case Files — bespoke, single-player cold-case murder mysteries delivered as a file of ~25 period documents the buyer reads and solves.

Your ONLY job is to shape the PREMISE of the buyer's case before our writers build it. From their wishes (an era, a place, details to weave in — or nothing at all, in which case you invent something evocative), propose:
- a working title in case-file register (like "The Kestrel Ridge Plate" — a place or object, never a poetic sentence),
- the setting and era,
- the victim (name, role in that world),
- how they died and why it was ruled accident/suicide/natural/unsolved at the time,
- why the case is being reopened roughly 25 years later.

HARD RULES:
- NEVER invent, hint at, name, or discuss the killer, any suspect's guilt, the twist, or the solution — those are written after purchase and must surprise even you. If asked, decline with charm: the whole point is that they solve it.
- Honor every wish the buyer states (era, place, occupations, objects, moods). Their milieu always wins.
- Plain prose only — no markdown, no bold, no headers, no bullet lists.
- Keep each reply SHORT. The premise paragraph is ~100-120 words and MUST stay under 900 characters. The buyer sees the premise in a separate card, so never announce it ("here's what I'm proposing") — just react in one warm sentence, then ask in one sentence what they'd like changed or tell them to lock the case in.
- Stay on task; if the conversation drifts, steer warmly back to the premise.

FORMAT — every reply that contains a proposal MUST end with the current docket: exactly these six lines, no blank lines between them, plain text, nothing after them:
PREMISE:
Case: <working title in case-file register>
Setting: <place — season and year>
Victim: <name, their role in that world>
Ruled: <the official finding at the time, in a few words>
Reopens: <year — what surfaced to reopen it>`;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const OPENER =
  "Tell me about the case you want. An era, a place, a world — a lighthouse in 1899 Cornwall, a Prohibition speakeasy, a 1970s recording studio. Any detail you give me gets woven in. Or say \"surprise me\" and I'll bring you something you've never seen.";

// The docket = the labeled PREMISE lines of the newest assistant message that carries them.
// Parsed field-by-field (tolerant of ordering, markdown bold, stray blank lines) — the card
// renders it as a case docket, and the joined lines become the engine's brief.
const DOCKET_FIELDS = ["Case", "Setting", "Victim", "Ruled", "Reopens"] as const;
type Docket = Partial<Record<(typeof DOCKET_FIELDS)[number], string>>;

function parseDocket(content: string): Docket | null {
  const clean = content.replace(/\*\*/g, "");
  const d: Docket = {};
  for (const f of DOCKET_FIELDS) {
    const m = clean.match(new RegExp(`^\\s*${f}:\\s*(.+)$`, "im"));
    if (m) d[f] = m[1].trim();
  }
  // A real proposal names at least the case and two more fields.
  return d.Case && Object.keys(d).length >= 3 ? d : null;
}

function extractDocket(msgs: Msg[]): Docket | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role !== "assistant") continue;
    const d = parseDocket(msgs[i].content);
    if (d) return d;
  }
  return null;
}

function briefFromDocket(d: Docket): string {
  return DOCKET_FIELDS.filter((f) => d[f])
    .map((f) => `${f}: ${d[f]}`)
    .join("\n")
    .slice(0, 1000);
}

// Bubbles show the reply without the docket lines (the card owns them),
// keeping any framing before or after.
const DOCKET_LINE_RE = new RegExp(
  `^\\s*(?:PREMISE:?|(?:${DOCKET_FIELDS.join("|")}):.*)\\s*$`,
  "gim"
);
function displayText(msg: Msg): string {
  if (msg.role !== "assistant") return msg.content;
  const stripped = msg.content.replace(/\*\*/g, "").replace(DOCKET_LINE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  return stripped || msg.content.replace(/\*\*/g, "");
}

export default function ColdCaseCreate() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { isActive: discountActive } = useWelcomeDiscount();
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* fresh start */ }
    return [];
  });
  const [thinking, setThinking] = useState(false);
  const [paying, setPaying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const docket = extractDocket(messages);
  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* quota */ }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking || userTurns >= MAX_TURNS) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("mystery-ai", {
        body: { messages: next, system: SYSTEM_PROMPT },
      });
      const reply = data?.choices?.[0]?.message?.content;
      if (error || !reply) throw new Error(error?.message || "empty reply");
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      toast.error("The intake officer stepped away — try that once more.");
      setMessages(messages); // roll back the unanswered turn so it can be resent
    } finally {
      setThinking(false);
    }
  };

  // The hero brief box's text opens the conversation automatically.
  useEffect(() => {
    if (sentInitial.current || messages.length > 0) return;
    sentInitial.current = true;
    const initial = params.get("input")?.trim();
    if (initial) void send(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkout = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: (docket && briefFromDocket(docket)) ||
            messages.find((m) => m.role === "user")?.content?.slice(0, 1000) || "",
          email: user?.email || undefined,
          user_id: user?.id || undefined,
        }),
      });
      const body = await res.json();
      if (body.url) {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = body.url;
        return;
      }
      toast.error("Checkout isn't available right now — please try again in a minute.");
      setPaying(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#100d0b] text-[#f2ede6]">
      <Helmet>
        <title>Your Case Brief — Cold Case Files | Mystery Maker</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-1">
          <FileText className="h-5 w-5 text-[#c2a14a]" />
          <h1 className="font-display text-3xl">Shape your case</h1>
        </div>
        <p className="text-[#b5ad9f] mb-6 text-sm">
          Work out the premise with our intake officer — the era, the place, the victim, why the
          case went cold. The killer stays our secret until you find them.
        </p>

        {/* Desktop: chat left, docket right. Mobile: docket follows the chat. */}
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-10 lg:items-start">
          <div className="flex flex-col">
            {/* Conversation */}
            <div className="space-y-4 mb-6">
              {messages.length === 0 && !thinking && (
                <div className="rounded-lg border border-[#2b251f] bg-[#161210] p-4 text-[15px] leading-relaxed text-[#d8d1c4]">
                  {OPENER}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-lg bg-[#26201a] p-4 text-[15px] leading-relaxed"
                      : "mr-4 rounded-lg border border-[#2b251f] bg-[#161210] p-4 text-[15px] leading-relaxed text-[#d8d1c4] whitespace-pre-line"
                  }
                >
                  {displayText(m)}
                </div>
              ))}
              {thinking && (
                <div className="mr-4 rounded-lg border border-[#2b251f] bg-[#161210] p-4 text-sm text-[#8f887b] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> The intake officer is writing…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input — dark theme to match the page (the component's default pill is light) */}
            {userTurns < MAX_TURNS ? (
              <div className="cold-case-chat-input">
                <AIInputWithLoading
                  id="cold-case-brief-input"
                  placeholder={docket ? "Change anything — or lock it in" : "Describe your case…"}
                  onSubmit={send}
                  loading={thinking}
                  minHeight={56}
                />
              </div>
            ) : (
              <p className="text-sm text-[#8f887b] text-center mb-4">
                That's plenty to work with — lock in the case, or start over.
              </p>
            )}
          </div>

          {/* The docket → checkout */}
          {docket && (
            <div className="mt-6 lg:mt-0 lg:sticky lg:top-24 rounded-lg border border-[#c2a14a]/40 bg-[#1a1510] p-5">
              <p className="text-xs uppercase tracking-widest text-[#c2a14a] mb-3">
                Premise on file
              </p>
              <dl className="mb-4">
                {DOCKET_FIELDS.filter((f) => docket[f]).map((f) => (
                  <div key={f} className="grid grid-cols-[88px_1fr] gap-x-3 py-1.5 border-b border-[#2b251f]/60 last:border-0">
                    <dt className="text-xs uppercase tracking-wider text-[#8f887b] pt-0.5">{f}</dt>
                    <dd className="text-[15px] leading-snug text-[#e8e2d6]">{docket[f]}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mb-4 space-y-2 text-sm text-[#d8d1c4]">
                {[
                  "25 period documents — police reports, the post-mortem, letters, the local newspaper",
                  "Evidence photographs and a portrait of everyone named in the file",
                  "Four objectives, ending with you naming the killer",
                  "One offline file that never expires — replay it any time",
                  "Yours to share: hand it to friends when you've solved it",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[#c2a14a]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#8f887b] mb-1 leading-relaxed">
                Written just for you and emailed to{" "}
                <strong className="text-[#d8d1c4]">{user?.email || "your inbox"}</strong>, usually
                within the hour.
              </p>
              <div className="flex items-baseline justify-between gap-4 mb-4 pt-3 border-t border-[#2b251f]">
                <span className="text-sm text-[#8f887b]">One-time purchase</span>
                {discountActive ? (
                  <span className="text-right">
                    <span className="text-lg font-semibold text-[#e8e2d6]">
                      <s className="text-[#8f887b] font-normal mr-2">${ORIGINAL_PRICE}</s>${DISCOUNTED_PRICE}
                    </span>
                    <span className="block text-xs text-[#c2a14a]">
                      Welcome discount — applied at checkout
                    </span>
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-[#e8e2d6]">${ORIGINAL_PRICE}</span>
                )}
              </div>
              <Button
                onClick={checkout}
                disabled={paying}
                size="lg"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-6 text-lg"
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Lock this case in <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
