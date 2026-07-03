import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Define error type for better error handling
interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

// Test mode toggle
let testModeEnabled = false;

export const getTestModeEnabled = () => {
  return testModeEnabled;
};

export const toggleTestMode = (enabled: boolean) => {
  testModeEnabled = enabled;
  console.log(`Test mode ${enabled ? 'enabled' : 'disabled'}`);
  return testModeEnabled;
};

// Define interface for the generation status
export interface GenerationStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  // ISO timestamp when generation started; used by the progress UI to anchor its
  // time-based simulated creep so a page refresh mid-generation resumes accurately.
  startedAt?: string | null;
  resumable?: boolean;
  sections?: {
    hostGuide?: boolean;
    characters?: boolean;
    clues?: boolean;
    inspectorScript?: boolean;
    characterMatrix?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Helper function to detect current domain
const getCurrentDomain = () => {
  // Client-side detection
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side detection for different environments
  if (process.env.VERCEL_URL) {
    // Vercel automatically sets this in production and preview deployments
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Fallback to your production domain
  return 'https://www.mysterymaker.party';
};

// Enhanced package generation with domain detection
export async function generateCompletePackage(mysteryId: string, testMode = false): Promise<string> {
  let packageId: string | undefined;

  try {
    console.log("Starting package generation for conversation ID:", mysteryId);

    // Prevent duplicate generation attempts
    const { data: existingPackage, error: existingPackageErr } = await supabase
      .from("mystery_packages")
      .select("generation_status, generation_started_at")
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPackageErr) {
      console.error("Error checking for existing generation:", existingPackageErr);
    } else if (existingPackage?.generation_status?.status === 'completed') {
      console.log("Package already generated — skipping duplicate generation");
      return "already_completed";
    } else if (existingPackage?.generation_status?.status === 'in_progress') {
      console.warn("Generation already in progress – aborting duplicate webhook call");
      return "already_in_progress";
    }

    // Get conversation data
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages!fk_messages_conversation_id(*), user_id, theme, player_count, script_type, has_accomplice, additional_details")
      .eq("id", mysteryId)
      .single();

    if (conversationError || !conversation) {
      console.error("Error fetching conversation:", conversationError);
      throw new Error("Failed to fetch conversation data");
    }

    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Create or update mystery_packages record with initial status
    const { data: packageData, error: checkError } = await supabase
      .from("mystery_packages")
      .select("id")
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing package:", checkError);
      throw new Error("Failed to check existing package");
    }
    
    const initialStatus: GenerationStatus = {
      status: 'in_progress',
      progress: 10,
      currentStep: 'Sending to external generation service...',
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
        inspectorScript: false,
        characterMatrix: false,
        solution: false
      }
    };
    
    if (packageData) {
      packageId = packageData.id;
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: initialStatus,
          generation_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
    } else {
      const { data: newPackage, error: createError } = await supabase
        .from("mystery_packages")
        .insert({
          conversation_id: mysteryId,
          generation_status: initialStatus,
          generation_started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();
        
      if (createError || !newPackage) {
        console.error("Error creating package:", createError);
        throw new Error("Failed to create package record");
      }
      packageId = newPackage.id;
    }

    // Prepare conversation content
    const conversationContent = conversation.messages
      ? conversation.messages.map((msg: any) => {
          const role = msg.role === "assistant" ? "AI" : "User";
          return `${role}: ${msg.content}`;
        }).join("\n\n---\n\n")
      : "";

    // Detect current domain for callback
    const currentDomain = getCurrentDomain();
    console.log("Detected domain for webhook callback:", currentDomain);

    // Format messages to ensure they match the expected structure
    const formattedMessages = conversation.messages 
      ? conversation.messages.map(msg => ({
          role: msg.role || 'user',
          content: String(msg.content || '')
        }))
      : [];

    // Call Supabase Edge Function instead of direct webhook
    console.log("Calling mystery-webhook-trigger Edge Function");
    const { data: webhookResponse, error: webhookError } = await supabase.functions.invoke(
      'mystery-webhook-trigger',
      {
        body: {
          conversationId: mysteryId,
          testMode: testMode
        }
      }
    );

    if (webhookError) {
      console.error("Edge Function error:", webhookError);

      // Update status to failed
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: {
            status: 'failed',
            progress: 0,
            currentStep: 'Failed to trigger generation',
            error: webhookError.message,
            resumable: true
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);

      throw new Error(`Failed to trigger generation: ${webhookError.message}`);
    }

    console.log("Edge Function response:", webhookResponse);

    // Update status to indicate webhook was sent successfully
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: {
          status: 'in_progress',
          progress: 20,
          currentStep: 'Processing by external service...'
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
  } catch (e) {
    console.error("Unexpected error in generateCompletePackage:", e);

    // Update status to failed with error details (only if we have a packageId)
    if (packageId) {
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: {
            status: 'failed',
            progress: 0,
            currentStep: 'Unexpected error during generation',
            error: e instanceof Error ? e.message : String(e),
            resumable: true
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
    }

    throw new Error(`Package generation failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // If we get here, the webhook was sent successfully
  return "Package generation started successfully";
}

// Simplified resume function - just calls generate again
export async function resumePackageGeneration(mysteryId: string): Promise<string> {
  console.log("Resuming package generation by calling generateCompletePackage");
  return generateCompletePackage(mysteryId);
}

// Enhanced Get generation status with content-based completion detection
export async function getPackageGenerationStatus(mysteryId: string): Promise<GenerationStatus> {
  console.log("🔍 [STATUS CHECK] getPackageGenerationStatus called for:", mysteryId);
  
  try {
    // Enhanced database query to include content fields, character count, and expected characters
    const { data, error } = await supabase
      .from("mystery_packages")
      .select(`
        generation_status,
        generation_completed_at,
        generation_started_at,
        title,
        host_guide,
        extracted_characters,
        characters:mystery_characters(count)
      `)
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("❌ [STATUS CHECK] Error fetching generation status:", error);
      throw new Error(`Failed to fetch generation status: ${error.message}`);
    }
    
    console.log("📊 [STATUS CHECK] Raw package data received:", data);
    
    if (!data) {
      console.log("ℹ️ [STATUS CHECK] No mystery package found, returning default not_started status");
      const defaultStatus = {
        status: 'not_started' as const,
        progress: 0,
        currentStep: 'Not started',
        sections: {}
      };
      console.log("📊 [STATUS CHECK] Returning default status:", defaultStatus);
      return defaultStatus;
    }
    
    // Content-based completion detection with character count validation
    const hasContent = !!(data.title && data.host_guide);
    const generatedCharacterCount = data.characters?.[0]?.count ?? 0;
    const hasCharacters = generatedCharacterCount > 0;

    // Parse expected character count from extracted_characters
    let expectedCharacterCount = 0;
    if (data.extracted_characters) {
      try {
        const extracted = typeof data.extracted_characters === 'string'
          ? JSON.parse(data.extracted_characters)
          : data.extracted_characters;
        expectedCharacterCount = Array.isArray(extracted) ? extracted.length : 0;
      } catch {
        expectedCharacterCount = 0;
      }
    }

    // Cross-validate against player_count from conversations table
    const { data: convRecord } = await supabase
      .from("conversations")
      .select("player_count")
      .eq("id", mysteryId)
      .maybeSingle();
    const statusPlayerCount = convRecord?.player_count || 0;
    const statusMinFromPlayerCount = statusPlayerCount > 0 ? statusPlayerCount - 2 : 0;
    const statusEffectiveExpected = Math.max(expectedCharacterCount, statusMinFromPlayerCount);

    const allCharactersGenerated = statusEffectiveExpected === 0 || generatedCharacterCount >= statusEffectiveExpected;
    const contentComplete = hasContent && hasCharacters && allCharactersGenerated;

    console.log("🔍 [STATUS CHECK] Content check results:");
    console.log("  - Has title and host_guide:", hasContent);
    console.log("  - Has characters:", hasCharacters, `(generated: ${generatedCharacterCount}, expected: ${expectedCharacterCount})`);
    console.log("  - All characters generated:", allCharactersGenerated);
    console.log("  - Content complete:", contentComplete);
    
    // Check current status in database
    let currentStatus = data.generation_status;
    console.log("📊 [STATUS CHECK] Current database status:", currentStatus);
    
    // Auto-correction logic: if content exists but status is wrong, correct it
    if (contentComplete && currentStatus && currentStatus.status !== 'completed') {
      console.log("🔧 [STATUS CHECK] Content exists but status is not 'completed', auto-correcting...");
      
      const completedStatus = {
        status: 'completed' as const,
        progress: 100,
        currentStep: 'Package generation completed',
        sections: {
          hostGuide: true,
          characters: true,
          clues: true,
          inspectorScript: true,
          characterMatrix: true
        }
      };
      
      // Update the database with corrected status
      const { error: updateError } = await supabase
        .from("mystery_packages")
        .update({
          generation_status: completedStatus,
          generation_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("conversation_id", mysteryId);
      
      if (updateError) {
        console.error("❌ [STATUS CHECK] Error updating corrected status:", updateError);
      } else {
        console.log("✅ [STATUS CHECK] Status auto-corrected to 'completed'");
        currentStatus = completedStatus;
      }
    }
    
    // Check if generation_status exists and is valid
    if (!currentStatus || typeof currentStatus !== 'object') {
      console.log("ℹ️ [STATUS CHECK] No valid generation_status found, checking completion dates and content");
      
      // Fallback: check completion dates and content to determine status
      if ((data.generation_completed_at && allCharactersGenerated) || contentComplete) {
        const completedStatus = {
          status: 'completed' as const,
          progress: 100,
          currentStep: 'Package generation completed',
          sections: {
            hostGuide: true,
            characters: true,
            clues: true,
            inspectorScript: true,
            characterMatrix: true
          }
        };
        console.log("✅ [STATUS CHECK] Inferring completed status from completion date or content:", completedStatus);
        return completedStatus;
      } else if (data.generation_started_at) {
        const inProgressStatus = {
          status: 'in_progress' as const,
          progress: 50,
          currentStep: 'Package generation in progress...',
          startedAt: data.generation_started_at,
          sections: {}
        };
        console.log("🔄 [STATUS CHECK] Inferring in_progress status from start date:", inProgressStatus);
        return inProgressStatus;
      }
      
      // No dates found, return not started
      const notStartedStatus = {
        status: 'not_started' as const,
        progress: 0,
        currentStep: 'Not started',
        sections: {}
      };
      console.log("📊 [STATUS CHECK] No dates found, returning not_started:", notStartedStatus);
      return notStartedStatus;
    }
    
    const status = currentStatus as GenerationStatus;
    console.log("✅ [STATUS CHECK] Returning generation status:", status);
    
    // Ensure status has all required fields
    const normalizedStatus: GenerationStatus = {
      status: status.status || 'not_started',
      progress: status.progress || 0,
      currentStep: status.currentStep || 'Unknown step',
      startedAt: data.generation_started_at,
      resumable: status.resumable,
      sections: status.sections || {}
    };
    
    console.log("📊 [STATUS CHECK] Normalized status:", normalizedStatus);
    return normalizedStatus;
  } catch (error) {
    console.error("❌ [STATUS CHECK] Error in getPackageGenerationStatus:", error);
    
    // Return a safe fallback status on error
    const errorStatus = {
      status: 'not_started' as const,
      progress: 0,
      currentStep: 'Error checking status',
      sections: {}
    };
    console.log("📊 [STATUS CHECK] Returning error fallback status:", errorStatus);
    return errorStatus;
  }
}

// Allowlist of editable fields on mystery_packages
const EDITABLE_PACKAGE_FIELDS = [
  'game_overview',
  'host_guide',
  'materials',
  'preparation_instructions',
  'timeline',
  'hosting_tips',
  'evidence_cards',
  'detective_script',
] as const;

// Allowlist of editable fields on mystery_characters
const EDITABLE_CHARACTER_FIELDS = [
  'character_name',
  'description',
  'background',
  'relationships',
  'rumors',
  'secret',
  'introduction',
  'round2_questions',
  'round2_innocent',
  'round2_guilty',
  'round2_accomplice',
  'round3_questions',
  'round3_innocent',
  'round3_guilty',
  'round3_accomplice',
  'round4_questions',
  'round4_innocent',
  'round4_guilty',
  'round4_accomplice',
  'final_innocent',
  'final_guilty',
  'final_accomplice',
] as const;

/**
 * Update a single field on a mystery_packages row.
 */
export async function updatePackageField(
  packageId: string,
  fieldName: string,
  value: string
): Promise<void> {
  if (!EDITABLE_PACKAGE_FIELDS.includes(fieldName as any)) {
    throw new Error(`Field "${fieldName}" is not editable`);
  }

  const { error } = await supabase
    .from('mystery_packages')
    .update({
      [fieldName]: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId);

  if (error) {
    console.error('Failed to update package field:', error);
    throw new Error(`Failed to save changes: ${error.message}`);
  }
}

/**
 * Update a single field on a mystery_characters row.
 */
export async function updateCharacterField(
  characterId: string,
  fieldName: string,
  value: string
): Promise<void> {
  if (!EDITABLE_CHARACTER_FIELDS.includes(fieldName as any)) {
    throw new Error(`Field "${fieldName}" is not editable`);
  }

  const { error } = await supabase
    .from('mystery_characters')
    .update({
      [fieldName]: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', characterId);

  if (error) {
    console.error('Failed to update character field:', error);
    throw new Error(`Failed to save changes: ${error.message}`);
  }
}
