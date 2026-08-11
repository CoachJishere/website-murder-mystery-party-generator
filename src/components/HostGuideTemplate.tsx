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
  const staticTemplate = `## Host Quick-Start Checklist

Keep this open during the game — it's your at-a-glance control panel, especially if you're also playing the ${Investigator}.

- [ ] Everyone has their character page open (sent digitally before the party)
- [ ] You've read this guide and the ${Investigator} Guide, and skimmed every character's secret so you know who is hiding what
- [ ] Evidence cards ready (printed or on a screen), one per round
- [ ] ${isCharacterBased ? `Slips prepared for the ${culprit}${hasAccomplice ? "/accomplice" : ""} draw` : `You know who the ${culprit}${hasAccomplice ? " and accomplice are" : " is"} (see the ${Investigator} Guide)`}
- [ ] Keep the cast list (top of each player's guide) and the Game Overview within reach — you'll use them to pull the story back on track

**Round order at a glance:** Introductions → Round 2 (Motives) → Round 3 (Means) → Round 4 (Opportunity) → Accusations → Final Statements → The Reveal.

## Materials

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

**Fair-play rule for the ${culprit}${hasAccomplice ? " (and accomplice)" : ""}** — announce this to the group before Round 2: when giving their own account, the ${culprit} may mislead, spin, omit, and stick to their cover story — that's the game. But when another player asks them a direct question, they shouldn't invent brand-new lies on the spot: they deflect, answer selectively, or turn suspicion elsewhere. This keeps the mystery solvable — the evidence stays true, and your guests' job is deciding whose *story* to believe.

## Round-by-Round Flow

Each round follows the same pattern:

1. **The ${Investigator}'s round opening is delivered** — read aloud by whoever is playing the ${investigator}, OR played as a pre-recorded audio file (whichever delivery method you chose). Found in the ${Investigator} Guide.
2. **Reveal evidence** for that round (Round 2 = motives, Round 3 = means, Round 4 = opportunity)
3. **Players ask each other questions** using their character page's question/response options for that round
4. **Keep pacing tight** — don't let one round drag. The host (regardless of whether they're playing the ${investigator} or a suspect) keeps time

After Round 4 come **two distinct rounds** — say this out loud so players don't jump ahead:

1. **Accusations** — going around the group, each player accuses *someone else* and gives a one-sentence reason from the evidence. This round points **outward**: ask players to hold their own defense for now.
2. **Final Statements** — *after everyone has accused*, each player gets their turn to defend themselves${isCharacterBased ? ` and make one last plea. This round is still denial, not confession — even the ${culprit} sticks to their story here` : " and make one last plea or confession"}.

A nice way to run the accusations: gather everyone into one **big circle** so the whole group weighs in together. It builds pressure and keeps the conversation coherent as suspicion shifts around the room.

Finally, the **Reveal** — the ${Investigator} names the ${culprit}, who reads their confession aloud${hasAccomplice ? `. Then the ${Investigator} turns to the accomplice, who confesses too — and **both** are arrested` : ""}.

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
