import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type Locale = 'en' | 'es' | 'fr' | 'de' | 'ko' | 'ja' | 'zh-cn' | 'nl' | 'da' | 'sv' | 'fi' | 'it' | 'pt';

function detectLocale(firstUserMsg: string): Locale {
  if (/[가-힣]/.test(firstUserMsg)) return 'ko';
  if (/[ひらがなカタカナ一-龯]/.test(firstUserMsg)) return 'ja';
  if (/[一-龯]/.test(firstUserMsg)) return 'zh-cn';
  if (/[ñáéíóúü¿¡]/.test(firstUserMsg)) return 'es';
  if (/[àâäéèêëïîôöùûüÿç]/.test(firstUserMsg)) return 'fr';
  if (/[äöüß]/.test(firstUserMsg)) return 'de';
  if (/[àèéìíîòóù]/.test(firstUserMsg)) return 'it';
  if (/[ãõáàâéêíóôúç]/.test(firstUserMsg)) return 'pt';
  if (/[æøåäöü]/.test(firstUserMsg)) {
    if (/[æø]/.test(firstUserMsg)) return 'da';
    if (/[ä]/.test(firstUserMsg)) return 'sv';
    return 'nl';
  }
  return 'en';
}

async function buildLabels(locale: Locale) {
  try {
    // Fetch from your deployed website
    const response = await fetch(`https://mysterymaker.party/locales/${locale}.json`);
    if (!response.ok) throw new Error('Failed to fetch locale');
    
    const localeData = await response.json();
    const sec = localeData.mysteryCreation.sections;
    return {
      premise: sec.premise,
      victim: sec.victim,
      characterList: sec.characterList,
      playersWord: sec.players,
      murderMethod: sec.murderMethod,
    };
  } catch (error) {
    console.error(`Failed to load locale ${locale}, falling back to English`);
    // Fallback to hardcoded English
    return {
      premise: 'PREMISE',
      victim: 'VICTIM',
      characterList: 'CHARACTER LIST',
      playersWord: 'PLAYERS',
      murderMethod: 'MURDER METHOD',
    };
  }
}

