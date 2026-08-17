import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserX, AlertTriangle, ArrowLeft, Wand2, Ban, Clock, Info, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MysteryCharacter } from "@/interfaces/mystery";
import { useAuth } from "@/context/AuthContext";
import {
  createAdaptation, CreateAdaptationCharacter, getActiveAdaptationBatch,
  isTerminalStatus, AdaptationBatchRow,
} from "@/services/adaptationService";

// "Remove a Character" (renamed from "Recast" — ADR-0091) — ADR-0036 Phase B
// (staging only) / ADR-0082 / ADR-0088. Lives in
// its own "Extras" tab (a small, growing catalog — the hosting-tips-video
// card below is a placeholder for ADR-0078's already-designed, not-yet-built
// second citizen) with the pick -> confirm sequence in a focused lightbox.
//
// Payment stays ordered AFTER picking (not a pay-first credit model) so
// eligibility and the total are always shown for free before any money
// changes hands — see ADR-0082's flow-decision writeup.
//
// Eligibility (ADR-0088, revised from Phase B):
//   - mystery_style='character' (slip-mechanic): ANY character is eligible —
//     G8 (docs/generation-guardrails.md) confirms no character's content is
//     guilt-specific in these games, nothing is protected.
//   - mystery_style='detective': redHerring/suspect get a plain removal, same
//     as Phase B. murderer/accomplice are now ALSO eligible, but picking one
//     reveals an inline replacement picker — a different remaining character
//     must take over that role (host picks, or "let us choose").
//
// Multi-select: a submission can cover several characters at once (ADR-0088)
// — priced FLAT per submission, not per character. On confirm, this component
// creates the adaptation batch and hands off to Stripe (or shows the staging
// no-checkout toast); the "done" acknowledgment still lives on
// AdaptationSuccess.tsx (the real Stripe success_url landing page) and the
// completion email, since a real Stripe redirect happens in between.
//
// Live progress (owner decision after live review): a host shouldn't have to
// keep that other tab open to know a request is working — this card polls for
// an in-flight batch on this package and shows progress (bar + per-character
// checklist) directly here whenever one exists, reverting to the normal idle
// card once it's done. Only one batch may be in flight per package at a time
// (adapt-mystery-create rejects a second one) — simpler for a host to reason
// about, and it shrinks the realistic surface for the cross-batch
// package-claim contention adapt-mystery-apply guards against server-side
// (that guard stays regardless; this is UX-level prevention, not the only
// line of defense).

interface GuestDropoutPanelProps {
  packageId: string;
  characters: MysteryCharacter[];
  mysteryStyle?: string | null;
}

type Step = "explainer" | "picker" | "confirm";

const MIN_REMAINING_CHARACTERS = 4; // client-side mirror of the server-side floor — see ADR-0088

function isReassignRole(role: string | null | undefined): boolean {
  return role === "murderer" || role === "accomplice";
}

