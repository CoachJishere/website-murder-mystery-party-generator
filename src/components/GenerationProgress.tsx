import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

// Phased progress display for in-flight mystery generation. Phase state is derived from
// what's actually in the DB (master_context, game_overview, characters, evidence, etc.) —
// NOT from generation_status.progress, because the parent flow sometimes flips to
// completed prematurely while later modules are still finishing.
//
// On top of that real floor, each active phase gets a time-based *simulated* creep so the
// number visibly ticks up during silent stretches (notably the ~2 min "Story foundation"
// phase, which the parent scenario saves in one shot — otherwise the bar sits at 0% then
// jumps to ~55%). The simulation only moves WITHIN the active phase's 25-point band; it can
// never mark a phase complete or cross into the next band. Real content always wins.

type PhaseState = "done" | "active" | "pending";

interface Phase {
  key: string;
  label: string;
  description?: string;
  state: PhaseState;
}

interface GenerationProgressProps {
  // Real signals from DB
  hasMasterContext: boolean;
  hasGameOverview: boolean;
  hasMaterials: boolean;
  charactersDone: number;
  charactersExpected: number;
  hasEvidence: boolean;
  hasDetective: boolean;
  hasImages: boolean;
  // ISO timestamp when generation started — anchors the phase-1 simulation so a page
  // refresh mid-phase resumes near where it was instead of restarting the creep at 0.
  generationStartedAt?: string | null;
  isMobile?: boolean;
}

// Each phase spans 25 percentage points. The simulated creep eases asymptotically toward
// this cap (never the full 25), so it keeps moving but never claims the phase is done.
const PHASE_BAND = 25;
const SIM_CAP = 22; // asymptote of the eased bonus
const SIM_MAX = 24; // hard clamp, stays below the band boundary
const SIM_TAU = 75; // seconds — time constant of the ease

// Eased simulated bonus within a phase band, given seconds elapsed in the phase.
// ~7 pts at 30s, ~13 at 60s, ~18 at 120s, ~22 at 300s; never reaches 25.
function simulatedBonus(elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const eased = SIM_CAP * (1 - Math.exp(-elapsedSeconds / SIM_TAU));
  return Math.min(SIM_MAX, eased);
}

// Compute phase states + overall progress from real content signals.
function computeState(p: GenerationProgressProps, t: TFunction) {
  const phase1Done = p.hasMasterContext;
  const phase2Done = phase1Done && p.hasGameOverview && p.hasMaterials;
  const phase3Done = phase2Done && p.charactersExpected > 0 && p.charactersDone >= p.charactersExpected;
  const phase4Done = phase3Done && p.hasEvidence && p.hasDetective && p.hasImages;

  // Active = first not-done phase
  let activeIdx: number;
  if (!phase1Done) activeIdx = 0;
  else if (!phase2Done) activeIdx = 1;
  else if (!phase3Done) activeIdx = 2;
  else if (!phase4Done) activeIdx = 3;
  else activeIdx = -1; // all done

  const phases: Omit<Phase, "state">[] = [
    {
      key: "setup",
      label: t("generationProgress.phases.setup.label"),
      description: t("generationProgress.phases.setup.description"),
    },
    {
      key: "world",
      label: t("generationProgress.phases.world.label"),
      description: t("generationProgress.phases.world.description"),
    },
    {
      key: "characters",
      label: p.charactersExpected > 0
        ? t("generationProgress.phases.characters.labelCounting", { done: p.charactersDone, expected: p.charactersExpected })
        : t("generationProgress.phases.characters.label"),
      description: t("generationProgress.phases.characters.description"),
    },
    {
      key: "evidence",
      label: t("generationProgress.phases.evidence.label"),
      description: t("generationProgress.phases.evidence.description"),
    },
  ];

  const phasesWithState: Phase[] = phases.map((ph, i) => ({
    ...ph,
    state: activeIdx === -1 ? "done" : i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
  }));

  // Real content-derived progress: each completed phase = 25%. For the active character
  // phase, factor in the in-flight character count so it ticks up as children land.
  // This is the FLOOR — the simulated creep (applied by the component) only adds on top,
  // never above the active phase's band.
  const activeKey = activeIdx === -1 ? null : phases[activeIdx].key;
  let realBonus = 0; // real progress inside the active band (0..25)
  if (activeIdx === 2 && p.charactersExpected > 0) {
    realBonus = Math.min(PHASE_BAND, Math.round((p.charactersDone / p.charactersExpected) * PHASE_BAND));
  }
  const floor = activeIdx === -1 ? 100 : activeIdx * PHASE_BAND + realBonus;

  return { phases: phasesWithState, progress: floor, activeIdx, activeKey, realBonus };
}