// CORS: restrict to production domains
const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Rate limiting: 10 requests per minute per user (in-memory, resets on cold start)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // Auth check: require Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: responseHeaders
    });
  }

  // Rate limiting per auth token
  const now = Date.now();
  const timestamps = (rateLimitMap.get(authHeader) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429, headers: responseHeaders
    });
  }
  timestamps.push(now);
  rateLimitMap.set(authHeader, timestamps);

  try {
    const requestBody = await req.json();
    const { messages, system, promptVersion } = requestBody;

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Input validation: cap individual message length
    for (const msg of messages) {
      if (msg.content && msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: 'Message too long' }), {
          status: 400, headers: responseHeaders
        });
      }
    }

    console.log(`Processing ${messages.length} messages`);
    
    // Get the Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Get database prompt from environment secrets
    let databasePrompt = Deno.env.get('MYSTERY_FREE_PROMPT');

    // Content boundaries to prevent the AI from generating game-ready content in free chat.
    // Users can freely design character concepts, motives, relationships, and story elements.
    // But scripts, clue cards, host guides, and playable materials are reserved for the paid package.
    const contentBoundaries = `

<content_boundaries>
CRITICAL RULES - You are a mystery CONCEPT designer. You help users craft the perfect mystery concept: characters, motives, relationships, premise, murder method, themes, and tone. Users can go as deep as they want on character concepts — detailed personalities, backstories, motives, relationships, name customization, costume ideas.

You must NEVER generate any of the following game-ready content:
- Character scripts, dialogue lines, or introduction speeches
- Multiple character versions (innocent/guilty/accomplice scripts)
- Investigation scripts or "when investigating" instructions
- Clue card text or evidence card content
- Host guide content or round-by-round game instructions
- Solution reveal scripts or whodunit reveal structure
- Any formatted content that could be printed and played directly

If a user asks for scripts, character guides, clue cards, or playable game content, redirect warmly. For example: "I can absolutely help you refine [character]'s concept further — their personality, motives, and relationships. The actual character scripts, printable clue cards, and host guide are created as part of the full mystery package. Let's keep perfecting the concept so your package is exactly what you want!"

After presenting or refining the mystery concept, mention what the package includes: "Once you're happy with your mystery concept, hit 'Generate Mystery' to create your complete package — including individual character scripts for each player, printable evidence cards, a host guide with round-by-round instructions, and everything you need to run your event."
</content_boundaries>

<format_guidance>
The mystery package produces a ROUND-BASED PARTY GAME where players question each other across 3-4 rounds, revealing secrets and clues. Keep these in mind when shaping concepts:

- The victim is not a playable character. If a user wants rich victim backstory, encourage it — that backstory will come alive through what other characters reveal about the victim during rounds.
- If a user wants flashbacks or theatrical scenes, channel that energy into the round structure: "Each round is like peeling back a layer — characters reveal what they saw, what they know, and what they're hiding. The drama builds naturally through accusations and confessions."
- Each player gets their own character script telling them what to reveal and when. The format is social deduction and interrogation, not a staged performance.
- An Inspector/Detective character guides the rounds — this is the HOST's role, NOT a player character. The Inspector/Detective must NEVER appear in the character list. All characters in the list must be suspects with motives and secrets, not investigators.

You don't need to explain the format unprompted. Only clarify if the user is designing something that clearly expects a different format (e.g., asking for a narrator, scene blocking, or the victim as a player).
</format_guidance>

<!-- DETECTIVE SCRIPT FORMAT SPEC (for Make.com prompt alignment)
  The detective_script field generated by Make.com must use this structure:

  ## Round N: [Round Title]

  ### Script
  Full narrative dialogue the host reads aloud as the detective/inspector.
  Written in first person, theatrical, ready to be read verbatim or recorded
  by an AI voice.

  ### Key Points
  - Bullet-point summary of what happens in this round
  - Key reveals, actions the host takes, timing guidance
  - For hosts who prefer to improvise from notes

  Both "### Script" and "### Key Points" sub-sections are mandatory for every round.
-->`;

    // Determine system prompt based on conversation state
    let systemPrompt = system;

    if (!systemPrompt) {

      const conversationText = messages.map(msg => msg.content || '').join(' ');
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
      const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
      const detectedLocale = detectLocale(firstUserMessage);
      const labels = await buildLabels(detectedLocale);

      // --- Check if a mystery concept has already been presented ---
      const conceptAlreadyGenerated = messages.some(msg =>
        msg.role === 'assistant' &&
        msg.content &&
        msg.content.length > 500 &&
        (msg.content.match(/##\s/g) || []).length >= 3
      );

      // --- Detect player count in conversation ---
      // Explicit: "8 players", "for 12 people", "10 of us"
      const hasExplicitPlayerCount =
        /\b([4-9]|[12][0-9]|3[0-2])\s*(players?|people|guests?|folks|friends?|명|人|joueurs?|Spieler|jugadores|giocatori|spelers|spillere|spelare|pelaajaa?|jogadores?)\b/i.test(conversationText) ||
        /\bfor\s+([4-9]|[12][0-9]|3[0-2])\b/i.test(conversationText) ||
        /\b([4-9]|[12][0-9]|3[0-2])\s+(of us|of them)\b/i.test(conversationText);

      // Standalone number response after AI asked about player count
      const aiAskedAboutPlayers = messages.some(msg =>
        msg.role === 'assistant' && msg.content &&
        /how many (players?|people|guests?)/i.test(msg.content)
      );
      const standaloneNumberMatch = lastUserMessage.trim().match(/^(\d+)$/);
      const hasStandaloneResponse = aiAskedAboutPlayers && standaloneNumberMatch &&
        parseInt(standaloneNumberMatch[1]) >= 4 && parseInt(standaloneNumberMatch[1]) <= 32;

      const hasPlayerCount = hasExplicitPlayerCount || hasStandaloneResponse;

      // Check for invalid player count (user responded to AI's question with out-of-range number)
      const hasInvalidPlayerCount = aiAskedAboutPlayers && standaloneNumberMatch &&
        (parseInt(standaloneNumberMatch[1]) < 4 || parseInt(standaloneNumberMatch[1]) > 32);

      // Extract player count number for use in prompts
      const playerCountMatch = conversationText.match(/\b([4-9]|[12][0-9]|3[0-2])\s*(players?|people|guests?|folks|friends?|명|人|joueurs?|Spieler|jugadores|giocatori|spelers|spillere|spelare|pelaajaa?|jogadores?)\b/i) ||
        conversationText.match(/\bfor\s+([4-9]|[12][0-9]|3[0-2])\b/i);
      const playerCount = playerCountMatch ? playerCountMatch[1] :
        (hasStandaloneResponse ? standaloneNumberMatch![1] : "6");

      // Helper: apply labels to database prompt
      const applyDatabasePrompt = () => {
        return databasePrompt!
          .replace(/\{\{labels\.premise\}\}/g, labels.premise)
          .replace(/\{\{labels\.victim\}\}/g, labels.victim)
          .replace(/\{\{labels\.characterList\}\}/g, labels.characterList)
          .replace(/\{\{labels\.playersWord\}\}/g, labels.playersWord)
          .replace(/\{\{labels\.murderMethod\}\}/g, labels.murderMethod)
          + contentBoundaries;
      };

      if (conceptAlreadyGenerated) {
        // === POST-CONCEPT: Refinement mode ===

        if (databasePrompt) {
          systemPrompt = applyDatabasePrompt();
        } else {
          systemPrompt = `You are a murder mystery CONCEPT designer helping refine a mystery.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>

Continue helping the user adjust characters, motives, relationships, backstories, and story elements. They can go as deep as they want on character concepts.

After any changes, present the updated concept and ask if they'd like to adjust anything else. Remind them they can hit 'Generate Mystery' when satisfied to create their complete package — including individual character scripts, printable evidence cards, a host guide, and everything needed to run their event.

${contentBoundaries}`;
        }

      } else if (hasInvalidPlayerCount) {
        // === INVALID PLAYER COUNT ===
        const invalidNumber = standaloneNumberMatch![1];
        systemPrompt = `The user provided ${invalidNumber} players. Politely let them know the range is 4 to 32 players and ask them to pick a number in that range.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>`;

      } else if (!hasPlayerCount) {
        // === PRE-CONCEPT: Need player count ===

        systemPrompt = `You are an enthusiastic, creative murder mystery concept designer.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>

Your job is to react to their idea, ask how many players they need (between 4 and 32), and decide whether you need ONE clarifying question before you can design their mystery.

<clarifying_question_decision>
Ask yourself: "Does this theme evoke a specific enough world that I can picture the setting, era, and vibe — or could it go 10 very different directions?"

ASK a clarifying question when the theme is a broad category that leaves the world ambiguous:
- "restaurants" → What kind? Fine dining, greasy diner, sushi bar, medieval tavern?
- "school" → High school prom, university lecture hall, wizarding academy, 1950s boarding school?
- "beach party" → Tropical resort, surfer culture, desert island survival, beach bonfire horror?
- "train mystery" → Orient Express luxury, Wild West locomotive, modern commuter thriller?

DO NOT ask a clarifying question when the theme already conjures a specific world with a clear setting + era or aesthetic:
- "1920s speakeasy" → Prohibition, jazz, gangsters — you can picture it. Just ask for player count.
- "cyberpunk nightclub" → Neon dystopia, tech noir — clear vibe. Just ask for player count.
- "Victorian mansion dinner party" → Gothic, formal, gaslit — rich and specific. Just ask for player count.
- "pirate ship Caribbean 1700s" → Swashbuckling adventure — plenty to work with. Just ask for player count.

The test is NOT word count. "cyberpunk nightclub" (2 words) is specific. "old-fashioned themed party" (4 words) is vague. Judge by whether the theme gives you a clear world to build in.

When you DO ask a clarifying question, make it specific to their theme — suggest 2-3 concrete directions they could go, to spark their imagination rather than put the burden on them.
</clarifying_question_decision>

Keep it conversational and brief. Ask at most 2 questions total (player count + one clarifying question if needed). Do NOT generate any mystery content yet.

${contentBoundaries}`;

      } else if (messages.length <= 2 && !conceptAlreadyGenerated) {
        // === HAS PLAYER COUNT, FIRST MESSAGE: Decide whether to clarify or generate ===
        // This is typically a form submission with player count already set.
        // Ask ONE clarifying question if the theme could go multiple directions,
        // or generate the concept directly if the theme is already specific enough.

        if (databasePrompt) {
          systemPrompt = applyDatabasePrompt();
        } else {
          systemPrompt = `You are an enthusiastic, creative murder mystery concept designer.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>

The user has already provided a theme and player count. Your job is to decide: should you ask ONE clarifying question, or go straight to generating the concept?

<clarifying_question_decision>
Ask yourself: "Does this theme evoke a specific enough world that I can picture the setting, era, vibe, AND a compelling occasion for a murder — or would one question unlock a much better mystery?"

ASK ONE clarifying question when knowing more would meaningfully improve the mystery:
- "1920s speakeasy" → You know the era and vibe, but WHERE (NYC, Chicago, rural South)? What's the OCCASION (opening night, police raid, secret meeting, anniversary)? One question here unlocks a much richer story.
- "pirate ship" → Caribbean treasure hunt? Mutiny at sea? Ghost ship? One question shapes the whole mystery.
- "medieval castle" → Royal feast? Siege? Tournament? The occasion matters.
- "space station" → First contact? Sabotage? Corporate espionage? Very different mysteries.

DO NOT ask a clarifying question — go straight to generating the concept — when the theme is so specific that you can already picture the exact scene:
- "Victorian mansion dinner party where the host is poisoned" → Scene, method, and occasion are clear. Generate.
- "1920s Chicago speakeasy anniversary party" → Location + occasion = ready to go. Generate.
- "cyberpunk nightclub on New Year's Eve" → Specific enough. Generate.
- "Hogwarts-style wizarding school end-of-year feast" → Clear world + occasion. Generate.

The test: Can you already picture WHERE it happens, WHAT occasion brings everyone together, and WHY someone might get murdered? If yes, generate. If any of those are unclear, ask.

When you DO ask, make it specific — suggest 2-3 concrete directions to spark their imagination. Keep it brief and enthusiastic.
</clarifying_question_decision>

If you decide to ask a clarifying question, do NOT generate any mystery content yet — just ask the question warmly and briefly.

If you decide the theme is specific enough, generate the full concept using this format:

# "[CREATIVE TITLE]"

## ${labels.premise}
[2-3 paragraphs setting the scene]

## ${labels.victim}
**[Victim Name]** - [Vivid description]

## ${labels.characterList} (${playerCount} ${labels.playersWord})
[All ${playerCount} characters as numbered list]

IMPORTANT: The victim is NOT included in the ${playerCount} characters. The Inspector/Detective is also NOT included — that role is played by the host. All ${playerCount} listed characters must be SUSPECTS with motives, secrets, and connections to the victim.

## ${labels.murderMethod}
[How the murder was committed, clues]

${contentBoundaries}

If generating the concept, always end by asking if it works for them and mentioning they can refine or hit 'Generate Mystery' for the complete package.`;
        }

      } else {
        // === HAS PLAYER COUNT + FOLLOW-UP CONVERSATION: Generate concept ===

        if (databasePrompt) {
          systemPrompt = applyDatabasePrompt();
        } else {
          systemPrompt = `You are a murder mystery CONCEPT DESIGNER. The user has provided enough information to generate a concept.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>

Create a complete mystery CONCEPT using this format:

# "[CREATIVE TITLE]"

## ${labels.premise}
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## ${labels.victim}
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## ${labels.characterList} (${playerCount} ${labels.playersWord})
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all ${playerCount} characters]

IMPORTANT: The victim is NOT included in the ${playerCount} characters. The Inspector/Detective is also NOT included — that role is played by the host. All ${playerCount} listed characters must be SUSPECTS with motives, secrets, and connections to the victim.

## ${labels.murderMethod}
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

${contentBoundaries}

IMPORTANT: Always end your response by asking if the concept works for them. Mention they can continue refining any character concepts, motives, or story elements. Once satisfied, they can hit 'Generate Mystery' to create their complete package — including individual character scripts for each player, printable evidence cards, a host guide with round-by-round instructions, and everything needed to run their event.`;
        }
      }

      // Soft conversion nudge for long conversations (100+ messages)
      if (messages.length > 100) {
        systemPrompt += `\n\nNote: This has been a wonderfully detailed conversation! When it feels natural, warmly encourage the user that their concept is very well-developed and suggest hitting 'Generate Mystery' to bring it to life. But continue helping if they want to keep refining — don't block or pressure them.`;
      }
    }

    // Format messages for Anthropic API
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter(msg => msg.content.trim() !== '');

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: anthropicMessages,
        temperature: 0.7
      })
    });
    
    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error(`Anthropic API error ${anthropicResponse.status}: ${errorText}`);
      throw new Error(`Anthropic API error: ${anthropicResponse.status} - ${errorText}`);
    }

    const data = await anthropicResponse.json();
    const assistantMessage = data.content?.[0]?.text;
    if (!assistantMessage) {
      throw new Error('No content in response from Anthropic API');
    }

    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: assistantMessage,
          role: "assistant"
        }
      }]
    }), { headers: responseHeaders });

  } catch (error) {
    console.error('Error in mystery-ai function:', error.message);

    return new Response(JSON.stringify({
      error: 'An error occurred processing your request',
      choices: [{
        message: {
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          role: "assistant"
        }
      }]
    }), {
      status: 200,
      headers: responseHeaders
    });
  }
});