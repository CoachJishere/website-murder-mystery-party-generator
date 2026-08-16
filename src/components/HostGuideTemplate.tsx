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
  // Terminology adapts to mystery type.
  const isIntrigue = mysteryType === "intrigue";
  const Investigator = isIntrigue ? "Investigator" : "Detective";
  const investigator = isIntrigue ? "investigator" : "detective";
  const Culprit = isIntrigue ? "Culprit" : "Murderer";
  const culprit = isIntrigue ? "culprit" : "murderer";
  const crimeNoun = isIntrigue ? "incident" : "murder";
  const isCharacterBased = mysteryStyle === "character";
  const introTime = introMinutes(playerCount);

  // The static template content as one large markdown block.
  // This is intentionally not in i18n yet — keep simple for v1, translate later.
  const staticTemplate = `## Host Quick-Start Checklist

Keep this open during the game — it's your at-a-glance control panel, especially if you're also playing the ${Investigator}.

- [ ] Everyone has their character page open (sent digitally before the party)
- [ ] You've read this guide and the ${Investigator} Guide, and skimmed every character's secret so you know who is hiding what
- [ ] Evidence cards ready (printed or on a screen), one per round
- [ ] ${isCharacterBased ? `Slips prepared for the ${culprit}${hasAccomplice ? "/accomplice" : ""} draw` : `You know who the ${culprit}${hasAccomplice ? " and accomplice are" : " is"} (see the ${Investigator} Guide)`}
- [ ] Keep the suspect list (top of each player's guide) and the Game Overview within reach — you'll use them to pull the story back on track

**Round order at a glance:** see "Running the Game" below for the full step-by-step.

## Materials

**Universal items:**
- Character guides — already sent to each guest digitally before the party
- Printed evidence cards (or shown on a phone/screen — your choice)
- ${Investigator} script (${investigator} dialogue for each round, in the ${Investigator} Guide tab)
- Timer or clock${isMobile ? "" : "\n- Optional: themed décor, music, food/drink"}
${isCharacterBased ? `
**For the slip draw:**
- Container for slips of paper (hat, bowl, decorative box)
- Slips of paper for ${culprit} selection${hasAccomplice ? " (and accomplice selection)" : ""}` : ""}

## Preparation Before the Party

**A few days before:**
- Read this entire host guide and the ${Investigator} Guide
- Send each guest their character page (digital link or PDF) at least 3 days before the event
- Encourage guests to read their character intro before arriving — they don't need to memorize, just be familiar
- Confirm guest list and finalize attendees

**Day of:**
${isCharacterBased ? `- Prepare the slip draw: cut ${(playerCount ?? 7) + 0} small slips of paper. Write "${Culprit.toUpperCase()}" on one slip${hasAccomplice ? `, "ACCOMPLICE" on another` : ""}. Leave the rest blank (or write "Innocent"). Fold each so the writing isn't visible. Place them in your container.
` : ""}- Print evidence cards (optional) — you can also just show them on a phone or read aloud
- Set the atmosphere if you want (themed music, dim lights, themed snacks) — none of this is required

## Managing Last-Minute Guest Changes

Your cast of suspects is fixed — it's woven into the plot, so you can't add or remove suspect characters. But real guest lists change, and the game is built to absorb that.

**More guests than characters (someone extra wants to join):**
- Bring them in as **co-investigators** on the ${Investigator}'s team — no character page needed. As many as you like.
- They question the suspects each round, work the clues and evidence alongside everyone else, and make their case at the accusation stage.
- **Important:** co-investigators do NOT get the ${Investigator} script or this host guide — those are your case file and they name the ${culprit}. Keep them to yourself. Your co-investigators solve it fair and square from the clues, exactly like the suspects do.

**Fewer guests than characters (someone drops out):**
- Never cut the ${culprit}${hasAccomplice ? " or the accomplice" : ""} — the plot depends on them being in play.
- To drop a suspect, pick a purely innocent character. Either fold their key facts into another guest's briefing, or have the ${Investigator} mention them as "unavailable for questioning" so their clues still surface.
- If several guests drop out, consider regenerating the mystery at the new headcount for the cleanest fit.

## ${Investigator} Setup Choice

You have two ways to handle the ${investigator} narration:

**Option 1 — Host as ${Investigator}**
- You play the ${investigator} character throughout the game
- Read each round's ${investigator} script aloud as the action progresses
- ${isCharacterBased ? `In character-based mysteries, you do NOT participate as a suspect, so you can pre-decide the ${culprit} (skip the slip draw) or still use the slip draw for variety.` : `In detective-style mysteries, the ${culprit} is predetermined — you'll see who they are in the ${Investigator} Guide. Decide before the party whether to tell that player privately or let it reveal itself during the game.`}

