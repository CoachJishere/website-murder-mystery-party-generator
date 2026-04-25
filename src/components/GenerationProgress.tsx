import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Phased progress display for in-flight mystery generation. Phases map to the
// `generation_status.progress` markers set by the parent Make.com scenario:
//   0–20% : "Setting up"
//  20–60% : "Building world" (master context + host guide content)
//  60–90% : "Creating characters" — the longest phase; we show a live count here
//  90–100%: "Final touches" (evidence cards + detective script + images)

type PhaseState = "done" | "active" | "pending";

interface Phase {
  key: string;
  label: string;
  description?: string;
  state: PhaseState;
}

interface GenerationProgressProps {
  progress: number;             // 0-100, from generation_status.progress
  charactersDone: number;       // count of mystery_characters rows for this package
  charactersExpected: number;   // total expected (from extracted_characters length, or player_count fallback)
  isMobile?: boolean;
}

function computePhases(progress: number, charactersDone: number, charactersExpected: number): Phase[] {
  // The active phase is the one currently in progress — anything before it is done.
  const phases: Omit<Phase, "state">[] = [
    { key: "setup", label: "Story foundation set", description: "Crime, setting, and stakes locked in" },
    { key: "world", label: "World and host guide", description: "Game overview, materials, hosting flow" },
    {
      key: "characters",
      label: charactersExpected > 0
        ? `Creating characters (${charactersDone} of ${charactersExpected} ready)`
        : "Creating characters",
      description: "Each guest's secrets, motives, and round scripts",
    },
    { key: "evidence", label: "Evidence and detective script", description: "Round-by-round clues, narrator dialogue, and images" },
  ];

  // Map progress thresholds → active phase index.
  // 0-20: phase 0 active. 20-60: phase 1 active. 60-90: phase 2 active. 90-100: phase 3 active.
  let activeIdx: number;
  if (progress < 20) activeIdx = 0;
  else if (progress < 60) activeIdx = 1;
  else if (progress < 90) activeIdx = 2;
  else activeIdx = 3;

  return phases.map((p, i) => ({
    ...p,
    state: i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
  }));
}

const PhaseIcon: React.FC<{ state: PhaseState }> = ({ state }) => {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
  if (state === "active") return <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />;
  return <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />;
};

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  charactersDone,
  charactersExpected,
  isMobile,
}) => {
  const phases = computePhases(progress, charactersDone, charactersExpected);

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

        {/* Overall progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{progress}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
        </div>

        {/* Phase list */}
        <ul className="space-y-3">
          {phases.map((phase) => (
            <li key={phase.key} className="flex items-start gap-3">
              <PhaseIcon state={phase.state} />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium",
                  phase.state === "done" && "text-foreground",
                  phase.state === "active" && "text-foreground",
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
