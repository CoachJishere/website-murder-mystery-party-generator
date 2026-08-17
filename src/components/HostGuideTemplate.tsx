import React from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import EditableSection from "./EditableSection";

// Most of the host guide content is identical across every mystery — slip-draw mechanics,
// preparation steps, time guidelines, etc. Only Game Overview, Materials (themed extras),
// and Hosting Tips (mystery-specific notes) genuinely vary. This component renders the
// static template with parameterized terminology (Detective/Investigator, Murderer/Culprit)
// and interpolated dynamic content.
//
// Localized via i18next (ADR-0090). Terminology- and branch-dependent sentences use full
// sentence-per-variant keys rather than word-splicing, selected by appending a context
// suffix built from mysteryType (`murder`/`intrigue`) and, where relevant, `_accomplice` —
// e.g. `hostGuide.checklist.item2_murder`. This keeps every language grammatically natural
// instead of interpolating a translated noun into a templated sentence (see ADR-0090
// Discussion for why interpolation-only was rejected).

interface HostGuideTemplateProps {
  mysteryType?: string | null;        // 'murder' | 'intrigue'
  mysteryStyle?: string | null;       // 'detective' | 'character'
  hasAccomplice?: boolean | null;
  playerCount?: number | null;
  // Dynamic content fields (optional — fall back gracefully if missing)
  gameOverview?: string | null;
  materials?: string | null;
  hostingTips?: string | null;
  // Editing
  onPackageFieldUpdate?: (fieldName: string, value: string) => Promise<void>;
  isMobile?: boolean;
}

function timeGuidelineKey(playerCount: number | null | undefined): string {
  const n = playerCount ?? 6;
  if (n <= 8) return "timeShort";
  if (n <= 14) return "timeMedium";
  if (n <= 20) return "timeLong";
  return "timeXlong";
}

// ~45 sec/player is enough for a name, role, and one line about the victim —
// the pace hosts need to hold at scale (see the large-group callout in Round 1 Part A).
function introMinutes(playerCount: number | null | undefined): number {
  return Math.round((playerCount ?? 6) * 0.75);
}

