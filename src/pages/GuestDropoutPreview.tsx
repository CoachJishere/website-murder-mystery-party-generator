import React, { useState } from "react";
import Header from "@/components/Header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserX, AlertTriangle, ArrowLeft, CheckCircle2, Info, Wand2, Ban, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Design/UX preview for ADR-0088 (guest-dropout multi-character removal +
 * murderer/accomplice reassignment) -- visit /guest-dropout-preview.
 *
 * Entirely self-contained: hardcoded mock character data for both mystery
 * styles, no Supabase reads, no Stripe, no edge function calls, no real LLM
 * call. Safe with a plain `npm run dev`, no env vars, no flag, no auth.
 *
 * This is NOT the real entry point (that's the flag-gated Extras tab inside
 * MysteryPackageTabView.tsx, wired to real data) -- it's a faithful visual
 * mock of the flow for review before it's built. Wiring here is intentionally
 * fake; do not link this route from anywhere in the real app.
 */

type MockRole = "murderer" | "accomplice" | "suspect" | "redHerring" | null;
type MysteryStyle = "detective" | "character";

interface MockCharacter {
  id: string;
  character_name: string;
  character_role: MockRole;
}

const DETECTIVE_CAST: MockCharacter[] = [
  { id: "d1", character_name: "Bartholomew/Bianca Ashworth", character_role: "redHerring" },
  { id: "d2", character_name: "Diana Cross", character_role: "accomplice" },
  { id: "d3", character_name: "Elena Vega", character_role: "suspect" },
  { id: "d4", character_name: "Marcus Blackwood", character_role: "murderer" },
  { id: "d5", character_name: "Priya Shah", character_role: "suspect" },
  { id: "d6", character_name: "Tomas Reyes", character_role: "suspect" },
];

const CHARACTER_STYLE_CAST: MockCharacter[] = [
  { id: "c1", character_name: "Wren Castellan", character_role: null },
  { id: "c2", character_name: "Odette Marchetti", character_role: null },
  { id: "c3", character_name: "Felix Okonkwo-Byrne", character_role: null },
  { id: "c4", character_name: "Sable Duquesne", character_role: null },
  { id: "c5", character_name: "Rasheed Vantongeren", character_role: null },
  { id: "c6", character_name: "Imogen Castellane", character_role: null },
];

type Step = "explainer" | "picker" | "confirm" | "processing" | "done";

// Flat price per submission, regardless of how many characters are included —
// not per-character. Fix as many as you need in one go for one price.
const PRICE_PER_SUBMISSION = 5;

function isReassignRole(role: MockRole) {
  return role === "murderer" || role === "accomplice";
}

interface DoneResult {
  id: string;
  character_name: string;
  wasReassignment: boolean;
  promotedName?: string;
  promotedRole?: "murderer" | "accomplice";
}