const PhaseIcon: React.FC<{ state: PhaseState }> = ({ state }) => {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
  if (state === "active") return <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />;
  return <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />;
};

const GenerationProgress: React.FC<GenerationProgressProps> = (props) => {
  const { t } = useTranslation();
  const { phases, progress: floor, activeIdx, activeKey, realBonus } = computeState(props, t);
  const isMobile = props.isMobile;

  // Self-driving tick: re-render every ~1.5s while generation is incomplete so the
  // simulated creep advances. The page has no polling — realtime events only fire when
  // content lands — so without this the number would freeze between phases.
  const [, forceTick] = useState(0);
  const incomplete = activeIdx !== -1;
  useEffect(() => {
    if (!incomplete) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 1500);
    return () => window.clearInterval(id);
  }, [incomplete]);

  // Anchor the current phase's start time. When the active phase changes we reset the
  // anchor to now, so each band's creep restarts from 0. The first phase ("setup") is
  // anchored to generationStartedAt when available, so a refresh mid-phase resumes the
  // creep instead of restarting it.
  const anchorRef = useRef<{ key: string | null; t: number }>({ key: null, t: Date.now() });
  if (anchorRef.current.key !== activeKey) {
    let start = Date.now();
    if (activeKey === "setup" && props.generationStartedAt) {
      const parsed = new Date(props.generationStartedAt).getTime();
      if (!Number.isNaN(parsed)) start = parsed;
    }
    anchorRef.current = { key: activeKey, t: start };
  }

  // Layer the simulated creep on top of the real floor, but only within the active band.
  let progress = floor;
  if (incomplete) {
    const elapsedSeconds = (Date.now() - anchorRef.current.t) / 1000;
    const simBonus = simulatedBonus(elapsedSeconds);
    // Never let simulation undercut real progress inside the active band; take the max.
    const bandBonus = Math.min(SIM_MAX, Math.max(realBonus, simBonus));
    progress = activeIdx * PHASE_BAND + bandBonus;
  }

  // Monotonic guard: the displayed number never goes backwards across re-renders.
  const lastShownRef = useRef(0);
  const shown = Math.max(lastShownRef.current, Math.round(progress));
  lastShownRef.current = shown;

  return (
    <Card className={cn("mb-6", isMobile && "mx-2")}>
      <CardContent className={cn("pt-6 space-y-6", isMobile && "pt-4 space-y-4")}>
        <div>
          <h2 className={cn("font-bold mb-1", isMobile ? "text-xl" : "text-2xl")}>
            {t("generationProgress.heading")}
          </h2>
          <p className={cn("text-muted-foreground", isMobile && "text-sm")}>
            {t("generationProgress.subheading")}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{t("generationProgress.percentComplete", { percent: shown })}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(2, shown)}%` }}
            />
          </div>
        </div>

        <ul className="space-y-3">
          {phases.map((phase) => (
            <li key={phase.key} className="flex items-start gap-3">
              <PhaseIcon state={phase.state} />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium",
                  phase.state === "pending" && "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {phase.label}
                </div>
                {phase.description && phase.state !== "done" && (
                  <div className={cn(
                    "text-muted-foreground mt-0.5",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {phase.description}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default GenerationProgress;