const GuestDropoutPanel: React.FC<GuestDropoutPanelProps> = ({
  packageId, characters, mysteryStyle,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("explainer");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replacements, setReplacements] = useState<Record<string, string>>({}); // characterId -> replacementId, "" = let us choose
  const [submitting, setSubmitting] = useState(false);
  const [activeBatch, setActiveBatch] = useState<AdaptationBatchRow[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // One-shot check: fetches, updates state, returns whether a batch is still
  // in flight. Does NOT manage the interval itself — callers decide whether
  // polling needs to (re)start based on the result, so this stays reusable
  // both for the recurring poll tick and for an immediate post-submit refresh.
  const refreshActiveBatchOnce = async (): Promise<boolean> => {
    try {
      const batch = await getActiveAdaptationBatch(packageId);
      const stillActive = !!batch && batch.some((r) => !isTerminalStatus(r.status));
      setActiveBatch(stillActive ? batch : null);
      return stillActive;
    } catch (e) {
      console.error("Error checking for an active adaptation batch:", e);
      return false;
    }
  };

  const startPollingIfNeeded = () => {
    if (pollRef.current) return; // already running
    pollRef.current = setInterval(async () => {
      const stillActive = await refreshActiveBatchOnce();
      if (!stillActive && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 4000);
  };

  // Used after creating a new batch (handleSubmit) so the card switches to
  // the progress view immediately rather than waiting for the next tick —
  // and, critically, restarts polling if a previous batch already finished
  // and stopped it (a one-off refresh alone would otherwise show this new
  // batch's initial state and then never update again).
  const refreshActiveBatch = async () => {
    const stillActive = await refreshActiveBatchOnce();
    if (stillActive) startPollingIfNeeded();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stillActive = await refreshActiveBatchOnce();
      if (cancelled) return;
      if (stillActive) startPollingIfNeeded();
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  const isCharacterStyle = mysteryStyle === "character";

  const isEligible = (character: MysteryCharacter): boolean => {
    if (isCharacterStyle) return true; // G8: nothing is guilt-specific in slip-mechanic games
    const role = character.character_role;
    return role === "redHerring" || role === "suspect" || isReassignRole(role);
  };

  const resetAndOpen = () => {
    setStep("explainer");
    setSelected(new Set());
    setReplacements({});
    setOpen(true);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setStep("explainer");
      setSelected(new Set());
      setReplacements({});
    }
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
        if (characters.length - (next.size + 1) < MIN_REMAINING_CHARACTERS) return prev; // at floor, ignore
        next.add(id);
      }
      return next;
    });
  };

  const replacementCandidates = (forId: string) =>
    characters.filter(
      (c) => c.id !== forId && !selected.has(c.id) && !isReassignRole(c.character_role)
    );

  const atCap = characters.length - selected.size <= MIN_REMAINING_CHARACTERS;
  const total = selected.size > 0 ? 5 : 0; // flat $5 per submission, not per character (ADR-0088)

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: CreateAdaptationCharacter[] = Array.from(selected).map((id) => ({
        characterId: id,
        replacementCharacterId: replacements[id] || undefined,
      }));
      const result = await createAdaptation(packageId, payload, user?.email);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      // Staging convenience path: no Stripe key configured in this env yet.
      // Row is 'pending' immediately, so it already counts as "in flight" —
      // refresh right away rather than waiting for the next poll tick, so
      // the card switches to the progress view without a delay.
      toast.success(t("adaptation.toasts.createdNoCheckout", { count: selected.size }));
      handleOpenChange(false);
      refreshActiveBatch();
    } catch (error) {
      console.error("Error creating adaptation:", error);
      const reason = (error as { context?: { reason?: string } })?.context?.reason;
      if (reason === "already_in_progress") {
        // Stale UI state (e.g. another tab started one) — reflect what's
        // actually in flight rather than leaving just a toast.
        toast.error(t("adaptation.toasts.alreadyInProgress"));
        handleOpenChange(false);
        refreshActiveBatch();
      } else {
        toast.error(t("adaptation.toasts.createFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-lg">
        <div className="grid gap-4">
          {activeBatch ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <h3 className="text-lg font-semibold">{t("adaptation.card.inProgressTitle")}</h3>
              </div>
              <Progress
                value={(activeBatch.filter((r) => isTerminalStatus(r.status)).length / activeBatch.length) * 100}
              />
              <p className="text-sm text-muted-foreground">
                {t("adaptation.card.inProgressSummary", {
                  done: activeBatch.filter((r) => isTerminalStatus(r.status)).length,
                  total: activeBatch.length,
                })}
              </p>
              <ul className="space-y-1 text-sm">
                {activeBatch.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    {isTerminalStatus(r.status)
                      ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={isTerminalStatus(r.status) ? "" : "text-muted-foreground"}>
                      {r.character_name}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{t("adaptation.card.inProgressNotice")}</p>
            </div>
          ) : (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                <h3 className="text-lg font-semibold">{t("adaptation.card.title")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t("adaptation.card.teaser")}</p>
              <Button onClick={resetAndOpen}>{t("adaptation.card.cta")}</Button>
            </div>
          )}

          {/* Placeholder for the ADR-0078 hosting-tips video — already
              designed, not yet built. Shown here so this tab reads as a
              growing space today, not a one-off utility. */}
          <div className="rounded-lg border border-dashed p-4 space-y-1 opacity-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("adaptation.card.comingSoonTitle")}</h3>
              <Badge variant="secondary">{t("adaptation.card.comingSoonBadge")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{t("adaptation.card.comingSoonBody")}</p>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {step === "explainer" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  {t("adaptation.explainer.title")}
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground">{t("adaptation.explainer.subtitle")}</p>

              {isCharacterStyle && (
                <div className="flex items-start gap-3 rounded-md border border-blue-400/30 bg-blue-400/5 p-3">
                  <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{t("adaptation.explainer.characterStyleHeadline")}</p>
                    <p>{t("adaptation.explainer.characterStyleBody")}</p>
                    <p>{t("adaptation.explainer.characterStyleContinue")}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Wand2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("adaptation.explainer.realEditBody")}</p>
              </div>

              <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                  {t("adaptation.explainer.goodToKnowLabel")}
                </p>
                <div className="flex items-start gap-2">
                  <Ban className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("adaptation.explainer.irreversibleBody")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("adaptation.explainer.timingBody")}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-2 border-white/30 hover:border-white/50 hover:bg-white/5"
                  onClick={() => handleOpenChange(false)}
                >
                  {t("adaptation.explainer.noThanks")}
                </Button>
                <Button className="flex-1" onClick={() => setStep("picker")}>
                  {t("adaptation.explainer.continue")}
                </Button>
              </div>
            </div>
          )}

          {step === "picker" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  {t("adaptation.picker.title")}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("adaptation.picker.subtitle")}</p>

              <div className="space-y-2 mt-2">
                {characters.map((character) => {
                  const eligible = isEligible(character);
                  const reassign = isReassignRole(character.character_role);
                  const checked = selected.has(character.id);
                  const disabled = !eligible || (!checked && atCap);
                  return (
                    <div key={character.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className={cn("flex items-center gap-2 min-w-0", disabled && "opacity-40")}>
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={() => eligible && toggleSelected(character.id)}
                          />
                          <span className="font-medium truncate">{character.character_name}</span>
                          {reassign && (
                            <Badge variant="secondary" className="shrink-0 capitalize">{character.character_role}</Badge>
                          )}
                        </label>
                      </div>
                      {checked && reassign && (
                        <div className="pl-6 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {t("adaptation.picker.reassignNote", { role: character.character_role })}
                          </p>
                          <Select
                            value={replacements[character.id] ?? "__auto__"}
                            onValueChange={(v) =>
                              setReplacements((r) => ({ ...r, [character.id]: v === "__auto__" ? "" : v }))
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__auto__">{t("adaptation.picker.replacementAuto")}</SelectItem>
                              {replacementCandidates(character.id).map((cand) => (
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
              </div>
              {atCap && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("adaptation.picker.maxReached", { min: MIN_REMAINING_CHARACTERS })}
                </p>
              )}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-sm font-medium">
                  {t("adaptation.picker.selectedSummary", { count: selected.size, total })}
                </span>
                <Button disabled={selected.size === 0} onClick={() => setStep("confirm")}>
                  {t("adaptation.explainer.continue")}
                </Button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <button
                onClick={() => setStep("picker")}
                disabled={submitting}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> {t("adaptation.confirm.back")}
              </button>

              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">{t("adaptation.confirm.title")}</div>
                  <p className="text-muted-foreground">{t("adaptation.confirm.sharedConsequence")}</p>
                  <ul className="space-y-1.5">
                    {Array.from(selected).map((id) => {
                      const c = characters.find((x) => x.id === id)!;
                      const reassign = isReassignRole(c.character_role);
                      const chosenId = replacements[id];
                      const chosenName = chosenId ? characters.find((x) => x.id === chosenId)?.character_name : null;
                      return (
                        <li key={id} className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="font-medium">{c.character_name}</span>
                          {reassign && (
                            <span className="text-xs text-muted-foreground">
                              — {chosenName
                                ? t("adaptation.confirm.replacedBy", { name: chosenName, role: c.character_role })
                                : t("adaptation.confirm.replacedByAuto", { role: c.character_role })}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">{t("adaptation.confirm.totalLabel", { total })}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("picker")} disabled={submitting}>
                    {t("adaptation.confirm.cancel")}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adaptation.confirm.cta")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GuestDropoutPanel;
