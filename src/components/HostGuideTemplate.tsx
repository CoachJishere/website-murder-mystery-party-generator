import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import EditableSection from "./EditableSection";

// Most of the host guide content is identical across every mystery — slip-draw mechanics,
// preparation steps, time guidelines, etc. Only Game Overview, Materials (themed extras),
// and Hosting Tips (mystery-specific notes) genuinely vary. This component renders the
// static template with parameterized terminology (Detective/Investigator, Murderer/Culprit)
// and interpolated dynamic content.

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

function timeGuidelines(playerCount: number | null | undefined): string {
  const n = playerCount ?? 6;
  if (n <= 8) return "Approximately 1.5 hours total";
  if (n <= 14) return "Approximately 2 hours total";
  if (n <= 20) return "Approximately 2 to 2.5 hours total";
  return "Approximately 3 hours total";
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
  // Terminology adapts to mystery type.
  const isIntrigue = mysteryType === "intrigue";
  const Investigator = isIntrigue ? "Investigator" : "Detective";
  const investigator = isIntrigue ? "investigator" : "detective";
  const Culprit = isIntrigue ? "Culprit" : "Murderer";
  const culprit = isIntrigue ? "culprit" : "murderer";
  const crimeNoun = isIntrigue ? "incident" : "murder";
  const isCharacterBased = mysteryStyle === "character";

  // The static template content as one large markdown block.
  // This is intentionally not in i18n yet — keep simple for v1, translate later.
  const staticTemplate = `## Materials

**Universal items:**
- Character guides — already sent to each guest digitally before the party
- Printed evidence cards (or shown on a phone/screen — your choice)
- ${Investigator} script (${investigator} dialogue for each round, in the ${Investigator} Guide tab)
- Container for slips of paper (hat, bowl, decorative box)
- Slips of paper for ${culprit} selection${hasAccomplice ? " (and accomplice selection)" : ""}
- Timer or clock${isMobile ? "" : "\n- Optional: themed décor, music, food/drink"}

## Preparation Before the Party

**A few days before:**
- Read this entire host guide and the ${Investigator} Guide
- Send each guest their character page (digital link or PDF) at least 3 days before the event
- Encourage guests to read their character intro before arriving — they don't need to memorize, just be familiar
- Confirm guest list and finalize attendees

**Day of:**
- Prepare the slip draw: cut ${(playerCount ?? 7) + 0} small slips of paper. Write "${Culprit.toUpperCase()}" on one slip${hasAccomplice ? `, "ACCOMPLICE" on another` : ""}. Leave the rest blank (or write "Innocent"). Fold each so the writing isn't visible. Place them in your container.
- Print evidence cards (optional) — you can also just show them on a phone or read aloud
- Set the atmosphere if you want (themed music, dim lights, themed snacks) — none of this is required

## ${Investigator} Setup Choice

You have two ways to handle the ${investigator} narration:

**Option 1 — Host as ${Investigator}**
- You play the ${investigator} character throughout the game
- Read each round's ${investigator} script aloud as the action progresses
- ${isCharacterBased ? `In character-based mysteries, you do NOT participate as a suspect, so you can pre-decide the ${culprit} (skip the slip draw) or still use the slip draw for variety.` : `In detective-style mysteries, the ${culprit} is predetermined by the mystery — no slip draw needed.`}

**Option 2 — Audio ${Investigator}**
- You play one of the suspect characters (you participate in the mystery)
- Generate audio of the ${investigator} script using a free AI tool:
  - [Google AI Studio Speech](https://aistudio.google.com/generate-speech) — paste the script, generate TTS audio
  - [Google NotebookLM](https://notebooklm.google.com) — paste the script, use Audio Overview
  - Or any other TTS service (ElevenLabs, etc.)
- Skip the [bracketed stage directions] when generating audio
- Play each round's audio at the appropriate moment
- Have backup printed scripts ready in case of tech issues

## Time Guidelines

${timeGuidelines(playerCount)} (for ${playerCount ?? 6} players).

- **Welcome & character introductions:** 20–25 min${isCharacterBased ? `\n- **Slip draw (${culprit} selection):** 5 min` : ""}
- **Round 2 — Motives:** 20 min
- **Round 3 — Means:** 20 min
- **Round 4 — Opportunity:** 20 min
- **Accusations & final statements:** 15–20 min
- **The Reveal:** 10 min

Round timing scales with group size — smaller groups (4–6) move quickly, larger groups (12+) need more time per round.

## ${isCharacterBased ? `Determining the ${Culprit}` : "How the Mystery Works"}

${isCharacterBased
  ? `In this character-based mystery, the ${culprit} is selected **at random** after Round 1 — meaning anyone could be guilty. The game plays differently every time you run it.

After Round 1 introductions:
1. Tell the players to keep a blank face
2. Pass the slip container around — each player draws ONE slip in secret and reads it silently
3. Whoever drew "${Culprit.toUpperCase()}" is the ${culprit}${hasAccomplice ? `; whoever drew "ACCOMPLICE" is the accomplice` : ""}; everyone else is innocent
4. The ${culprit}${hasAccomplice ? " and accomplice" : ""} should now use their **Guilty${hasAccomplice ? " / Accomplice" : ""} script** sections from their character page. Innocent players use **Innocent** script sections.
5. Do NOT reveal who drew which slip
6. Continue to Round 2`
  : `The ${culprit} in this mystery is **predetermined** — you'll see who they are in the ${Investigator} Guide. Each character has both Innocent and Guilty script options on their character page; the ${culprit} uses the Guilty version and everyone else uses Innocent.

You can either:
- Privately tell the ${culprit} player their role before the party, OR
- Reveal it during the game when appropriate`}

## Round-by-Round Flow

Each round follows the same pattern:

1. **The ${Investigator}'s round opening is delivered** — read aloud by whoever is playing the ${investigator}, OR played as a pre-recorded audio file (whichever delivery method you chose). Found in the ${Investigator} Guide.
2. **Reveal evidence** for that round (Round 2 = motives, Round 3 = means, Round 4 = opportunity)
3. **Players ask each other questions** using their character page's question/response options for that round
4. **Keep pacing tight** — don't let one round drag. The host (regardless of whether they're playing the ${investigator} or a suspect) keeps time

After Round 4, the **Accusations** phase: each player names who they think is the ${culprit} and gives a one-sentence reason. Then **Final Statements**, where each player makes one last plea or confession. Finally, the **Reveal** — the ${culprit} stands and reads their confession aloud.

## Hosting Tips

- **Keep it moving.** If a round is dragging, summarize and prompt: "OK — based on what we've heard, who's looking suspicious?"
- **Read evidence neutrally.** Don't hint at who you think did it (even if you know).
- **Watch for quiet players.** Prompt them with a question if they haven't spoken in a round.
- **Watch for dominant players.** Gently redirect: "Let's hear from someone we haven't heard from."
- **The ${culprit} should NOT confess too early** — they should defend themselves until cornered. Encourage them to play it cool.
- **Improvise.** If a player asks something not in their script options, encourage in-character improvisation.
- **Have fun with atmosphere.** Music and a themed snack go a long way; nothing else is required.
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
