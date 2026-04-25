import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Phased progress display for in-flight mystery generation. Phase state is derived from
// what's actually in the DB (master_context, game_overview, characters, evidence, etc.) —
// NOT from generation_status.progress, because the parent flow sometimes flips to
// completed prematurely while later modules are still finishing.

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
  isMobile?: boolean;
}

// Compute phase states + overall progress from real content signals.
function computeState(p: GenerationProgressProps) {
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
      label: "Story foundation set",
      description: "Crime, setting, stakes, and full cast plan locked in",
    },
    {
      key: "world",
      label: "Game overview and themed materials",
      description: "Mystery summary and theme-specific atmosphere props",
    },
    {
      key: "characters",
      label: p.charactersExpected > 0
        ? `Creating characters (${p.charactersDone} of ${p.charactersExpected} ready)`
        : "Creating characters",
      description: "Each guest's secrets, motives, and round scripts",
    },
    {
      key: "evidence",
      label: "Evidence cards, detective script, and images",
      description: "Round-by-round clues, narrator dialogue, and forensic images",
    },
  ];

  const phasesWithState: Phase[] = phases.map((ph, i) => ({
    ...ph,
    state: activeIdx === -1 ? "done" : i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
  }));

  // Overall progress: each completed phase = 25%. For the active phase 3, also factor
  // in the in-flight character count to make it visibly tick up as children land.
  let progress: number;
  if (activeIdx === -1) {
    progress = 100;
  } else {
    progress = activeIdx * 25;
    // Bonus for in-progress phase 3 (character generation)
    if (activeIdx === 2 && p.charactersExpected > 0) {
      progress += Math.min(25, Math.round((p.charactersDone / p.charactersExpected) * 25));
    }
  }

  return { phases: phasesWithState, progress };
}

const PhaseIcon: React.FC<{ state: PhaseState }> = ({ state }) => {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
  if (state === "active") return <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />;
  return <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />;
};

const GenerationProgress: React.FC<GenerationProgressProps> = (props) => {
  const { phases, progress } = computeState(props);
  const isMobile = props.isMobile;

  return (
    <Card className={cn("mb-6", isMobile && "mx-2")}>
      <CardContent className={cn("pt-6 space-y-6", isMobile && "pt-4 space-y-4")}>
        <div>
          <h2 className={cn("font-bold mb-1", isMobile ? "text-xl" : "text-2xl")}>
            We're building your mystery
          </h2>
          <p className={cn("text-muted-foreground", isMobile && "text-sm")}>
            This page updates automatically — feel free to leave it open or come back later.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{progress}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(2, progress)}%` }}
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