const HostGuideTemplate: React.FC<HostGuideTemplateProps> = ({
  mysteryType,
  mysteryStyle,
  hasAccomplice,
  playerCount,
  gameOverview,
  materials,
  hostingTips,
  onPackageFieldUpdate,
  isMobile,
}) => {
  const { t } = useTranslation();

  // Terminology adapts to mystery type. `ctx`/`actx` select the right full-sentence
  // translation variant (ADR-0090) — ctx for sentences that only depend on
  // murder-vs-intrigue terminology, actx for sentences that also branch on whether
  // there's an accomplice.
  const isIntrigue = mysteryType === "intrigue";
  const ctx = isIntrigue ? "intrigue" : "murder";
  const actx = hasAccomplice ? `${ctx}_accomplice` : ctx;
  const isCharacterBased = mysteryStyle === "character";
  const introTime = introMinutes(playerCount);
  const players = playerCount ?? 6;
  const slipCount = playerCount ?? 7;

  const tt = (key: string) => t(`hostGuide.${key}`);

  // The static template content as one large markdown block, assembled from
  // translated per-section/per-variant keys.
  const staticTemplate = `## ${tt("checklist.heading")}

${tt(`checklist.intro_${ctx}`)}

- [ ] ${tt("checklist.item1")}
- [ ] ${tt(`checklist.item2_${ctx}`)}
- [ ] ${tt("checklist.item3")}
- [ ] ${isCharacterBased ? tt(`checklist.item4SlipDraw_${actx}`) : tt(`checklist.item4Predetermined_${actx}`)}
- [ ] ${tt("checklist.item5")}

${tt("checklist.roundOrderNote")}

## ${tt("materials.heading")}

${tt("materials.universalLabel")}
- ${tt("materials.item1")}
- ${tt("materials.item2")}
- ${tt(`materials.item3_${ctx}`)}
- ${tt("materials.item4")}${isMobile ? "" : `\n- ${tt("materials.item5")}`}
${isCharacterBased ? `
${tt("materials.slipDrawLabel")}
- ${tt("materials.slipDrawItem1")}
- ${tt(`materials.slipDrawItem2_${actx}`)}` : ""}

## ${tt("prep.heading")}

${tt("prep.beforeLabel")}
- ${tt(`prep.item1_${ctx}`)}
- ${tt("prep.item2")}
- ${tt("prep.item3")}
- ${tt("prep.item4")}

${tt("prep.dayOfLabel")}
${isCharacterBased ? `- ${t(`hostGuide.prep.slipDrawSetup_${actx}`, { playerCount: slipCount })}
` : ""}- ${tt("prep.item5")}
- ${tt("prep.item6")}

## ${tt("guestChanges.heading")}

${tt("guestChanges.intro")}

${tt("guestChanges.moreLabel")}
- ${tt(`guestChanges.moreItem1_${ctx}`)}
- ${tt("guestChanges.moreItem2")}
- ${tt(`guestChanges.moreItem3_${ctx}`)}

${tt("guestChanges.fewerLabel")}
- ${tt(`guestChanges.fewerItem1_${actx}`)}
- ${tt(`guestChanges.fewerItem2_${ctx}`)}
- ${tt("guestChanges.fewerItem3")}

## ${tt(`setupChoice.heading_${ctx}`)}

${tt(`setupChoice.intro_${ctx}`)}

${tt(`setupChoice.option1Label_${ctx}`)}
- ${tt(`setupChoice.option1Item1_${ctx}`)}
- ${tt(`setupChoice.option1Item2_${ctx}`)}
- ${isCharacterBased ? tt(`setupChoice.option1NoteCharacterBased_${ctx}`) : tt(`setupChoice.option1NoteDetective_${ctx}`)}

${tt(`setupChoice.option2Label_${ctx}`)}
- ${tt("setupChoice.option2Item1")}
- ${tt(`setupChoice.option2Item2_${ctx}`)}
  - ${tt("setupChoice.ttsOption1")}
  - ${tt("setupChoice.ttsOption2")}
  - ${tt("setupChoice.ttsOption3")}
- ${tt("setupChoice.option2Item3")}
- ${tt("setupChoice.option2Item4")}
- ${tt("setupChoice.option2Item5")}

## ${tt("runningGame.heading")}

${t(`hostGuide.runningGame.intro`, { timeEstimate: tt(`runningGame.${timeGuidelineKey(playerCount)}`), playerCount: players })}

1. **${tt("runningGame.step1Label")}**

   ${tt(`runningGame.step1Body_${ctx}`)}

2. **${t("hostGuide.runningGame.step2Label", { introTime, playerCount: players })}**

   ${tt("runningGame.step2Body")}

   ${tt("runningGame.step2LargeGroupNote")}

3. **${tt("runningGame.step3Label")}**

   ${tt("runningGame.step3Body")}

${isCharacterBased ? `4. **${tt(`runningGame.step4SlipDrawLabel_${ctx}`)}**

   1. ${tt("runningGame.step4SlipDrawItem1")}
   2. ${tt("runningGame.step4SlipDrawItem2")}
   3. ${tt(`runningGame.step4SlipDrawItem3_${actx}`)}
   4. ${tt(`runningGame.step4SlipDrawItem4_${actx}`)}
   5. ${tt("runningGame.step4SlipDrawItem5")}
   6. ${tt("runningGame.step4SlipDrawItem6")}
` : `4. **${tt(`runningGame.step4PredeterminedLabel_${ctx}`)}**

   ${tt(`runningGame.step4PredeterminedBody_${ctx}`)}
`}
${tt(`runningGame.beforeRound2Note_${ctx}`)}

5. **${tt("runningGame.step5Label")}**

   - ${tt(`runningGame.step5Item1_${ctx}`)}
   - ${tt("runningGame.step5Item2")}
   - ${tt(`runningGame.step5Item3_${ctx}`)}

6. **${tt("runningGame.step6Label")}**

   ${tt("runningGame.step6Body")}

7. **${tt("runningGame.step7Label")}**

   ${tt("runningGame.step7Body")}

8. **${tt("runningGame.step8Label")}**

   ${tt("runningGame.step8Body")}

9. **${tt("runningGame.step9Label")}**

   ${isCharacterBased ? tt(`runningGame.step9BodyCharacterBased_${ctx}`) : tt("runningGame.step9BodyDetective")}

10. **${tt("runningGame.step10Label")}**

    ${tt(`runningGame.step10Body_${actx}`)}

## ${tt("keepingOnTrack.heading")}

${tt("keepingOnTrack.intro")}

${tt(`keepingOnTrack.tool_${ctx}`)}
- ${tt("keepingOnTrack.example1")}
- ${tt("keepingOnTrack.example2")}
- ${tt("keepingOnTrack.example3")}

${tt("keepingOnTrack.closing")}

## ${tt("tips.heading")}

- ${tt("tips.tip1")}
- ${tt("tips.tip2")}
- ${tt("tips.tip3")}
- ${tt("tips.tip4")}
- ${isCharacterBased ? tt(`tips.tip5CharacterBased_${ctx}`) : tt(`tips.tip5Detective_${ctx}`)}
- ${tt("tips.tip6")}
- ${tt("tips.tip7")}
- ${tt("tips.tip8")}
- ${tt("tips.tip9")}
`;

  return (
    <div className="space-y-6">
      {gameOverview && (
        <EditableSection
          content={gameOverview}
          onSave={(val) => onPackageFieldUpdate?.("game_overview", val) ?? Promise.resolve()}
          canEdit={!!onPackageFieldUpdate}
          sectionLabel="Game Overview"
          isMobile={isMobile}
        />
      )}

      {/* Static universal template — no editing needed, identical across all mysteries */}
      <div className={cn("prose max-w-none overflow-x-auto", isMobile && "prose-sm")}>
        <ReactMarkdown>{staticTemplate}</ReactMarkdown>
      </div>

      {/* Mystery-specific themed material additions (if any) — appears as a separate section */}
      {materials && (
        <div>
          <h3 className={cn("font-semibold mb-3", isMobile ? "text-base" : "text-lg")}>
            Theme-Specific Props (Optional)
          </h3>
          <EditableSection
            content={materials}
            onSave={(val) => onPackageFieldUpdate?.("materials", val) ?? Promise.resolve()}
            canEdit={!!onPackageFieldUpdate}
            sectionLabel=""
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Dynamic mysteryTips removed — the static template's "Hosting Tips" section
          covers general advice well; per-mystery tips were noisy and unformatted. */}
    </div>
  );
};

export default HostGuideTemplate;
