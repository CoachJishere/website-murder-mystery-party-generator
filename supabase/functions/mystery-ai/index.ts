import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Comprehensive CORS headers to handle all possible browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
  'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
};

serve(async (req) => {
  // Log all incoming requests for debugging
  console.log("=== Incoming Request ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests with comprehensive logging
  if (req.method === 'OPTIONS') {
    console.log("CORS preflight request received");
    const response = new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
    console.log("CORS preflight response headers:", Object.fromEntries(response.headers.entries()));
    return response;
  }

  // Add CORS headers to all responses
  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    console.log("Processing request with mystery-ai edge function");
    
    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));
    
    const { messages, system, promptVersion } = requestBody;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }
    
    console.log(`Processing request with ${messages.length} messages`);
    console.log("Custom system prompt provided:", !!system);
    
    // Get the Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Get database prompt from environment secrets instead of database
    console.log("Available environment variables:", Object.keys(Deno.env.toObject()));
    console.log("MYSTERY_FREE_PROMPT exists:", !!Deno.env.get('MYSTERY_FREE_PROMPT'));
    console.log("MYSTERY_FREE_PROMPT length:", Deno.env.get('MYSTERY_FREE_PROMPT')?.length || 'undefined');
    let databasePrompt = Deno.env.get('MYSTERY_FREE_PROMPT');
    if (databasePrompt) {
      console.log("Retrieved database prompt from environment secrets");
    } else {
      console.log("No database prompt found in secrets, using fallback logic");
    }

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
</content_boundaries>`;

    // Determine system prompt based on conversation state
    let systemPrompt = system;

    if (!systemPrompt) {
      console.log("No custom system prompt - analyzing conversation state");

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
        console.log("Concept already generated - entering refinement mode");

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
        console.log(`Invalid player count: ${invalidNumber}`);
        systemPrompt = `The user provided ${invalidNumber} players. Politely let them know the range is 4 to 32 players and ask them to pick a number in that range.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>`;

      } else if (!hasPlayerCount) {
        // === PRE-CONCEPT: Need player count ===
        console.log("No player count detected - asking for it (+ creative question if sparse)");

        systemPrompt = `You are an enthusiastic, creative murder mystery concept designer.

<language_instruction>
Always respond in the same language the user writes to you.
</language_instruction>

Your response should:
1. React warmly and enthusiastically to their idea
2. Ask how many players they need (between 4 and 32)
3. If their request is vague (just a basic theme like "train mystery" or "beach party" without much detail), also ask ONE creative question to spark their imagination — such as what era or time period, what tone (lighthearted and campy vs dark and serious), what type of setting within the theme, or if they have any specific character ideas in mind
4. If their request is already detailed (they've described a specific setting, era, character ideas, or tone), just ask for the player count — they've given you plenty to work with

Keep it conversational and brief. Ask at most 2 questions total (player count + one creative question if needed). Do NOT generate any mystery content yet.

${contentBoundaries}`;

      } else {
        // === HAS PLAYER COUNT: Generate concept ===
        console.log(`Player count detected (${playerCount}) - generating concept`);

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

## ${labels.murderMethod}
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

${contentBoundaries}

IMPORTANT: Always end your response by asking if the concept works for them. Mention they can continue refining any character concepts, motives, or story elements. Once satisfied, they can hit 'Generate Mystery' to create their complete package — including individual character scripts for each player, printable evidence cards, a host guide with round-by-round instructions, and everything needed to run their event.`;
        }
      }
    }
    
    console.log("Final system prompt being used:", systemPrompt.substring(0, 200) + "...");
    
    // Format messages for Anthropic API
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter(msg => msg.content.trim() !== '');
    
    console.log("Formatted messages for Anthropic:", anthropicMessages.length, "messages");
    
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        system: systemPrompt,
        messages: anthropicMessages,
        temperature: 0.7
      })
    });
    
    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error(`Anthropic API error: ${anthropicResponse.status} ${errorText}`);
      throw new Error(`Anthropic API error: ${anthropicResponse.status} ${errorText}`);
    }
    
    const data = await anthropicResponse.json();
    console.log("Anthropic API response received, content length:", data.content?.[0]?.text?.length || 0);
    
    const assistantMessage = data.content?.[0]?.text;
    if (!assistantMessage) {
      throw new Error('No content in response from Anthropic API');
    }
    
    console.log("Returning successful response");
    
    // Return in the format expected by the frontend
    const successResponse = new Response(JSON.stringify({
      choices: [{
        message: {
          content: assistantMessage,
          role: "assistant"
        }
      }]
    }), {
      headers: responseHeaders
    });
    
    console.log("Success response headers:", Object.fromEntries(successResponse.headers.entries()));
    return successResponse;
    
  } catch (error) {
    console.error('Error in mystery-ai function:', error);
    
    // Return a proper error response that the frontend can handle
    const errorResponse = new Response(JSON.stringify({ 
      error: error.message,
      choices: [{
        message: {
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          role: "assistant"
        }
      }]
    }), {
      status: 200, // Return 200 so the frontend doesn't treat it as a failed request
      headers: responseHeaders
    });
    
    console.log("Error response headers:", Object.fromEntries(errorResponse.headers.entries()));
    return errorResponse;
  }
});