**Option 2 — Audio ${Investigator}**
- You play one of the suspect characters (you participate in the mystery)
- Generate audio of the ${investigator} script using a free AI tool:
  - [Google AI Studio Speech](https://aistudio.google.com/generate-speech) — paste the script, generate TTS audio
  - [Google NotebookLM](https://notebooklm.google.com) — paste the script, use Audio Overview
  - Or any other TTS service (ElevenLabs, etc.)
- Skip the [bracketed stage directions] when generating audio
- Play each round's audio at the appropriate moment
- Have backup printed scripts ready in case of tech issues

## Running the Game

${timeGuidelines(playerCount)} (for ${playerCount ?? 6} players). Follow this section straight through, in order, once your guests are gathered — it's the actual script for the night. Everything above is what you prepare beforehand; this is what you do once it starts.

1. **Opening Statement** — 2–3 min

   Deliver the ${Investigator}'s Opening Statement: read it aloud, or play the pre-recorded audio (whichever you chose above). Found in the ${Investigator} Guide.

2. **Round 1, Part A — Introductions** — ~${introTime} min for your group of ${playerCount ?? 6} (roughly 45 sec/player)

   Going around the group, each player reads or improvises their character's introduction.

   **For larger groups (15+), ask players to keep it to 2–3 sentences** — name, role, one line about the victim — rather than reading the full page. At 1 minute each, 30 guests is a 30-minute round on its own.

3. **Round 1, Part B — Rumors** — 10 min

   Right after introductions, no break: each player shares their rumor(s) from their character page with the rest of the group. Everyone should hear at least one rumor before you move on.

${isCharacterBased ? `4. **Slip Draw — Determining the ${Culprit}** — 5 min

   1. Tell the players to keep a blank face
   2. Pass the slip container around — each player draws ONE slip in secret and reads it silently
   3. Whoever drew "${Culprit.toUpperCase()}" is the ${culprit}${hasAccomplice ? `; whoever drew "ACCOMPLICE" is the accomplice` : ""}; everyone else is innocent
   4. The ${culprit}${hasAccomplice ? " and accomplice" : ""} should now use their **Guilty${hasAccomplice ? " / Accomplice" : ""}** script sections; everyone else uses **Innocent**
   5. Do NOT reveal who drew which slip
   6. Continue to Round 2
` : `4. **The ${Culprit} Is Already Set** — no action needed here

   Detective-style mysteries skip the slip draw entirely. The ${culprit} is predetermined; see the ${Investigator} Guide for who. Continue straight to Round 2.
`}
**Announce this before Round 2:** when giving their own account, the ${culprit} may mislead, spin, omit, and stick to their cover story — that's the game. But when another player asks them a direct question, they shouldn't invent brand-new lies on the spot: they deflect, answer selectively, or turn suspicion elsewhere. This keeps the mystery solvable — the evidence stays true, and your guests' job is deciding whose *story* to believe.

5. **Round 2 — Motives** — 20 min

   - The ${Investigator} narrates the round — read aloud, or play the audio
   - Partway through, watch for a bracketed cue like *[Present Round 2 Evidence]* — that's your signal to reveal the card. Not before the round starts, not right after the opening: exactly at that cue
   - Once the ${investigator} steps back, players question each other using their Round 2 options

6. **Round 3 — Method** — 20 min

   Same pattern as Round 2: narration → evidence cue → questions.

7. **Round 4 — Opportunity** — 20 min

   Same pattern again.

8. **Accusations** — 10 min

   Going around the group, each player accuses *someone else* with one sentence of reasoning. Point outward — save your own defense for the next step. A big circle works well here — it builds pressure and keeps the room coherent.

9. **Final Statements** — 10 min

   Going around again, each player defends themselves${isCharacterBased ? `. Still denial, not confession — even the ${culprit} sticks to their story here` : " and make one last plea or confession"}.

10. **The Reveal** — 5–10 min

    The ${Investigator} names the ${culprit}, who reads their confession aloud${hasAccomplice ? `. Then the ${Investigator} turns to the accomplice, who confesses too — and **both** are arrested` : ""}.

## Keeping the Story on Track

Players will improvise, add their own flair, and sometimes wander off-script — **this is normal and it's fine.** A little chaos is part of the fun, and you don't need to correct every departure. Only step in when the thread is genuinely lost.

When it drifts, the ${Investigator} is your tool for pulling it back. Because the ${investigator} is suspicious of everyone, you can always cut in with a pointed question:
- "Wait — a moment ago you said you were in the parlor. How does that square with what we just heard?"
- "That's curious. Earlier you told us something different. Which is it?"
- "Let's come back to the facts. [Name], where exactly were you when it happened?"

Keep the Game Overview and each character's secret handy (you skimmed them in the checklist) so you can always re-anchor the group in what's actually true.

## Hosting Tips

- **Keep it moving.** If a round is dragging, summarize and prompt: "OK — based on what we've heard, who's looking suspicious?"
- **Read evidence neutrally.** Don't hint at who you think did it (even if you know).
- **Watch for quiet players.** Prompt them with a question if they haven't spoken in a round.
- **Watch for dominant players.** Gently redirect: "Let's hear from someone we haven't heard from."
- **The ${culprit} should NOT confess too early**${isCharacterBased ? ` — their Final Statement is a denial like everyone else's. The real confession only comes if the ${investigator} specifically names them during the Reveal — that's a separate, later section on their character page ("The Reveal — Your Confession"). Encourage them to play it cool through Final Statements.` : " — they should defend themselves until cornered. Encourage them to play it cool."}
- **Everyone protects their secret.** Each character has a secret with real consequences if it gets out. Remind players to guard it — a player who shrugs off their secret drains the tension for everyone. Defending your reputation is half the game.
- **Let the group move.** Small clusters of conversation and one big circle for the accusations both work well — don't force everyone to stay in one seated formation the whole time.
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
