
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
  "Complete Character List", "COMPLETE CHARACTER LIST", "Full Character List",
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
// If approvedMessageId is provided, extracts ONLY from that message (the concept
// snapshot the user explicitly approved at purchase time).
// Otherwise, falls back to the latest assistant message containing a CHARACTER LIST.
function extractCharactersFromMessages(messages: any[], approvedMessageId?: string | null): ExtractedCharacter[] | null {
  // Build regex to match any locale's character list header
  // Pattern: ## <Header> (N PLAYERS) or ## <Header>
  const headerAlternatives = CHARACTER_LIST_HEADERS.map(h =>
    h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const sectionHeaderRegex = new RegExp(
    `^#{2,3}\\s+(?:${headerAlternatives})(?:\\s*\\(\\d+\\s+.+?\\))?[:\\s]*$`, 'im'
  );

  // Pattern for numbered character lines (multiple formats):
  // 1. **Name** - Description  (bold with dash)
  // 1. **Name**: Description   (bold with colon)
  // 1. Name - Description      (plain with dash)
  const characterLineRegex = /^\d+\.\s+(?:\*\*(.+?)\*\*|([A-Z\u00C0-\u024F\u0400-\u04FF\u3000-\u9FFF\uAC00-\uD7AF].+?))\s*[-–—:]\s*(.+)/;

  const assistantMessages = messages
    .filter((m: any) => m.role === 'assistant' || m.is_ai);

  console.log(`[CharExtract] Scanning ${assistantMessages.length} assistant messages (of ${messages.length} total)`);

  // If the user explicitly approved a specific concept message at purchase time,
  // use ONLY that message. This is the most reliable source — guaranteed to match
  // what the user saw and approved on the preview page.
  let latestMessageWithList: any = null;
  if (approvedMessageId) {
    latestMessageWithList = messages.find((m: any) => m.id === approvedMessageId);
    if (latestMessageWithList) {
      console.log(`[CharExtract] Using approved concept message ${approvedMessageId}`);
    } else {
      console.warn(`[CharExtract] approved_concept_message_id ${approvedMessageId} not found in messages, falling back to latest`);
    }
  }

  // Fallback: find the LAST assistant message containing a CHARACTER LIST section.
  if (!latestMessageWithList) {
    for (const msg of assistantMessages) {
      const content = msg.content || '';
      if (content.match(sectionHeaderRegex)) {
        latestMessageWithList = msg;
      }
    }
  }

  const charMap = new Map<string, ExtractedCharacter>();

  if (latestMessageWithList) {
    const content = latestMessageWithList.content || '';
    const headerMatch = content.match(sectionHeaderRegex);

    if (headerMatch) {
      console.log(`[CharExtract] Using header from latest list: "${headerMatch[0].trim()}"`);
      const afterHeader = content.substring(headerMatch.index! + headerMatch[0].length);
      const lines = afterHeader.split('\n');
      let foundCharsInSection = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const charMatch = trimmed.match(characterLineRegex);
        if (charMatch) {
          // Replace inner double quotes with single quotes to prevent JSON parsing
          // errors in downstream Make.com scenarios that use string interpolation
          const name = (charMatch[1] || charMatch[2]).trim().replace(/"/g, "'");
          const description = charMatch[3].trim().replace(/"/g, "'");
          charMap.set(name.toLowerCase(), { name, description });
          foundCharsInSection = true;
        } else if (foundCharsInSection) {
          // Allow non-matching lines (subheadings, dividers, category labels)
          // between character entries — only stop at a new ## section header
          // that isn't another character list header
          if (/^#{2,3}\s+/.test(trimmed) && !sectionHeaderRegex.test(trimmed)) {
            break;
          }
          // Otherwise skip and keep looking for more numbered characters
        }
      }
    } else {
      // The approved/found message doesn't match sectionHeaderRegex — header variant
      // not yet in CHARACTER_LIST_HEADERS. Secondary extraction will handle it.
      console.warn(`[CharExtract] Message found but sectionHeaderRegex didn't match (non-standard header). Falling through to secondary extraction.`);
    }
  }

  if (charMap.size >= 4 && charMap.size <= 35) {
    const characters = Array.from(charMap.values());
    console.log(`[CharExtract] PRIMARY regex aggregated ${characters.length} characters across messages: ${characters.map(c => c.name).join(', ')}`);
    return characters;
  } else if (charMap.size > 0) {
    console.log(`[CharExtract] Primary found ${charMap.size} characters (need 4-35), trying secondary...`);
  }

  console.log(`[CharExtract] Primary pattern insufficient, trying secondary (consecutive bold lines)...`);
  // Secondary pattern: 4+ consecutive **Name** - Description lines (no section header).
  // Iterate messages chronologically; LATER messages with a valid batch overwrite
  // earlier ones, so we always use the most recent character list.
  const boldCharRegex = /^\*\*(.+?)\*\*\s*[-–—:]\s*(.+)/;
  let secondaryMap = new Map<string, ExtractedCharacter>();

  for (const msg of assistantMessages) {
    const content = msg.content || '';
    const lines = content.split('\n');
    const batch: ExtractedCharacter[] = [];
    const messageMap = new Map<string, ExtractedCharacter>();

    for (const line of lines) {
      const trimmed = line.trim();
      // Match both "N. **Name** - Desc" and "**Name** - Desc"
      const numberedMatch = trimmed.match(characterLineRegex);
      const boldMatch = trimmed.match(boldCharRegex);

      if (numberedMatch) {
        const name = (numberedMatch[1] || numberedMatch[2]).trim().replace(/"/g, "'");
        const description = numberedMatch[3].trim().replace(/"/g, "'");
        batch.push({ name, description });
      } else if (boldMatch) {
        batch.push({ name: boldMatch[1].trim().replace(/"/g, "'"), description: boldMatch[2].trim().replace(/"/g, "'") });
      } else if (batch.length > 0 && trimmed !== '') {
        // Non-matching non-empty line — flush batch if 4+
        if (batch.length >= 4) {
          for (const c of batch) {
            messageMap.set(c.name.toLowerCase(), c);
          }
        }
        batch.length = 0;
      }
    }

    // Flush remaining batch from this message
    if (batch.length >= 4) {
      for (const c of batch) {
        messageMap.set(c.name.toLowerCase(), c);
      }
    }

    // If this message had a valid batch, REPLACE secondaryMap (overwrite older)
    if (messageMap.size >= 4) {
      secondaryMap = messageMap;
    }
  }

  if (secondaryMap.size >= 4 && secondaryMap.size <= 35) {
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
        model: "claude-haiku-4-5-20251001",
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
      // Sanitize names and descriptions to prevent JSON issues in Make.com string interpolation
      for (const c of parsed) {
        c.name = c.name.replace(/"/g, "'");
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
      .select("*, messages!fk_messages_conversation_id(*), user_id, title, theme, player_count, script_type, mystery_style, mystery_type, has_accomplice, approved_concept_message_id")
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

    // Payment gate (ADR-0033): generation is the expensive step (Make.com + AI),
    // and generated content alone unlocks the package tabs in MysteryView — so an
    // unauthenticated call with a conversation UUID was a free-package hole. The
    // function has verify_jwt disabled, so the gate lives here: only paid
    // conversations generate. Internal/recovery callers can bypass by sending the
    // service-role key as the bearer token.
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceCall = supabaseKey.length > 0 && authHeader === `Bearer ${supabaseKey}`;
    if (!conversation.is_paid && !isServiceCall) {
      console.warn(`[PaymentGate] Rejected generation for unpaid conversation ${conversationId}`);
      return new Response(
        JSON.stringify({ success: false, error: "Payment required before package generation" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Snapshot the approved concept message at generation time. The original
    // chat-creation path (MysteryChatCreator) wrote this column, but the live
    // /mystery/chat path doesn't — so for every real customer the column was
    // null and the parent had to rely on theme+messages, which led to confused
    // outputs when the chat-defined concept drifted from the form-selected theme
    // (e.g. theme="Family Reunion" but chat pivoted to "circus" → parent merged
    // them into a schizophrenic lake-house-with-circus-names mystery).
    //
    // Capturing the id here ensures the latest assistant CHARACTER LIST message
    // becomes the single source of truth — both for our local extraction and
    // for the parent webhook's prompt (which receives this as approvedConceptMessageId).
    //
    // The regex is hoisted so the concept-completeness ENTRY GATE below and this
    // snapshot share one definition (memory: paired regexes must not drift).
    const characterListRegex = /^#{2,3}\s+(?:Character List|Characters|Cast of Characters|Complete Character List|COMPLETE CHARACTER LIST|Full Character List)/im;
    const hasCharacterListMessage = Array.isArray(conversation.messages) &&
      (conversation.messages as any[]).some(
        (m: any) => (m.role === 'assistant' || m.is_ai) && characterListRegex.test(m.content || '')
      );

    if (!conversation.approved_concept_message_id && conversation.messages) {
      const aiMessagesWithCharList = (conversation.messages as any[])
        .filter((m: any) => (m.role === 'assistant' || m.is_ai) && characterListRegex.test(m.content || ''))
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const candidate = aiMessagesWithCharList[aiMessagesWithCharList.length - 1];
      // Only snapshot real DB ids, not client-generated msg- placeholders
      if (candidate?.id && !String(candidate.id).startsWith('msg-') && candidate.id !== 'initial-message') {
        const { error: snapErr } = await supabase
          .from("conversations")
          .update({ approved_concept_message_id: candidate.id })
          .eq("id", conversationId);
        if (snapErr) {
          console.warn(`[ConceptSnapshot] Failed to write approved_concept_message_id: ${snapErr.message}`);
        } else {
          conversation.approved_concept_message_id = candidate.id;
          console.log(`[ConceptSnapshot] Captured approved_concept_message_id=${candidate.id} (latest CHARACTER LIST message at ${candidate.created_at})`);
        }
      }
    }

    // ENTRY GATE (ADR-0043): refuse to generate when no mystery concept exists yet.
    // The "Victorian mansion - 32 Players" incident fired generation ~100s after the
    // assistant was still ASKING clarifying questions — no victim, no event, no
    // character roster. The parent flagged master_context Part 1 "incomplete_context"
    // but produced placeholder junk ("Character A"–"E") and marked it completed.
    // The concrete concept-ready signal is an assistant CHARACTER LIST message
    // (the same artifact extraction and the snapshot above key on). No such message
    // and no previously-approved concept => the concept was never built. Refuse
    // BEFORE the pre-generation cleanup below (which deletes character rows) and
    // BEFORE spending on Make.com. Service/recovery callers bypass so an operator
    // can force a regeneration during triage.
    if (!hasCharacterListMessage && !conversation.approved_concept_message_id && !isServiceCall) {
      console.warn(`[ConceptGate] Refusing generation for ${conversationId}: no CHARACTER LIST message / approved concept (conversation not finished)`);
      const needsMoreInfoStatus = {
        status: 'needs_more_info',
        progress: 0,
        currentStep: 'We need a bit more detail before we can build your mystery',
        error: 'concept_incomplete',
        resumable: true,
      };
      // Flag any package row so the UI shows the right state and the
      // completed-but-empty / needs_more_info states are visible to monitoring.
      await supabase
        .from("mystery_packages")
        .update({ generation_status: needsMoreInfoStatus, updated_at: new Date().toISOString() })
        .eq("conversation_id", conversationId);

      // 200 with success:false (not an HTTP error) so the client can distinguish a
      // "finish your concept" outcome from a real failure and message the user kindly.
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'needs_more_info',
          message: "Your mystery concept isn't finished yet. Head back to the chat, answer the remaining question(s) so we have the occasion and a character list, then generate again.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pre-generation cleanup: delete any existing `mystery_characters` rows for this
    // package before Make.com begins. Make.com upserts characters by exact name, so
    // when the AI's naming convention changes between generations (e.g. moving from
    // "Mario / Mariana" gender-variant names to just "Mario"), characters whose
    // names no longer match the new convention are orphaned — they linger in the
    // table alongside the freshly-inserted single-name versions.
    //
    // Fotini's "Multiverse" regeneration (May 19 2026): 9 old "/"-style names from
    // the prior generation stuck around as duplicates next to the 9 new single-name
    // rows, leaving the package with 26 characters instead of 17. Cleaning here on
    // every run guarantees the character set always matches the current generation.
    //
    // Safety: this is a no-op for first-time generations (no rows to delete). It
    // means a failed/aborted regeneration briefly leaves the package with zero
    // characters — but the UI already handles that case via the "We're Finalizing"
    // fallback when characters.length === 0 (see MysteryView.tsx tab-display logic).
    {
      const { data: existingPackage } = await supabase
        .from("mystery_packages")
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (existingPackage?.id) {
        const { count, error: cleanupErr } = await supabase
          .from("mystery_characters")
          .delete({ count: "exact" })
          .eq("package_id", existingPackage.id);
        if (cleanupErr) {
          console.warn(`[Cleanup] Failed to delete existing characters: ${cleanupErr.message}`);
        } else if (count && count > 0) {
          console.log(`[Cleanup] Deleted ${count} existing character rows (package_id=${existingPackage.id}) before regeneration`);
        }
      }
    }

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

    // Build conversationContent for the parent's planning prompts. When the
    // user has an approved concept message (set above or earlier), we send
    // ONLY that one message — not the full chat — so the planning prompt
    // can't latch onto an earlier draft theme that the user pivoted away from.
    //
    // Madysn's "Murder Under The Big Top" (Apr 2026) hit this exact failure:
    // her chat went lake-house family destination → circus pivot → final
    // "MURDER UNDER THE BIG TOP" concept. The full conversation was sent to
    // the parent, the master_context generation latched onto the early
    // lake-house draft, and we got a schizophrenic package with circus
    // characters but lake-house host content.
    //
    // For backwards compat with conversations where no approved message
    // exists (rare now that we auto-snapshot), fall back to full content.
    let conversationContent = "";
    if (conversation.messages && conversation.messages.length > 0) {
      const approvedId = conversation.approved_concept_message_id;
      const approvedMsg = approvedId
        ? (conversation.messages as any[]).find((m: any) => m.id === approvedId)
        : null;

      // Sanity check: if the approved snapshot is suspiciously thin compared to the rest
      // of the conversation, the user likely iterated extensively after the snapshot
      // landed (or the snapshot is a character-roster-only message). Sending only the
      // thin snapshot starves the parent's planning prompts of plot detail.
      //
      // Fotini's "Multiverse" mystery (May 19 2026): approved snapshot was a 1.8KB clean
      // character roster; the full 304-message chat (312KB) held every plot decision —
      // killer, motive, void essence poison, dimensional keystones, riddle system. Make.com
      // got the right characters and an invented plot. Fix: detect that mismatch here and
      // fall back to the full conversation.
      const fullConvoLength = (conversation.messages as any[])
        .reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
      const snapshotTooThin = approvedMsg
        && approvedMsg.content.length < 3000
        && fullConvoLength > 30000
        && fullConvoLength > approvedMsg.content.length * 10;

      if (approvedMsg && !snapshotTooThin) {
        // Single-source-of-truth path: just the locked-in concept message.
        conversationContent = `AI: ${approvedMsg.content}`;
        console.log(`[ConversationContent] Trimmed to approved concept message only (id=${approvedId}, ${approvedMsg.content.length} chars)`);
      } else {
        // Fallback: full conversation (either no snapshot, or snapshot is too thin to be trusted)
        conversationContent = (conversation.messages as any[])
          .map((msg: any) => {
            const role = msg.role === "assistant" ? "AI" : "User";
            return `${role}: ${msg.content}`;
          }).join("\n\n---\n\n");
        if (snapshotTooThin) {
          console.warn(`[ConversationContent] Approved snapshot is thin (${approvedMsg.content.length} chars) vs full conversation (${fullConvoLength} chars) — using full conversation to preserve iterative plot detail`);
        } else {
          console.log(`[ConversationContent] Sending full conversation (${conversationContent.length} chars, no approved snapshot found)`);
        }
      }
    }

    // Extract character names before sending to Make.com.
    // Prefer the approved concept message (snapshot at purchase time) so we get
    // exactly what the user approved — not earlier draft versions with characters
    // they may have explicitly removed.
    let extractedCharacters = extractCharactersFromMessages(
      conversation.messages,
      conversation.approved_concept_message_id
    );
    let extractionMethod = extractedCharacters ? 'regex' : 'none';

    if (!extractedCharacters) {
      extractedCharacters = await extractCharactersWithClaude(
        conversation.messages, conversation.player_count
      );
      extractionMethod = extractedCharacters ? 'claude_fallback' : 'failed';
    }

    console.log(`Character extraction: method=${extractionMethod}, count=${extractedCharacters?.length || 0}`);

    // Cross-validate extracted count against player_count — if regex found
    // significantly fewer characters than expected, try Claude fallback
    let playerCount = conversation.player_count || 0;
    if (extractedCharacters && playerCount > 0) {
      const minExpected = playerCount - 2; // Allow for inspector + flexibility
      if (extractedCharacters.length < minExpected && extractionMethod === 'regex') {
        console.warn(`[CharExtract] WARNING: Regex found ${extractedCharacters.length} characters but player_count is ${playerCount}. Trying Claude fallback...`);
        const claudeChars = await extractCharactersWithClaude(conversation.messages, playerCount);
        if (claudeChars && claudeChars.length > extractedCharacters.length) {
          console.log(`[CharExtract] Claude fallback found ${claudeChars.length} characters (vs regex ${extractedCharacters.length}), using Claude result`);
          extractedCharacters = claudeChars;
          extractionMethod = 'claude_upgrade';
        }
      }
    }

    // Auto-sync `player_count` from the extracted character count. The form-captured
    // value is taken from the user's opening chat message and never refreshes, but
    // users routinely iterate on character count during chat (Fotini "Multiverse"
    // May 19 2026 drifted 15 → 20 → 19 → 17, while the form stayed at 15). The
    // approved concept message is the authoritative source of truth.
    //
    // This replaces the previous strict-mismatch validation that returned 400 —
    // form-value drift was being misclassified as an extraction error and turning
    // into broken generations for paying customers. Best-effort DB sync; the local
    // value drives this request regardless of whether the DB write succeeds.
    if (extractedCharacters && extractedCharacters.length > 0 && extractedCharacters.length !== playerCount) {
      const extractedCount = extractedCharacters.length;
      console.warn(`[PlayerCount] Drift detected: form=${playerCount}, extracted=${extractedCount}. Syncing player_count → ${extractedCount}.`);
      const { error: syncErr } = await supabase
        .from("conversations")
        .update({ player_count: extractedCount })
        .eq("id", conversationId);
      if (syncErr) {
        console.warn(`[PlayerCount] DB sync failed (proceeding with local value): ${syncErr.message}`);
      }
      conversation.player_count = extractedCount;
      playerCount = extractedCount;
    }

    // Per-character chat excerpts: for each extracted character, bundle the chat
    // messages that mention them by name. The parent scenario passes a character's
    // excerpts to its child scenario so the child has the user's specific design
    // intent for that character — not just the one-line role description.
    //
    // Why: Fotini's "Multiverse" (May 19 2026) — she designed a 10-secret
    // bribe/riddle system for Klint across many messages. The child generating
    // Klint's sheet only received his one-line description from the parent, so
    // the riddle system was invented from scratch (and lost most of the design).
    //
    // Matching: case-insensitive word-boundary on each substantive name part
    // (first name, last name, nickname >= 3 chars). Misses implicit references
    // like "the witch's apprentice" — that's why Option 2 (full conversationContent
    // forwarded to child scenarios in Make.com) is the backup safety net.
    //
    // Size cap: 30KB per character (~7.5K tokens) — Haiku 4.5 has plenty of room
    // for that plus the standard child prompt; prefer most-recent messages since
    // they hold the most refined design decisions.
    const characterExcerpts: Record<string, string[]> = {};
    if (extractedCharacters && conversation.messages) {
      const MAX_EXCERPT_BYTES_PER_CHAR = 30000;
      for (const char of extractedCharacters) {
        const nameAliases = char.name
          .split(/[\s'’"]+/)
          .map((s: string) => s.replace(/[^\p{L}\p{N}]/gu, ''))
          .filter((s: string) => s.length >= 3);

        if (nameAliases.length === 0) {
          characterExcerpts[char.name] = [];
          continue;
        }

        const aliasPattern = new RegExp(
          `\\b(?:${nameAliases.map((a: string) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
          'i'
        );

        const matches: { content: string; role: string }[] = [];
        for (const msg of conversation.messages as any[]) {
          const content = msg.content || '';
          if (aliasPattern.test(content)) {
            matches.push({
              content,
              role: msg.role === 'assistant' || msg.is_ai ? 'AI' : 'User',
            });
          }
        }

        const excerpts: string[] = [];
        let totalBytes = 0;
        for (let i = matches.length - 1; i >= 0; i--) {
          const formatted = `${matches[i].role}: ${matches[i].content}`;
          if (totalBytes + formatted.length > MAX_EXCERPT_BYTES_PER_CHAR) break;
          excerpts.unshift(formatted);
          totalBytes += formatted.length;
        }

        characterExcerpts[char.name] = excerpts;
        console.log(`[Excerpts] ${char.name}: ${excerpts.length} messages (${totalBytes} chars) from ${matches.length} total matches`);
      }
    }

    // JSON-escape strings BEFORE handing to Make.com. Make.com's raw HTTP body
    // type doesn't auto-escape computed expressions (or substring()/get()
    // results) when substituting into a JSON template — only direct field
    // references with short content survive intact. Multi-line chat carries
    // literal LF, ", and \ that break the body JSON.
    //
    // Stacy "Moonlight Social Club" (Parent v36 first run): "Bad control
    // character at position 446" — unescaped LF in joined excerpts.
    // Stacy retry (Parent v37 with IML escape chain): "Expected ',' or '}'
    // at position 569" — IML's "\"" quote-escape didn't behave as expected,
    // leaving an unescaped " inside the value that closed the JSON string.
    //
    // Fix: pre-escape here and ship via NEW fields so the body template can
    // just substitute `{{...Escaped}}` without IML wrapping. The original
    // `characterExcerpts` and `conversationContent` fields are preserved for
    // any caller that still uses the raw form (e.g. the Master Doc Claude
    // prompt which substitutes conversationContent into prose, where literal
    // LF is desired).
    function jsonEscape(s: string): string {
      return s
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
    }
    const characterExcerptsEscaped: Record<string, string> = {};
    for (const [name, msgs] of Object.entries(characterExcerpts)) {
      characterExcerptsEscaped[name] = jsonEscape(msgs.join("\n---\n"));
    }
    const conversationContentEscaped = jsonEscape(conversationContent);

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
      characterExcerpts: JSON.stringify(characterExcerpts),
      characterExcerptsEscaped: JSON.stringify(characterExcerptsEscaped),
      conversationContentEscaped,
      extractionMethod,
      model: "claude-haiku-4-5-20251001",
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
      mysteryType: conversation.mystery_type || 'murder',
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
    // Surface the actual error message + stack to the function logs so future
    // bugs are debuggable. The May 19 2026 Fotini outage cost ~30 min of triage
    // because the previous generic "An error occurred processing your request"
    // hid a TypeError null-deref. Return the message to the caller too — the
    // frontend already strips it from user-facing UI, so this is staff-debug
    // info, not user-leaked data.
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[mystery-webhook-trigger] Unhandled exception:", {
      message: errMessage,
      stack: errStack,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errMessage,
        errorType: error instanceof Error ? error.name : "Unknown",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