export default function GuestDropoutPreview() {
  const [mysteryStyle, setMysteryStyle] = useState<MysteryStyle>("detective");
  const [activeTab, setActiveTab] = useState("extras");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<Step>("explainer");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replacements, setReplacements] = useState<Record<string, string>>({}); // characterId -> replacementId, "" = let us choose
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [lastResults, setLastResults] = useState<DoneResult[]>([]);

  const cast = mysteryStyle === "detective" ? DETECTIVE_CAST : CHARACTER_STYLE_CAST;
  const visibleCharacters = cast.filter((c) => !removedIds.includes(c.id));
  const MIN_REMAINING = 4;

  const switchStyle = (next: MysteryStyle) => {
    setMysteryStyle(next);
    setRemovedIds([]);
    setSelected(new Set());
    setReplacements({});
    setDialogOpen(false);
  };

  const openDialog = () => {
    setStep("explainer");
    setSelected(new Set());
    setReplacements({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setStep("explainer");
    setSelected(new Set());
    setReplacements({});
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setReplacements((r) => {
          const rr = { ...r };
          delete rr[id];
          return rr;
        });
      } else {
        if (visibleCharacters.length - (next.size + 1) < MIN_REMAINING) return prev; // hit floor, ignore
        next.add(id);
      }
      return next;
    });
  };

  const replacementCandidates = (forId: string) =>
    visibleCharacters.filter(
      (c) => c.id !== forId && !selected.has(c.id) && !isReassignRole(c.character_role)
    );

  const atCap = visibleCharacters.length - selected.size <= MIN_REMAINING;
  const total = selected.size > 0 ? PRICE_PER_SUBMISSION : 0;

  const handleConfirm = () => {
    setStep("processing");
    const targets = Array.from(selected)
      .map((id) => cast.find((c) => c.id === id)!)
      .filter(Boolean);
    setTimeout(() => {
      const results: DoneResult[] = targets.map((t) => {
        if (isReassignRole(t.character_role)) {
          const chosenId = replacements[t.id];
          const candidates = replacementCandidates(t.id);
          const promoted = chosenId
            ? cast.find((c) => c.id === chosenId)
            : candidates[0]; // demo stand-in for "system chose"
          return {
            id: t.id,
            character_name: t.character_name,
            wasReassignment: true,
            promotedName: promoted?.character_name,
            promotedRole: t.character_role as "murderer" | "accomplice",
          };
        }
        return { id: t.id, character_name: t.character_name, wasReassignment: false };
      });
      setRemovedIds((prev) => [...prev, ...Array.from(selected)]);
      setLastResults(results);
      setStep("done");
    }, targets.some((t) => isReassignRole(t.character_role)) ? 3200 : 1800);
  };

  return (
    <div style={{ backgroundColor: "var(--color-charcoal, #1a1a1a)", minHeight: "100vh" }}>
      <Header />

      <div
        className="no-print text-center py-3 text-xs font-semibold tracking-wide"
        style={{ backgroundColor: "#7a1f1f", color: "var(--color-cream, #f5f0e8)" }}
      >
        MOCK PREVIEW — no real data, no real charges, nothing here is wired to Stripe, Supabase, or an LLM
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--color-cream, #f5f0e8)", fontFamily: "var(--font-display, inherit)" }}
        >
          Sample Mystery — Preview
        </h1>
        <p className="text-sm mb-4" style={{ color: "rgba(245,240,232,0.6)" }}>
          This is what the "Extras" tab and the guest-dropout removal flow will look like once shipped.
        </p>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs uppercase tracking-wide" style={{ color: "rgba(245,240,232,0.5)" }}>
            Preview as:
          </span>
          <Button size="sm" variant={mysteryStyle === "detective" ? "default" : "outline"} onClick={() => switchStyle("detective")}>
            Detective-style
          </Button>
          <Button size="sm" variant={mysteryStyle === "character" ? "default" : "outline"} onClick={() => switchStyle("character")}>
            Character-style
          </Button>
        </div>

        {/* Mock tab bar — visually matches MysteryPackageTabView.tsx's real tab bar */}
        <div
          className="w-full mb-4 p-1.5 rounded-lg grid grid-cols-5 gap-1"
          style={{ backgroundColor: "var(--color-charcoal, #1a1a1a)", border: "1px solid var(--color-cream-border, rgba(245,240,232,0.2))" }}
        >
          {[
            { id: "host-guide", label: "Host Guide" },
            { id: "characters", label: `Characters (${visibleCharacters.length})` },
            { id: "clues", label: "Evidence" },
            { id: "inspector", label: "Detective Guide" },
            { id: "extras", label: "Extras" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all"
              style={{
                color: "var(--color-cream, #f5f0e8)",
                backgroundColor: activeTab === tab.id ? "var(--color-red, #c41e1e)" : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "extras" ? (
          <div className="rounded-md border p-6 text-sm" style={{ color: "rgba(245,240,232,0.5)", borderColor: "var(--color-cream-border, rgba(245,240,232,0.2))" }}>
            (Preview only shows the Extras tab — the other tabs are real content elsewhere in the app.)
          </div>
        ) : (
          <div className="max-w-lg">
            <div className="grid gap-4">
              <div
                className="rounded-lg border p-4 space-y-3"
                style={{ backgroundColor: "var(--color-charcoal, #1a1a1a)", borderColor: "var(--color-cream-border, rgba(245,240,232,0.2))" }}
              >
                <div className="flex items-center gap-2" style={{ color: "var(--color-cream, #f5f0e8)" }}>
                  <UserX className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Remove a Character</h3>
                </div>
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
                  A guest can't make it? Remove them from the story — $5 flat, fix as many
                  characters as you need in one go.
                </p>
                <Button onClick={openDialog}>Learn more</Button>
              </div>

              {/* Placeholder for the ADR-0078 hosting-tips video — already designed,
                  not yet built. Shown here (rather than only added once it ships) so
                  this tab reads as a growing space today, not a one-off utility. */}
              <div
                className="rounded-lg border border-dashed p-4 space-y-1 opacity-50"
                style={{ borderColor: "var(--color-cream-border, rgba(245,240,232,0.2))" }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--color-cream, #f5f0e8)" }}>
                    Hosting tips &amp; videos
                  </h3>
                  <Badge variant="secondary">Coming soon</Badge>
                </div>
                <p className="text-xs" style={{ color: "rgba(245,240,232,0.5)" }}>
                  Short videos and quick tips for running your mystery on the night.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {step === "explainer" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Remove a Character
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
                You can already edit any character here, but removing one entirely is more complex than
                a text edit — their alibi, rumors, and evidence are woven into everyone else's material too.
              </p>

              {mysteryStyle === "character" && (
                <div className="flex items-start gap-3 rounded-md border border-blue-400/30 bg-blue-400/5 p-3">
                  <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">You probably don't need to pay for this.</p>
                    <p>
                      This is a character-based mystery — there's no predetermined culprit, so a missing
                      character's absence is easy to paper over yourself, for free. Just tell your guests
                      something like: <em>"X is also a suspect, but we're interviewing them separately —
                      please carry on without them,"</em> or <em>"We've already ruled X out."</em> Any leftover
                      rumors about them become a non-issue.
                    </p>
                    <p>Still want it cleanly removed from every document? Continue below.</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Wand2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(245,240,232,0.6)" }} />
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.75)" }}>
                  We remove them from every character sheet, the detective script, and evidence cards, so
                  nothing left behind mentions them.
                </p>
              </div>

              <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Good to know</p>
                <div className="flex items-start gap-2">
                  <Ban className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(245,240,232,0.6)" }} />
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.75)" }}>
                    Once submitted, there's no way back.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "rgba(245,240,232,0.6)" }} />
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.75)" }}>
                    Best used as late as possible — ideally the day of the party. If another guest drops out
                    after you've already submitted, you'll need to do it again (and pay again).
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-2 border-white/30 hover:border-white/50 hover:bg-white/5"
                  onClick={closeDialog}
                >
                  No thanks
                </Button>
                <Button className="flex-1" onClick={() => setStep("picker")}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "picker" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Who can't make it?
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Select every character whose guest can't attend. You can remove more than one at once.
              </p>
              <div className="space-y-2 mt-2">
                {visibleCharacters.map((c) => {
                  const reassign = isReassignRole(c.character_role);
                  const checked = selected.has(c.id);
                  const disabled = !checked && atCap;
                  return (
                    <div key={c.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className={cn("flex items-center gap-2 min-w-0", disabled && "opacity-40")}>
                          <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggleSelected(c.id)} />
                          <span className="font-medium truncate">{c.character_name}</span>
                          {reassign && (
                            <Badge variant="secondary" className="shrink-0 capitalize">{c.character_role}</Badge>
                          )}
                        </label>
                      </div>
                      {checked && reassign && (
                        <div className="pl-6 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Removing the {c.character_role} means someone else needs to take over that role.
                            Pick who, or let us choose.
                          </p>
                          <Select
                            value={replacements[c.id] ?? "__auto__"}
                            onValueChange={(v) =>
                              setReplacements((r) => ({ ...r, [c.id]: v === "__auto__" ? "" : v }))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__auto__">Let us choose</SelectItem>
                              {replacementCandidates(c.id).map((cand) => (
                                <SelectItem key={cand.id} value={cand.id}>
                                  {cand.character_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleCharacters.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">All characters already removed in this preview — switch style or refresh to reset.</p>
                )}
              </div>
              {atCap && (
                <p className="text-xs text-muted-foreground mt-2">
                  A mystery needs at least {MIN_REMAINING} characters to work — that's as many as you can remove at once.
                </p>
              )}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-sm font-medium">
                  {selected.size} selected — ${total}
                </span>
                <Button disabled={selected.size === 0} onClick={() => setStep("confirm")}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <button onClick={() => setStep("picker")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">This can't be undone.</div>
                  <p style={{ color: "rgba(245,240,232,0.6)" }}>
                    Every character sheet, the detective script, and evidence cards get updated so nothing
                    left behind mentions:
                  </p>
                  <ul className="space-y-1.5">
                    {Array.from(selected).map((id) => {
                      const c = cast.find((x) => x.id === id)!;
                      const reassign = isReassignRole(c.character_role);
                      const chosenId = replacements[id];
                      const chosenName = chosenId ? cast.find((x) => x.id === chosenId)?.character_name : null;
                      return (
                        <li key={id} className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="font-medium">{c.character_name}</span>
                          {reassign && (
                            <span className="text-xs" style={{ color: "rgba(245,240,232,0.5)" }}>
                              — {chosenName ? `${chosenName} becomes the new ${c.character_role}` : `we'll choose the new ${c.character_role}`}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Total: ${total}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("picker")}>Cancel</Button>
                  <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">Pay now</Button>
                </div>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-10 text-center space-y-4">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <div className="font-semibold">Updating your mystery</div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This can take several minutes — longer if we're reassigning who the culprit is, since that's
                a bigger rewrite than a simple removal. No need to wait here.
              </p>
              <Button onClick={closeDialog}>
                Close — we'll update automatically when it's done
              </Button>
              <p className="text-xs text-muted-foreground">
                We'll also email you the moment it's ready.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="py-6 space-y-4">
              <div className="text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
                <div className="font-semibold">Done — your mystery has been updated</div>
              </div>
              <ul className="space-y-3">
                {lastResults.map((r) => (
                  <li key={r.id} className="text-sm rounded-md border p-3">
                    <span className="font-medium">{r.character_name}</span> has been removed from every
                    character sheet, the detective script, and evidence cards.
                    {r.wasReassignment && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-2">
                        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{r.promotedName}</span> is now the{" "}
                          {r.promotedRole}. This was a bigger rewrite than a simple removal — we recommend
                          skimming the new Detective Script reveal and {r.promotedName}'s final statement
                          before the party.
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <Button onClick={closeDialog} className="w-full">Back to your mystery</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
