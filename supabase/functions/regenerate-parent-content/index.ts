/**
 * Recovery endpoint for "characters generated correctly but parent host-content
 * drifted off-theme" failures. Re-runs the 4 host-facing Claude calls (game
 * overview, themed materials, detective script, evidence cards) using the
 * package's existing master_context as input. Updates mystery_packages with
 * the fresh content, leaving characters and master_context untouched.
 *
 * Triggered manually for now (via support workflow). Could later be wired up
 * automatically by extending the sweep to detect off-theme drift, but that
 * detection is fuzzy enough we'd rather keep it human-in-the-loop.
 *
 * POST { packageId: string, fields?: string[] } — fields defaults to all 4.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

const PROMPTS: Record<string, string> = {
  game_overview: `<role>
You are an expert mystery party game designer. Generate ONLY the Game Overview text — nothing else. Output PLAIN MARKDOWN, NOT JSON.
</role>

<master_context>
{{MASTER_CONTEXT}}
</master_context>

<output_instructions>
Output a single markdown document — the Game Overview for this mystery. NO JSON wrapper, NO field names, NO curly braces. Just the markdown content directly.

CRITICAL FIRST-LINE RULE: The very FIRST line of your output MUST be \`## Game Overview\`. Do NOT prepend a scene title, mystery name, atmospheric subtitle, or any other heading above it.

WRONG (do NOT do this):
  # The Final Performance
  ## Game Overview
  [body...]

RIGHT (do exactly this):
  ## Game Overview

  [body paragraph 1...]

  [body paragraph 2...]

Now generate, starting your output with \`## Game Overview\` on line 1, followed by the two paragraphs:

## Game Overview

[Paragraph 1: ~100 words. The crime that occurred — who, what, where, when, the stakes.]

[Paragraph 2: ~100 words. The cast at a high level (a few notable characters and their compelling motives) and the mechanic teaser. For character-based mysteries: "anyone could be guilty — the culprit is randomly selected at game time". For detective-style: "the culprit is hidden among you — solve before they confess".]

CRITICAL: First line must literally be \`## Game Overview\`. NO scene-title preamble. NO JSON.
</output_instructions>`,

  materials: `<role>
You are an expert mystery party game designer. Generate ONLY a SHORT bulleted list of theme-specific props for this mystery. Output PLAIN MARKDOWN, NOT JSON.
</role>

<master_context>
{{MASTER_CONTEXT}}
</master_context>

<output_instructions>
Output a SHORT bulleted list (5-8 items max, ~80 words total) of THEME-SPECIFIC props/atmosphere only. The platform's static template already covers universal items (character guides, slips, evidence cards). You only add things specific to THIS mystery's theme — e.g. "1920s jazz playlist", "feather boas", "champagne flutes". NO generic "printed materials, name tags".

Output format — JUST the bullets, no header, no JSON wrapper:

- Item 1: short description
- Item 2: short description
- Item 3: short description
- Item 4: short description
- Item 5: short description

CRITICAL: Output ONLY the bullets. NO JSON. NO field names. NO heading.
</output_instructions>`,

  detective_script: `<role>
You are an expert mystery party game designer. Generate ONLY the Detective Script — nothing else. Output PLAIN MARKDOWN, NOT JSON.
</role>

<master_context>
{{MASTER_CONTEXT}}
</master_context>

<game_parameters>
Title: {{TITLE}}
Player Count: {{PLAYER_COUNT}}
</game_parameters>

<output_instructions>
Output a single markdown document — the detective's spoken script for the host. NO JSON wrapper. Just markdown directly. Structure:

## DETECTIVE SCRIPT

## NOTE FOR HOST

These scripts can be delivered in two ways:

- **Read aloud by the host** (if the host is playing the detective character)
- **Pre-recorded as audio files** that are played during the game

## RECORDING GUIDELINES FOR AUDIO OPTION

- Record each section as a separate file
- Use a clear, dramatic voice appropriate for the mystery theme
- Include 2-3 second pauses between major points
- Suggested file names: opening.mp3, round1-intro.mp3, round2-intro.mp3, round3-intro.mp3, round4-intro.mp3, accusations.mp3, reveal.mp3
- Free audio creation tools: [Google AI Studio Generate Speech](https://aistudio.google.com/generate-speech) or [Google NotebookLM](https://notebooklm.google.com) Audio Overview
- When generating audio, skip the [bracketed stage directions]

---

## DETECTIVE BACKSTORY

[Write in THIRD PERSON. 1 short paragraph introducing the detective character — name, experience, connection to this case. ~60-80 words.]

---

## OPENING STATEMENT

*[Read this when guests are gathered, before Round 1.]*

[2-3 short paragraphs of in-character first-person dialogue establishing the crime, the stakes, and that everyone present is a suspect. ~120-180 words.]

*[Proceed immediately into Round 1 — there is no break here.]*

---

## ROUND 1: INTRODUCTIONS & RUMORS

*[Read immediately after the opening statement — flow straight in, no pause.]*

[1 paragraph of in-character first-person dialogue prompting introductions and rumor-sharing. ~80-120 words.]

*[The detective now steps back. Invite the guests to introduce themselves and trade rumors amongst one another, then reconvene for the next round.]*

---

## ROUND 2: MOTIVES

*[Read after the Round 2 evidence card is revealed.]*

[1-2 paragraphs of in-character first-person dialogue. Include a [Present Round 2 Evidence] cue mid-paragraph. ~120-180 words.]

*[The detective steps back. Let the guests question one another about motives using their round prompts, then reconvene.]*

---

## ROUND 3: METHOD

*[Read after the Round 3 evidence card is revealed.]*

[1-2 paragraphs. Include [Present Round 3 Evidence] cue. ~120-180 words.]

*[The detective steps back. Let the guests press one another on the method, then reconvene.]*

---

## ROUND 4: OPPORTUNITY

*[Read after the Round 4 evidence card is revealed.]*

[1-2 paragraphs. Include [Present Round 4 Evidence] cue. ~120-180 words.]

*[The detective steps back. Let the guests pin down alibis and opportunity, then reconvene for the accusations.]*

---

## ACCUSATIONS

*[Read after Round 4 discussion winds down.]*

[1 paragraph of in-character dialogue. The detective explicitly announces there are TWO rounds now: FIRST, everyone accuses — going around the group, each player accuses SOMEONE ELSE and gives one-sentence reasoning from the evidence, and should NOT defend themselves yet; THEN, after everyone has accused, each player gets their chance to defend themselves. Make this two-part structure explicit so players point outward rather than pre-emptively defending. ~100-140 words.]

*[Going around the group, each player in turn accuses another with one-sentence reasoning. Hold defenses for the next round. Tally the accusations.]*

---

## FINAL STATEMENTS

*[Read after every player has made their accusation.]*

[1 paragraph reminding players this is the second round: now, having heard who was accused, each player gets to defend themselves and make one last plea — or, if guilty, begin to crack. ~60-100 words.]

*[Each player, in turn, defends themselves and makes their final statement.]*

---

## THE REVEAL

*[After all final statements. Build the moment.]*

[2-3 short paragraphs announcing whether the room got it right, naming the actual murderer, and inviting them to confess. Reference the key evidence threads and deliver a clinching piece of evidence that pins them — while keeping the deduction fair to an attentive table. ~120-180 words.]

*[The murderer (player) reads their confession aloud.]*

[ACCOMPLICE BEAT — include this paragraph ONLY IF the master_context defines an accomplice. After the murderer's confession, the detective turns to the room — "But you did not act alone, did you?" — names the accomplice, and invites them to confess their part. ~60-100 words. If there is NO accomplice, omit this beat entirely.]

*[If there is an accomplice: the accomplice (player) reads their confession aloud.]*

[CLOSING: 1 short paragraph where the detective closes the scene. If there was an accomplice, the detective places BOTH the murderer and the accomplice under arrest and names both; otherwise, the murderer alone. ~60-100 words.]

CRITICAL: Output ONLY the markdown above with all bracketed sections filled in. NO JSON. Include the accomplice beat ONLY when the master_context defines an accomplice. Never instruct players to stand up or physically reposition themselves — assume a seated group throughout.
</output_instructions>`,

  evidence_cards: `<role>
You are an expert mystery party game designer. Generate ONLY the Evidence Cards — nothing else. Output PLAIN MARKDOWN, NOT JSON.
</role>

<master_context>
{{MASTER_CONTEXT}}
</master_context>

<game_parameters>
Title: {{TITLE}}
</game_parameters>

<output_instructions>
Output a single markdown document with EXACTLY THREE evidence cards (one per round: 2, 3, 4). NO JSON wrapper. Just markdown directly. Structure:

## EVIDENCE CARDS

*Display these one per round during the game. Each card pairs with one forensic image.*

## EVIDENCE: ROUND 2

### [Evidence Name — short, evocative]

#### DESCRIPTION
[2-3 sentences describing this single piece of evidence. ~30-50 words.]

#### SIGNIFICANCE (Host Only)
[1 sentence on why this implicates multiple characters.]

## EVIDENCE: ROUND 3

### [Evidence Name]

#### DESCRIPTION
[2-3 sentences, ~30-50 words.]

#### SIGNIFICANCE (Host Only)
[1 sentence.]

## EVIDENCE: ROUND 4

### [Evidence Name]

#### DESCRIPTION
[2-3 sentences, ~30-50 words.]

#### SIGNIFICANCE (Host Only)
[1 sentence.]

CRITICAL: ONE evidence card per round (3 total). Output ONLY the markdown — no JSON, no field names. Use the exact section headers shown.
</output_instructions>`,
};

// Field name in DB ↔ prompt key
const DB_COLUMN_OF: Record<string, string> = {
  game_overview: "game_overview",
  materials: "materials",
  detective_script: "detective_script",
  evidence_cards: "evidence_cards",
};

async function callClaude(prompt: string, apiKey: string, maxTokens: number): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No content in Anthropic response");
  return text.trim();
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const { packageId, fields } = await req.json();
    if (!packageId) {
      return new Response(JSON.stringify({ error: "packageId required" }), { status: 400 });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // Pull master_context, title, player_count from the package + conversation
    const { data: pkg, error: pkgErr } = await supabase
      .from("mystery_packages")
      .select("id, conversation_id, master_context, title")
      .eq("id", packageId)
      .single();
    if (pkgErr || !pkg) throw new Error(`Package not found: ${pkgErr?.message}`);
    if (!pkg.master_context) throw new Error("master_context is empty — cannot regenerate without it");

    const { data: conv } = await supabase
      .from("conversations")
      .select("player_count")
      .eq("id", pkg.conversation_id)
      .single();
    const playerCount = conv?.player_count || 8;
    const title = pkg.title || "Untitled Mystery";

    const masterContextStr = typeof pkg.master_context === "string"
      ? pkg.master_context
      : JSON.stringify(pkg.master_context);

    const targetFields: string[] = Array.isArray(fields) && fields.length > 0
      ? fields.filter((f) => f in PROMPTS)
      : Object.keys(PROMPTS);

    const results: { field: string; status: string; error?: string; preview?: string }[] = [];
    const updates: Record<string, string> = {};

    for (const field of targetFields) {
      try {
        const promptTemplate = PROMPTS[field];
        const filled = promptTemplate
          .replace("{{MASTER_CONTEXT}}", masterContextStr)
          .replace("{{TITLE}}", title)
          .replace("{{PLAYER_COUNT}}", String(playerCount));

        // detective_script needs ~3000 tokens, evidence_cards ~1500, others smaller
        const maxTokens = field === "detective_script" ? 3500 : field === "game_overview" ? 1500 : 2000;
        const text = await callClaude(filled, apiKey, maxTokens);
        updates[DB_COLUMN_OF[field]] = text;
        results.push({ field, status: "ok", preview: text.slice(0, 120) });
      } catch (e) {
        results.push({ field, status: "error", error: (e as Error).message });
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase
        .from("mystery_packages")
        .update(updates)
        .eq("id", packageId);
      if (upErr) throw new Error(`DB update failed: ${upErr.message}`);
    }

    return new Response(JSON.stringify({
      packageId,
      regenerated: Object.keys(updates),
      results,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
