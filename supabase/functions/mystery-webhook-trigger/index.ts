
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS: restrict to production domains
const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define webhook URL from environment
const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";

// All locale translations of "Character List" section header + common variants
const CHARACTER_LIST_HEADERS = [
  "Character List", "Characters", "Cast of Characters",
  "Lista de Personajes", "Personajes",
  "Liste des personnages", "Personnages",
  "Charakterliste", "Charaktere",
  "Elenco Personaggi", "Personaggi",
  "Lista de Personagens", "Personagens",
  "Personagelijst", "Personages",
  "Karaktärslista", "Karakterliste",
  "Hahmoluettelo", "Hahmot",
  "캐릭터 목록", "등장인물",
  "キャラクターリスト", "登場人物",
  "角色列表", "角色名单",
];

interface ExtractedCharacter {
  name: string;
  description: string;
}

// Primary extraction: regex-based (free, deterministic, <1ms)
// Aggregates characters across ALL assistant messages (chronological order,
// later messages overwrite earlier ones by name for refinements)
function extractCharactersFromMessages(messages: any[]): ExtractedCharacter[] | null {
  // Build regex to match any locale's character list header
  // Pattern: ## <Header> (N PLAYERS) or ## <Header>
  const headerAlternatives = CHARACTER_LIST_HEADERS.map(h =>
    h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const sectionHeaderRegex = new RegExp(
    `^#{2,3}\\s+(?:${headerAlternatives})(?:\\s*\\(\\d+\\s+.+?\\))?\\s*$`, 'im'
  );

  // Pattern for numbered character lines (multiple formats):
  // 1. **Name** - Description  (bold with dash)
  // 1. **Name**: Description   (bold with colon)
  // 1. Name - Description      (plain with dash)
  const characterLineRegex = /^\d+\.\s+(?:\*\*(.+?)\*\*|([A-Z\u00C0-\u024F\u0400-\u04FF\u3000-\u9FFF\uAC00-\uD7AF].+?))\s*[-–—:]\s*(.+)/;

  // Scan assistant messages in CHRONOLOGICAL order so later refinements overwrite earlier versions
  const assistantMessages = messages
    .filter((m: any) => m.role === 'assistant' || m.is_ai);

  console.log(`[CharExtract] Scanning ${assistantMessages.length} assistant messages (of ${messages.length} total)`);

  // Aggregate characters across ALL messages using a Map (keyed by lowercase name)
  const charMap = new Map<string, ExtractedCharacter>();

  for (const msg of assistantMessages) {
    const content = msg.content || '';
    const headerMatch = content.match(sectionHeaderRegex);
    if (!headerMatch) {
      continue;
    }

    console.log(`[CharExtract] Found header: "${headerMatch[0].trim()}"`);
    // Found a character list header — parse the numbered lines after it
    const afterHeader = content.substring(headerMatch.index! + headerMatch[0].length);
    const lines = afterHeader.split('\n');
    let foundCharsInSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const charMatch = trimmed.match(characterLineRegex);
      if (charMatch) {
        const name = (charMatch[1] || charMatch[2]).trim();
        // Replace inner double quotes with single quotes to prevent JSON parsing
        // errors in downstream Make.com scenarios that use string interpolation
        const description = charMatch[3].trim().replace(/"/g, "'");
        charMap.set(name.toLowerCase(), { name, description });
        foundCharsInSection = true;
      } else if (foundCharsInSection) {
        // Hit a non-matching line after collecting — this section is over, but continue to next message
        break;
      }
    }
  }

  if (charMap.size >= 4 && charMap.size <= 32) {
    const characters = Array.from(charMap.values());
    console.log(`[CharExtract] PRIMARY regex aggregated ${characters.length} characters across messages: ${characters.map(c => c.name).join(', ')}`);
    return characters;
  } else if (charMap.size > 0) {
    console.log(`[CharExtract] Primary found ${charMap.size} characters (need 4-32), trying secondary...`);
  }

  console.log(`[CharExtract] Primary pattern insufficient, trying secondary (consecutive bold lines)...`);
  // Secondary pattern: 4+ consecutive **Name** - Description lines (no section header)
  // Also aggregates across all messages
  const boldCharRegex = /^\*\*(.+?)\*\*\s*[-–—:]\s*(.+)/;
  const secondaryMap = new Map<string, ExtractedCharacter>();

  for (const msg of assistantMessages) {
    const content = msg.content || '';
    const lines = content.split('\n');
    const batch: ExtractedCharacter[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match both "N. **Name** - Desc" and "**Name** - Desc"
      const numberedMatch = trimmed.match(characterLineRegex);
      const boldMatch = trimmed.match(boldCharRegex);

      if (numberedMatch) {
        const name = (numberedMatch[1] || numberedMatch[2]).trim();
        const description = numberedMatch[3].trim().replace(/"/g, "'");
        batch.push({ name, description });
      } else if (boldMatch) {
        batch.push({ name: boldMatch[1].trim(), description: boldMatch[2].trim().replace(/"/g, "'") });
      } else if (batch.length > 0 && trimmed !== '') {
        // Non-matching non-empty line — flush batch if 4+
        if (batch.length >= 4) {
          for (const c of batch) {
            secondaryMap.set(c.name.toLowerCase(), c);
          }
        }
        batch.length = 0;
      }
    }

    // Flush remaining batch from this message
    if (batch.length >= 4) {
      for (const c of batch) {
        secondaryMap.set(c.name.toLowerCase(), c);
      }
    }
  }

  if (secondaryMap.size >= 4 && secondaryMap.size <= 32) {
    const characters = Array.from(secondaryMap.values());
    console.log(`[CharExtract] SECONDARY regex aggregated ${characters.length} characters`);
    return characters;
  }

  console.log(`[CharExtract] Both regex patterns failed — no characters extracted`);
  return null;
}

// Fallback extraction: Claude API (only called if regex finds nothing)
async function extractCharactersWithClaude(
  messages: any[],
  playerCount: number | null
): Promise<ExtractedCharacter[] | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("No ANTHROPIC_API_KEY set, skipping Claude fallback extraction");
    return null;
  }

  // Only send assistant messages that contain bold text (character names)
  const relevantContent = messages
    .filter((m: any) => (m.role === 'assistant' || m.is_ai) && (m.content || '').includes('**'))
    .map((m: any) => m.content)
    .join('\n\n---\n\n');

  if (!relevantContent) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0,
        system: "You are a strict JSON extraction tool. Output ONLY a valid JSON array of objects with 'name' and 'description' fields. Extract the playable character names and descriptions. Never continue the story. Never output anything except the JSON array.",
        messages: [{
          role: "user",
          content: `Extract ALL playable character names and their one-line descriptions from this mystery content. Output ONLY a JSON array like: [{"name":"Character Name","description":"Their description"}]\n\nExpected count: ${playerCount || 'unknown'}\n\n${relevantContent.substring(0, 8000)}`
        }],
      }),
    });

    if (!response.ok) {
      console.error(`Claude extraction API returned ${response.status}`);
      return null;
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ExtractedCharacter[];
    if (Array.isArray(parsed) && parsed.length >= 4 && parsed.every(c => c.name && c.description)) {
      // Sanitize descriptions to prevent JSON issues in Make.com string interpolation
      for (const c of parsed) {
        c.description = c.description.replace(/"/g, "'");
      }
      console.log(`Claude fallback extracted ${parsed.length} characters`);
      return parsed;
    }
  } catch (error) {
    console.error("Claude fallback extraction failed:", error);
  }

  return null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body to get conversation ID
    const { conversationId, testMode = false } = await req.json();

    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    console.log(`Processing webhook for conversation: ${conversationId}, testMode: ${testMode}`);

    // Retrieve conversation data with user_id and messages
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages(*), user_id, title, theme, player_count, script_type, mystery_style, has_accomplice")
      .eq("id", conversationId)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      throw new Error(`Failed to fetch conversation: ${conversationError.message}`);
    }

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Extract user_id from the conversation
    const userId = conversation.user_id;
    
    if (!userId) {
      console.warn("Warning: No user_id found for conversation");
    }

    // Fetch user email and name from auth
    let userEmail = null;
    let userName = null;

    if (userId) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authUser && authUser.user) {
        userEmail = authUser.user.email;
        userName = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User';
      }
    }

    // Format all messages into a concatenated string for easier parsing
    const conversationContent = conversation.messages
      ? conversation.messages.map((msg: any) => {
          const role = msg.role === "assistant" ? "AI" : "User";
          return `${role}: ${msg.content}`;
        }).join("\n\n---\n\n")
      : "";

    // Extract character names before sending to Make.com
    let extractedCharacters = extractCharactersFromMessages(conversation.messages);
    let extractionMethod = extractedCharacters ? 'regex' : 'none';

    if (!extractedCharacters) {
      extractedCharacters = await extractCharactersWithClaude(
        conversation.messages, conversation.player_count
      );
      extractionMethod = extractedCharacters ? 'claude_fallback' : 'failed';
    }

    console.log(`Character extraction: method=${extractionMethod}, count=${extractedCharacters?.length || 0}`);

    // Build individual message fields for Make.com
    const messageFields: any = {};
    conversation.messages.forEach((msg: any, index: number) => {
      const msgNum = index + 1;
      messageFields[`message_${msgNum}_role`] = msg.role;
      messageFields[`message_${msgNum}_content`] = msg.content;
    });

    const webhookPayload = {
      // Put critical fields FIRST (before ...messageFields which can be 600+ fields)
      extractedCharacters: extractedCharacters ? JSON.stringify(extractedCharacters) : "[]",
      extractionMethod,
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      userId,
      userEmail,
      userName,
      conversationId,
      callback_domain: testMode ? "http://localhost:5173" : "https://www.mysterymaker.party",
      callback_url: testMode ? "http://localhost:5173/api/generation-complete" : "https://www.mysterymaker.party/api/generation-complete",
      environment: testMode ? "development" : "production",
      title: conversation.title || `Mystery - ${conversation.player_count} Players`,
      playerCount: conversation.player_count || null,
      theme: conversation.theme || null,
      scriptType: conversation.script_type || 'full',
      hasAccomplice: conversation.has_accomplice || false,
      mysteryStyle: conversation.mystery_style || 'character',
      testMode,
      conversationContent,
      messages: conversation.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      message_count: conversation.messages.length,
      // Individual message fields last (can be 600+ fields for long conversations)
      ...messageFields,
    };

    console.log(`Sending simplified payload to webhook: ${webhookUrl}`);
    console.log(`Payload size: ${JSON.stringify(webhookPayload).length} characters`);

    // Check if webhook URL is configured
    if (!webhookUrl) {
      console.warn("No webhook URL configured in the environment. Cannot send webhook.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No webhook URL configured in the environment"
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
          status: 400
        }
      );
    }

    // Send data to webhook with detailed logging
    console.log("About to send request to webhook URL");
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    // Log webhook response status
    console.log(`Webhook response status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook returned error: ${webhookResponse.status}`, errorText);
      throw new Error(`Webhook request failed with status ${webhookResponse.status}: ${errorText}`);
    }

    // Parse webhook response data
    let responseData;
    const contentType = webhookResponse.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await webhookResponse.json();
        console.log("Webhook response data:", responseData);
      } else {
        const textResponse = await webhookResponse.text();
        console.log("Webhook text response:", textResponse);
        responseData = { rawResponse: textResponse };
      }
    } catch (error) {
      console.warn("Error parsing webhook response:", error);
      responseData = { error: "Could not parse response" };
    }

    // Update conversation to mark it as processed
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        webhook_sent: true,
        webhook_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error updating conversation:", updateError);
    } else {
      console.log("Successfully marked conversation as processed");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook successfully triggered",
        webhookResponse: responseData
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred processing your request'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
