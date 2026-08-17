import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, XCircle, Circle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdaptationBatchStatus,
  nudgeStuckAdaptation,
  isTerminalStatus,
  AdaptationBatchRow,
} from "@/services/adaptationService";
import { Button } from "@/components/ui/button";

// "Remove a Character" (renamed from "Recast" — ADR-0091) — ADR-0036/0082/0088
// (staging only). Stripe success_url lands
// here with ?batch_id=... A batch can genuinely take several minutes —
// longer with a murderer/accomplice reassignment in it, a much bigger
// generation than a plain removal — so this page is deliberately
// non-blocking: it never traps the host behind a forced wait. They can leave
// at any point; the completion email (send-adaptation-complete-email) covers
// the case where they close the tab, and if they navigate straight to
// /mystery/:id instead, the realtime mystery_characters subscription already
// wired there reflects the change live with no extra code needed here.
//
// Polling (not realtime) is used on THIS page specifically because it's
// simple, already-proven, and sub-second latency isn't remotely necessary
// for a process that takes minutes.

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 400; // ~20 minutes backstop -- generous on purpose, see file header

const AdaptationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const batchId = searchParams.get("batch_id");
  const [rows, setRows] = useState<AdaptationBatchRow[] | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudgedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!batchId) return;

    const poll = async () => {
      try {
        const result = await getAdaptationBatchStatus(batchId);
        setRows(result);

        const allTerminal = result.length > 0 && result.every((r) => isTerminalStatus(r.status));
        if (allTerminal && pollRef.current) {
          clearInterval(pollRef.current);
        }

        // Stuck-batch nudge (staging-scope safety net, not the correctness
        // mechanism — see ADR-0088). Gated on the predecessor's REAL
        // terminal status, never a wall-clock guess: nudging a row whose
        // predecessor is simply still (legitimately) mid-flight would
        // dispatch two invocations concurrently against the same package —
        // exactly the race chain-dispatch exists to prevent. Only nudge
        // once per row per page load.
        for (const row of result) {
          if (row.status !== "paid") continue;
          const predecessor = result.find((r) => r.batch_sequence === row.batch_sequence - 1);
          const predecessorTerminal = !predecessor || isTerminalStatus(predecessor.status);
          if (predecessorTerminal && !nudgedRef.current.has(row.id)) {
            nudgedRef.current.add(row.id);
            nudgeStuckAdaptation(row.id).catch((e) => console.error("nudge failed:", e));
          }
        }
      } catch (error) {
        console.error("Error polling adaptation batch status:", error);
      }
      setPollCount((c) => c + 1);
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [batchId]);

  useEffect(() => {
    if (pollCount >= MAX_POLLS && pollRef.current) clearInterval(pollRef.current);
  }, [pollCount]);

  const conversationIdParam = searchParams.get("conversation_id");

  const goToMystery = async () => {
    if (conversationIdParam) {
      navigate(`/mystery/${conversationIdParam}`, { replace: true });
      return;
    }
    if (rows && rows.length > 0) {
      const { data } = await supabase
        .from("mystery_adaptations")
        .select("conversation_id")
        .eq("id", rows[0].id)
        .maybeSingle();
      if (data?.conversation_id) {
        navigate(`/mystery/${data.conversation_id}`, { replace: true });
        return;
      }
    }
    navigate("/dashboard", { replace: true });
  };

  if (!batchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-muted-foreground">{t("adaptation.result.missingId")}</p>
        </div>
      </div>
    );
  }

  const doneCount = rows?.filter((r) => isTerminalStatus(r.status)).length ?? 0;
  const totalCount = rows?.length ?? 0;
  const allTerminal = rows !== null && totalCount > 0 && doneCount === totalCount;
  const anyReviewRecommended = rows?.some((r) => r.transform_result?.host_review_recommended) ?? false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="text-center space-y-4 max-w-md w-full">
        {!allTerminal && (
          <>
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <h1 className="text-2xl font-bold">{t("adaptation.processing.title")}</h1>
            <p className="text-muted-foreground">{t("adaptation.processing.waiting")}</p>
            {totalCount > 1 && (
              <p className="text-sm text-muted-foreground">{doneCount} of {totalCount} done</p>
            )}
            {rows && rows.length > 0 && (
              <ul className="text-left space-y-1.5 text-sm bg-muted/30 rounded-md p-3 mt-2">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    {isTerminalStatus(r.status)
                      ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={isTerminalStatus(r.status) ? "" : "text-muted-foreground"}>{r.character_name}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={goToMystery} className="mt-2">{t("adaptation.processing.goNow")}</Button>
            <p className="text-xs text-muted-foreground">{t("adaptation.processing.emailNotice")}</p>
          </>
        )}

        {allTerminal && (
          <>
            {rows!.every((r) => r.status === "verified")
              ? <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              : <XCircle className="h-12 w-12 mx-auto text-amber-500" />}
            <h1 className="text-2xl font-bold">
              {rows!.every((r) => r.status === "verified") ? t("adaptation.result.verified") : t("adaptation.result.partial")}
            </h1>
            <ul className="text-left space-y-2 text-sm bg-muted/30 rounded-md p-4">
              {rows!.map((r) => {
                const promoted = r.transform_result?.reassignment?.promoted_character_name;
                return (
                  <li key={r.id}>
                    {r.status === "verified" ? (
                      <>
                        <span className="font-medium">{r.character_name}</span> removed from every character sheet,
                        the detective script, and evidence cards.
                        {promoted && (
                          <span className="text-muted-foreground"> {promoted} is now the {r.character_role}.</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{r.character_name}</span> — {t("adaptation.result.rowFailed")}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            {anyReviewRecommended && (
              <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-left">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{t("adaptation.result.reassignmentNotice")}</p>
              </div>
            )}
            <Button onClick={goToMystery} className="w-full">{t("adaptation.result.backToMystery")}</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdaptationSuccess;
