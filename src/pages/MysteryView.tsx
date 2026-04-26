import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import {
  generateCompletePackage,
  resumePackageGeneration,
  getPackageGenerationStatus,
  GenerationStatus,
  updatePackageField,
  updateCharacterField,
} from "@/services/mysteryPackageService";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, Eye, XCircle, Loader2 } from "lucide-react";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MysteryCharacter } from "@/interfaces/mystery";
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { trackMysteryCreation, trackGenerationCompleted, trackGenerationFailed } from "@/lib/analytics";
import GenerationProgress from "@/components/GenerationProgress";

interface MysteryPackageData {
  title?: string;
  gameOverview?: string;
  hostGuide?: string;
  materials?: string;
  preparation?: string;
  timeline?: string;
  hostingTips?: string;
  evidenceCards?: string;
  detectiveScript?: string;
}

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [packageData, setPackageData] = useState<MysteryPackageData | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<MysteryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  // Controlled logging and polling
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const packageReadyNotified = useRef<boolean>(false);
  const lastStatusCheck = useRef<number>(0);
  const lastLogTime = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const generationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutNotifiedRef = useRef<boolean>(false);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);

  const debugLog = useCallback((message: string, data?: any) => {
    if (!DEBUG_MODE) return;
    
    const now = Date.now();
    // Only log every 15 seconds max
    if (now - lastLogTime.current > 15000) {
      console.log(`[MysteryView] ${message}`, data ? JSON.stringify(data).slice(0, 100) + '...' : '');
      lastLogTime.current = now;
    }
  }, []);

  // Generation time is consistent regardless of player count
  const getEstimatedTime = useCallback((_playerCount: number) => {
    return t('mysteryView.timing.small');
  }, [t]);

  // Fetch structured package data with proper error handling
  const fetchStructuredPackageData = useCallback(async () => {
    if (!id) {
      console.log("❌ [DEBUG] No ID provided to fetchStructuredPackageData");
      return;
    }

    try {
      console.log("🔍 [DEBUG] Fetching structured package data for:", id);
      
      // Fetch mystery packages data with structured fields
      const { data: packageData, error: packageError } = await supabase
        .from("mystery_packages")
        .select(`
          title,
          game_overview,
          host_guide,
          materials,
          preparation_instructions,
          timeline,
          hosting_tips,
          evidence_cards,
          evidence_card_images,
          detective_script,
          master_context,
          extracted_characters,
          id
        `)
        .eq("conversation_id", id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (packageError) {
        console.error("❌ [DEBUG] Error fetching package data:", packageError);
        return;
      }

      if (packageData) {
        console.log("✅ [DEBUG] Package data found:", packageData);
        
        // Map database fields to component props
        const structuredPackageData: MysteryPackageData = {
          title: packageData.title,
          gameOverview: packageData.game_overview,
          hostGuide: packageData.host_guide,
          materials: packageData.materials,
          preparation: packageData.preparation_instructions,
          timeline: packageData.timeline,
          hostingTips: packageData.hosting_tips,
          evidenceCards: packageData.evidence_cards,
          evidenceCardImages: packageData.evidence_card_images,
          detectiveScript: packageData.detective_script,
          master_context: packageData.master_context,
          extracted_characters: packageData.extracted_characters,
        };
        
        console.log("✅ [DEBUG] Structured package data loaded");

        // Fetch characters from database before setting state,
        // so all tabs populate at once (no partial content flash)
        const { data: charactersData, error: charactersError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id)
          .order("character_name");

        if (charactersError) {
          console.error("❌ [DEBUG] Error fetching characters:", charactersError);
        }

        // Batch state updates so all tabs show content simultaneously
        setPackageData(structuredPackageData);
        setPackageId(packageData.id);
        if (charactersData && charactersData.length > 0) {
          setCharacters(charactersData);
          console.log(`✅ [DEBUG] Loaded ${charactersData.length} characters from database`);
        }
      } else {
        console.log("ℹ️ [DEBUG] No package data found");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error in fetchStructuredPackageData:", error);
    }
  }, [id]);

  // Fetch conversation messages for title extraction
  const fetchMessages = useCallback(async () => {
    if (!id) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("❌ [DEBUG] Error fetching messages:", messagesError);
        return;
      }

      if (messagesData) {
        setMessages(messagesData);
        console.log(`✅ [DEBUG] Loaded ${messagesData.length} messages for title extraction`);
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error in fetchMessages:", error);
    }
  }, [id]);

  // Extract mystery title using the same logic as HomeDashboard
  const extractedTitle = useCallback(() => {
    if (!messages || messages.length === 0) return null;
    
    try {
      return extractTitleFromMessages(messages);
    } catch (error) {
      console.error("❌ [DEBUG] Error extracting title:", error);
      return null;
    }
  }, [messages]);

  // Get the best available title with proper fallback hierarchy
  const getMysteryTitle = useCallback(() => {
    const aiGeneratedTitle = extractedTitle();
    
    // Fallback hierarchy: AI title → conversation.title → theme → "Mystery Package"
    const title = aiGeneratedTitle || 
                 mystery?.title || 
                 mystery?.mystery_data?.theme || 
                 "Mystery Package";
    return title.replace(/\*\*/g, '');
  }, [extractedTitle, mystery]);

  // Save extracted title to database when available
  useEffect(() => {
    const updateMysteryTitle = async () => {
      if (!mystery?.id) return;

      const aiGeneratedTitle = extractedTitle();

      // Only update if we have a valid extracted title
      if (!aiGeneratedTitle) return;

      // Only update if current title is the default format
      const isDefaultTitle = mystery.title?.includes(' - ') && mystery.title?.includes('Players');
      if (!isDefaultTitle) return;

      console.log('🏷️ Updating mystery title to:', aiGeneratedTitle);

      const { error } = await supabase
        .from('conversations')
        .update({ title: aiGeneratedTitle })
        .eq('id', mystery.id);

      if (error) {
        console.error('Failed to update mystery title:', error);
      } else {
        console.log('✅ Mystery title updated successfully');
      }
    };

    updateMysteryTitle();
  }, [mystery?.id, mystery?.title, extractedTitle, messages]);

  // Resume generation handler
  const handleResumeGeneration = useCallback(async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    setGenerationTimedOut(false);
    timeoutNotifiedRef.current = false;
    try {
      toast.info("Resuming your mystery generation...");

      // Reset notification state on resume
      packageReadyNotified.current = false;
      
      await resumePackageGeneration(id);
      
      debugLog("Resume generation initiated");
      
    } catch (error: any) {
      debugLog("Error resuming package generation", error);
      setGenerating(false);
      toast.error(error.message || "Failed to resume generation");
    }
  }, [id, debugLog]);

  // Generate package handler
  const handleGeneratePackage = useCallback(async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    packageReadyNotified.current = false; // Reset notification flag
    setGenerationTimedOut(false);
    timeoutNotifiedRef.current = false;

    // Immediately show the progress card so the UI doesn't linger on the
    // "Generate" button in its disabled state while we wait for the first
    // poll to flip generationStatus to in_progress.
    setGenerationStatus({
      status: 'in_progress',
      progress: 0,
      currentStep: 'Package generation in progress...',
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
      },
    });
    setLastUpdate(new Date());

    try {
      const estimatedTime = getEstimatedTime(mystery?.player_count || 6);
      toast.info(`Starting generation of your mystery package. This will take ${estimatedTime}...`);

      // Just call the webhook - don't wait for completion
      await generateCompletePackage(id);

      // Track mystery creation event for analytics
      trackMysteryCreation(mystery?.theme || 'unknown', {
        mystery_id: id,
        player_count: mystery?.player_count || 6,
        has_theme: !!mystery?.theme
      });

      debugLog("Generation started, auto-refresh will check status");
      
    } catch (error: any) {
      debugLog("Error starting package generation", error);
      setGenerating(false);
      // Roll back the optimistic progress card so the user can retry from the
      // Generate button instead of being stuck on an in_progress view.
      setGenerationStatus(null);
      toast.error(error.message || "Failed to start package generation");
    }
  }, [id, debugLog]);

  // Enhanced status checking with comprehensive completion detection
  const checkGenerationStatus = useCallback(async () => {
    if (!id) return null;
    
    const now = Date.now();
    
    // Don't check more than once every 10 seconds
    if (now - lastStatusCheck.current < 10000) {
      debugLog("🔄 Status check throttled");
      return generationStatus;
    }
    
    lastStatusCheck.current = now;
    
    try {
      console.log("=== STATUS CHECK DEBUG === Starting comprehensive status check");
      
      // STEP 1: Check mystery_packages table for completion indicators
      const { data: packageData, error: packageError } = await supabase
        .from("mystery_packages")
        .select(`
          title,
          host_guide,
          generation_completed_at,
          generation_status,
          id,
          extracted_characters,
          characters:mystery_characters(count)
        `)
        .eq("conversation_id", id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("=== STATUS CHECK DEBUG === Package data:", packageData);
      if (packageError) {
        console.error("=== STATUS CHECK DEBUG === Package error:", packageError);
      }

      // STEP 2: Check conversations table for completion indicators  
      const { data: conversationData, error: conversationError } = await supabase
        .from("conversations")
        .select(`
          has_complete_package,
          is_paid,
          needs_package_generation,
          status,
          display_status
        `)
        .eq("id", id)
        .single();

      console.log("=== STATUS CHECK DEBUG === Conversation data:", conversationData);
      if (conversationError) {
        console.error("=== STATUS CHECK DEBUG === Conversation error:", conversationError);
      }

      // STEP 3: Determine completion status from multiple indicators
      const hasActualContent = packageData && (
        packageData.title ||
        packageData.host_guide ||
        packageData.generation_completed_at
      );

      // NOTE: is_paid alone does NOT indicate completion — it's set when the user pays,
      // before generation finishes. Only has_complete_package is a reliable completion signal.
      const conversationIndicatesComplete = conversationData && (
        conversationData.has_complete_package === true
      );

      const packageStatusComplete = packageData?.generation_status?.status === 'completed';
      const packageNeedsReview = packageData?.generation_status?.status === 'needs_review';

      // If flagged as needs_review, respect that and don't override
      if (packageNeedsReview) {
        const needsReviewStatus = {
          status: 'needs_review' as const,
          progress: 100,
          currentStep: packageData?.generation_status?.currentStep || 'Some character content needs attention',
          sections: packageData?.generation_status?.sections || { hostGuide: true, characters: false, clues: true },
          resumable: false,
        };
        setGenerationStatus(needsReviewStatus as any);
        setLastUpdate(new Date());
        setGenerating(false);
        return needsReviewStatus as any;
      }

      // Validate that all expected characters have been generated
      let allCharactersGenerated = true;
      if (packageData?.extracted_characters) {
        try {
          const extracted = typeof packageData.extracted_characters === 'string'
            ? JSON.parse(packageData.extracted_characters)
            : packageData.extracted_characters;
          const expectedCount = Array.isArray(extracted) ? extracted.length : 0;
          const generatedCount = packageData.characters?.[0]?.count ?? 0;
          allCharactersGenerated = expectedCount === 0 || generatedCount >= expectedCount;
          console.log(`=== STATUS CHECK DEBUG === Character count: ${generatedCount} generated, ${expectedCount} expected, allGenerated: ${allCharactersGenerated}`);
        } catch {
          allCharactersGenerated = true; // If parsing fails, don't block
        }
      }

      console.log("=== STATUS CHECK DEBUG === Completion indicators:", {
        hasActualContent,
        conversationIndicatesComplete,
        packageStatusComplete,
        allCharactersGenerated,
        packageGenerationStatus: packageData?.generation_status,
        conversationStatus: conversationData
      });

      // If generation_status is explicitly 'in_progress', don't auto-complete unless
      // there is actual content (title/host_guide). This prevents premature completion
      // when the user navigates away during generation and comes back.
      const generationExplicitlyInProgress = packageData?.generation_status?.status === 'in_progress';

      // STEP 4: If completion indicators are true AND all characters generated, force completion
      // When generation is explicitly in-progress, require actual content — don't rely solely
      // on conversation-level flags which may have been set before generation finished.
      if ((hasActualContent || ((conversationIndicatesComplete || packageStatusComplete) && !generationExplicitlyInProgress)) && allCharactersGenerated) {
        const previousStatus = generationStatus?.status;
        console.log("=== STATUS CHECK DEBUG === Completion detected, previous status:", previousStatus);
        
        // Create completed status object
        const completedStatus = {
          status: 'completed' as const,
          progress: 100,
          currentStep: 'Package generation completed',
          sections: {
            hostGuide: true,
            characters: true,
            clues: true
          },
          resumable: false
        };
        
        // Update the database status to match reality
        if (packageData?.id) {
          await supabase
            .from("mystery_packages")
            .update({
              generation_status: completedStatus
            })
            .eq("id", packageData.id);
        }
        
        console.log("=== STATUS CHECK DEBUG === Forced status to completed");
        setGenerationStatus(completedStatus);
        setLastUpdate(new Date());
        
        // Only trigger completion actions when status changes to completed
        if (previousStatus !== 'completed') {
          console.log("=== STATUS CHECK DEBUG === Status changed to completed - triggering completion actions");
          // Keep generating=true until all data is loaded so tabs show spinner, not placeholder

          // Track generation completion for analytics
          trackGenerationCompleted(id!, {
            theme: mystery?.theme,
            player_count: mystery?.player_count,
          });

          // Fetch the completed package data BEFORE clearing generating state
          await fetchStructuredPackageData();

          // Update conversation status for consistency
          await supabase
            .from("conversations")
            .update({
              status: "purchased",
              is_paid: true,
              needs_package_generation: false,
              display_status: "purchased",
              has_complete_package: true
            })
            .eq("id", id);

          // Now that data is loaded, clear generating state so content shows
          setGenerating(false);

          // Show success notification only once
          if (!packageReadyNotified.current) {
            toast.success("Your mystery package is ready!", {
              duration: 10000,
              id: 'mystery-completed'
            });
            packageReadyNotified.current = true;
          }
        }
        
        return completedStatus;
      }
      
      // STEP 5: Fallback to normal status checking if no completion detected
      console.log("=== STATUS CHECK DEBUG === No completion detected, using normal status check");
      const status = await getPackageGenerationStatus(id);
      const previousStatus = generationStatus?.status;
      
      console.log("=== STATUS CHECK DEBUG === Normal status result:", {
        currentStatus: status.status,
        previousStatus,
        statusChanged: status.status !== previousStatus
      });
      
      setGenerationStatus(status);
      setLastUpdate(new Date());
      
      // Handle failed status
      if (status.status === 'failed' && previousStatus !== 'failed') {
        console.log("=== STATUS CHECK DEBUG === Generation failed");
        setGenerating(false);

        // Track generation failure for analytics
        trackGenerationFailed(id!, {
          error_step: status.currentStep || 'unknown',
          resumable: status.resumable,
        });
        
        // Show detailed error message with current step
        const errorMessage = status.currentStep || "Generation failed at an unknown step";
        
        if (status.resumable) {
          toast.error(
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">Generation Paused</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                Don't worry - your progress has been saved and you can resume where you left off.
              </p>
              <Button size="sm" onClick={handleResumeGeneration} className="w-full">
                <RefreshCw className="h-3 w-3 mr-1" />
                Resume Generation
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Still having trouble? <a href="/support" className="underline text-primary hover:text-primary/80">Contact support</a>
              </p>
            </div>,
            {
              duration: 15000,
              id: 'mystery-failed-resumable'
            }
          );
        } else {
          toast.error(
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-semibold">Generation Failed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                You can try generating your mystery package again.
              </p>
              <Button size="sm" onClick={handleGeneratePackage} className="w-full">
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Still having trouble? <a href="/support" className="underline text-primary hover:text-primary/80">Contact support</a>
              </p>
            </div>,
            {
              duration: 15000,
              id: 'mystery-failed-retry'
            }
          );
        }
      }
      
      return status;
    } catch (error) {
      console.error("=== STATUS CHECK DEBUG === Error in status checking:", error);
      return null;
    }
  }, [id, navigate, generationStatus?.status, fetchStructuredPackageData, debugLog, handleResumeGeneration, handleGeneratePackage]);

  // Polling has been removed in favor of Supabase Realtime subscriptions
  // for more efficient and immediate updates

  // NEW: Realtime subscription for instant updates
  useEffect(() => {
    if (!id) return;

    console.log("🔔 [REALTIME] Setting up Supabase Realtime subscription for mystery_packages");
    
    const subscription = supabase
      .channel('mystery_packages')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'mystery_packages',
          filter: `conversation_id=eq.${id}`
        }, 
        async (payload) => {
          console.log("🔔 [REALTIME] Real-time update received:", payload);

          // Trigger immediate status check + character/package refresh.
          // Without the package re-fetch, characters state stays stale and
          // the "We're Finalizing" warning fires even after children land.
          try {
            await Promise.all([
              checkGenerationStatus(),
              fetchStructuredPackageData(),
            ]);
            console.log("🔔 [REALTIME] Status + package refresh triggered by real-time update");
          } catch (error) {
            console.error("🔔 [REALTIME] Error during real-time triggered refresh:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 [REALTIME] Subscription status:", status);
      });

    // Cleanup function
    return () => {
      console.log("🔔 [REALTIME] Unsubscribing from real-time updates");
      subscription.unsubscribe();
    };
  }, [id, checkGenerationStatus, fetchStructuredPackageData]);

  // Realtime subscription for mystery_characters INSERTs.
  // Each child scenario insert triggers a refetch so the live "X of Y characters ready"
  // count in the GenerationProgress component updates as children land.
  useEffect(() => {
    if (!packageId) return;

    console.log("🔔 [REALTIME] Setting up mystery_characters subscription for packageId:", packageId);

    const subscription = supabase
      .channel(`mystery_characters_${packageId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mystery_characters',
          filter: `package_id=eq.${packageId}`,
        },
        async () => {
          try {
            await fetchStructuredPackageData();
          } catch (error) {
            console.error("🔔 [REALTIME] Error refreshing on character insert:", error);
          }
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [packageId, fetchStructuredPackageData]);

  // Generation timeout detection — 15 minutes
  const GENERATION_TIMEOUT_MS = 15 * 60 * 1000;

  const notifyGenerationIssue = useCallback(async (conversationId: string) => {
    if (timeoutNotifiedRef.current) return;
    timeoutNotifiedRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('notify-generation-issue', {
        body: { conversation_id: conversationId },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      console.log("📧 Generation issue notification sent");
    } catch (err) {
      console.error("Failed to send generation issue notification:", err);
    }
  }, []);

  useEffect(() => {
    // Start timer when generation is in progress
    if (generating && generationStatus?.status === 'in_progress' && id) {
      // Clear any previous timer
      if (generationTimerRef.current) clearTimeout(generationTimerRef.current);

      generationTimerRef.current = setTimeout(() => {
        // Only trigger if still generating when timer fires
        if (generating) {
          console.log("⏰ Generation timeout reached (15 min)");
          setGenerationTimedOut(true);
          notifyGenerationIssue(id);
        }
      }, GENERATION_TIMEOUT_MS);
    }

    // Clear timer when generation completes or fails
    if (!generating || generationStatus?.status === 'completed' || generationStatus?.status === 'failed') {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      if (generationStatus?.status === 'completed') {
        setGenerationTimedOut(false);
        timeoutNotifiedRef.current = false;
      }
    }

    return () => {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
      }
    };
  }, [generating, generationStatus?.status, id, notifyGenerationIssue]);

  // Initial data loading
  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      setLoading(true);
      try {
        console.log("🔍 [DEBUG] Starting fetchMystery for:", id);
        
        // Check if this is a redirect from a purchase
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseStatus = urlParams.get('purchase');
        
        if (purchaseStatus === 'success') {
          toast.success("Purchase successful! You now have full access to this mystery package.");

          // Mark as paid immediately so the tab view shows (with generate button inside)
          await supabase
            .from("conversations")
            .update({ is_paid: true, display_status: "purchased" })
            .eq("id", id);
        }

        const { data: conversation, error } = await supabase
          .from("conversations")
          .select("*, mystery_data, is_paid, has_complete_package, needs_package_generation")
          .eq("id", id)
          .single();

        if (error) {
          console.error("❌ [DEBUG] Error fetching mystery:", error);
          toast.error("Failed to load mystery");
          return;
        }

        console.log("✅ [DEBUG] Mystery data loaded:", {
          id: conversation.id,
          is_paid: conversation.is_paid,
          needs_package_generation: conversation.needs_package_generation,
          has_complete_package: conversation.has_complete_package
        });

        setMystery(conversation);

        // Fetch messages for title extraction
        await fetchMessages();

        // Check generation status if package generation is needed OR if already paid
        if (conversation.needs_package_generation || conversation.is_paid || conversation.has_complete_package) {
          const status = await getPackageGenerationStatus(id);
          console.log("📊 [DEBUG] Initial status check:", status);
          setGenerationStatus(status);
          setLastUpdate(new Date());
          
          if (status.status === 'in_progress') {
            setGenerating(true);
            console.log("🔄 [DEBUG] Generation in progress, starting polling");

            // Check if generation has already been running > 15 min on page load
            const { data: pkgCheck } = await supabase
              .from("mystery_packages")
              .select("generation_started_at")
              .eq("conversation_id", id)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pkgCheck?.generation_started_at) {
              const elapsed = Date.now() - new Date(pkgCheck.generation_started_at).getTime();
              if (elapsed > 15 * 60 * 1000) {
                console.log("⏰ Generation already exceeded 15 min on page load");
                setGenerationTimedOut(true);
                notifyGenerationIssue(id);
              }
            }
          } else if (status.status === 'completed') {
            // Reset notification state on new page load if package is complete
            packageReadyNotified.current = false;
            console.log("✅ [DEBUG] Generation already completed, loading data");
            
            // Load the package data immediately
            await fetchStructuredPackageData();
            
            await supabase
              .from("conversations")
              .update({
                is_paid: true,
                has_complete_package: true,
                display_status: "purchased",
                mystery_data: {
                  ...conversation.mystery_data,
                  status: "purchased"
                }
              })
              .eq("id", id);
          }
        }

        // Always try to fetch package data if conversation indicates it should exist
        if (conversation.has_complete_package || conversation.is_paid) {
          await fetchStructuredPackageData();
        }
      } catch (error) {
        console.error("❌ [DEBUG] Error in fetchMystery:", error);
        toast.error("Failed to load mystery");
      } finally {
        setLoading(false);
      }
    };

    fetchMystery();
  }, [id, fetchStructuredPackageData, fetchMessages]);

  // Manual refresh function — bypasses the 10s throttle on checkGenerationStatus,
  // and re-pulls character/package data (the throttled path doesn't always do that).
  const handleManualRefresh = useCallback(async () => {
    debugLog("Manual refresh triggered");
    lastStatusCheck.current = 0; // bypass throttle
    await Promise.all([
      checkGenerationStatus(),
      fetchStructuredPackageData(),
    ]);
    setLastUpdate(new Date());
  }, [checkGenerationStatus, fetchStructuredPackageData, debugLog]);

  // Field-level update handler for mystery_packages
  const handlePackageFieldUpdate = useCallback(async (fieldName: string, value: string) => {
    if (!packageId) throw new Error("Package ID not available");
    await updatePackageField(packageId, fieldName, value);
    // Optimistically update local state
    const fieldMap: Record<string, keyof MysteryPackageData> = {
      game_overview: 'gameOverview',
      host_guide: 'hostGuide',
      materials: 'materials',
      preparation_instructions: 'preparation',
      timeline: 'timeline',
      hosting_tips: 'hostingTips',
      evidence_cards: 'evidenceCards',
      detective_script: 'detectiveScript',
    };
    const stateKey = fieldMap[fieldName];
    if (stateKey && packageData) {
      setPackageData(prev => prev ? { ...prev, [stateKey]: value } : prev);
    }
  }, [packageId, packageData]);

  // Field-level update handler for mystery_characters
  const handleCharacterFieldUpdate = useCallback(async (characterId: string, fieldName: string, value: string) => {
    await updateCharacterField(characterId, fieldName, value);
    // Optimistically update local state
    setCharacters(prev =>
      prev.map(c =>
        c.id === characterId ? { ...c, [fieldName]: value } : c
      )
    );
  }, []);

  // Render generation progress with mobile optimization
  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    // Show error state for failed generation
    if (generationStatus.status === 'failed') {
      return (
        <Card className={cn(
          "mb-6 border-red-500/30",
          isMobile && "mx-2"
        )}>
          <CardHeader className={cn(isMobile && "p-4 pb-3")}>
            <CardTitle className={cn(
              "flex items-center justify-between text-red-700",
              isMobile ? "text-lg flex-col space-y-2 items-start" : "flex-row"
            )}>
              <div className="flex items-center space-x-2">
                <XCircle className={cn(
                  "text-red-500",
                  isMobile ? "h-4 w-4" : "h-5 w-5"
                )} />
                <span className={cn(isMobile && "text-base")}>Generation Failed</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                className={cn(
                  "h-8 w-8 p-0 text-muted-foreground hover:text-foreground",
                  isMobile && "self-end"
                )}
                title="Refresh status"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription className={cn(
              "text-red-600",
              isMobile && "text-sm"
            )}>
              {generationStatus.currentStep || "An error occurred during generation"}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4",
            isMobile && "p-4 pt-0 space-y-3"
          )}>
            <Alert className="border-red-500/30">
              <AlertTriangle className={cn(
                isMobile ? "h-3 w-3" : "h-4 w-4"
              )} />
              <AlertTitle className={cn(isMobile && "text-sm")}>What happened?</AlertTitle>
              <AlertDescription className={cn(isMobile && "text-xs")}>
                {generationStatus.resumable 
                  ? "Your generation encountered an issue but can be resumed from where it left off. Your progress has been saved."
                  : "The generation process failed and needs to be restarted. Don't worry - this happens sometimes and trying again usually works."
                }
              </AlertDescription>
            </Alert>
            
            <div className={cn(
              "flex space-x-2",
              isMobile && "flex-col space-x-0 space-y-2"
            )}>
              {generationStatus.resumable ? (
                <Button 
                  onClick={handleResumeGeneration} 
                  disabled={generating} 
                  className={cn(
                    "flex-1",
                    isMobile && "w-full text-sm h-10"
                  )}
                >
                  <RefreshCw className={cn(
                    "mr-2",
                    isMobile ? "h-3 w-3" : "h-4 w-4"
                  )} />
                  Resume Generation
                </Button>
              ) : (
                <Button 
                  onClick={handleGeneratePackage} 
                  disabled={generating} 
                  className={cn(
                    "flex-1",
                    isMobile && "w-full text-sm h-10"
                  )}
                >
                  <RefreshCw className={cn(
                    "mr-2",
                    isMobile ? "h-3 w-3" : "h-4 w-4"
                  )} />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Timeout state — generation has been running for over 15 minutes
    if (generationTimedOut) {
      return (
        <Card className={cn(
          "mb-6 border-amber-500/30",
          isMobile && "mx-2"
        )}>
          <CardHeader className={cn(isMobile && "p-4 pb-3")}>
            <CardTitle className={cn(
              "flex items-center space-x-2 text-amber-800",
              isMobile && "text-base"
            )}>
              <AlertTriangle className={cn(
                "text-amber-600",
                isMobile ? "h-4 w-4" : "h-5 w-5"
              )} />
              <span>Taking Longer Than Expected</span>
            </CardTitle>
            <CardDescription className={cn(
              "text-amber-700",
              isMobile && "text-sm"
            )}>
              Your mystery was generated but we're having an issue displaying the content.
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4",
            isMobile && "p-4 pt-0 space-y-3"
          )}>
            <Alert className="border-amber-500/30">
              <CheckCircle2 className={cn(
                "text-green-500",
                isMobile ? "h-3 w-3" : "h-4 w-4"
              )} />
              <AlertTitle className={cn(isMobile && "text-sm")}>Don't worry — your mystery is safe!</AlertTitle>
              <AlertDescription className={cn(isMobile && "text-xs")}>
                Our technical team has been automatically notified and will resolve this as soon as possible. You don't need to do anything — we'll make sure your complete mystery package is available for you shortly.
              </AlertDescription>
            </Alert>
            <p className={cn(
              "text-sm text-amber-700",
              isMobile && "text-xs"
            )}>
              You can safely close this page and come back later. If the issue persists, please reach out to{" "}
              <a href="mailto:support@mysterymaker.party" className="underline font-medium">support@mysterymaker.party</a>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              <RefreshCw className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
              Check Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Compute character generation progress for the live count.
    // extracted_characters is set early in the parent flow; mystery_characters rows
    // arrive as children complete. Falls back to player_count if extracted not yet set.
    let charactersExpected = 0;
    if (packageData?.extracted_characters) {
      try {
        const extracted = typeof packageData.extracted_characters === 'string'
          ? JSON.parse(packageData.extracted_characters)
          : packageData.extracted_characters;
        if (Array.isArray(extracted)) charactersExpected = extracted.length;
      } catch { /* fall back below */ }
    }
    if (charactersExpected === 0) charactersExpected = mystery?.player_count || 0;

    // Pass real DB content signals to GenerationProgress so it derives a
    // realistic progress that ticks gradually as content lands — instead of
    // trusting generation_status.progress which can jump to 100 prematurely.
    return (
      <GenerationProgress
        hasMasterContext={!!packageData?.master_context}
        hasGameOverview={!!packageData?.gameOverview}
        hasMaterials={!!packageData?.materials}
        charactersDone={characters.length}
        charactersExpected={charactersExpected}
        hasEvidence={!!packageData?.evidenceCards}
        hasDetective={!!packageData?.detectiveScript}
        hasImages={!!packageData?.evidenceCardImages}
        isMobile={isMobile}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className={cn(
          "flex-1 py-12 px-4",
          isMobile && "py-6 px-3"
        )}>
          <div className="container mx-auto max-w-4xl">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className={cn(
              "text-center mt-4",
              isMobile && "text-sm mt-3"
            )}>
              Loading your mystery...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Log debug info for tab visibility
  if ((mystery?.is_paid || generationStatus?.status === 'completed' ||
      (!generating && !generationStatus && packageData && packageData.gameOverview &&
       packageData.hostGuide)) && characters.length > 0) {
    console.log("🎭 [DEBUG] Showing tabs because:", {
      isPaid: mystery?.is_paid,
      generationComplete: generationStatus?.status === 'completed',
      hasPackageData: !!packageData,
      hasGameOverview: !!packageData?.gameOverview,
      hasHostGuide: !!packageData?.hostGuide,
      charactersCount: characters.length
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={cn(
        "flex-1 py-12 px-4",
        isMobile && "py-6 px-3"
      )}>
        <div className={cn(
          "container mx-auto max-w-4xl",
          isMobile && "max-w-full"
        )}>
          {/* Show "finalizing" card only when status definitively says so.
              The old fallback path (is_paid && gameOverview) was firing prematurely
              during in_progress generation because gameOverview lands at 60% but
              characters land later — causing a false positive between those steps. */}
          {/* Only show the actual warning when generation_status is *explicitly* needs_review.
              The earlier "completed but chars==0" case is misleading — that just means the parent
              flipped status to completed before all children finished inserting (timing race).
              For that case, fall through to the GenerationProgress UI further down. */}
          {generationStatus?.status === 'needs_review' ? (
            <Card className={cn(
              "mb-6 border-amber-500/40",
              isMobile && "mx-2"
            )}>
              <CardHeader className={cn(isMobile && "p-4 pb-3")}>
                <CardTitle className={cn(
                  "flex items-center space-x-2 text-amber-700 dark:text-amber-300",
                  isMobile && "text-base"
                )}>
                  <AlertTriangle className={cn(
                    "text-amber-600 dark:text-amber-400",
                    isMobile ? "h-4 w-4" : "h-5 w-5"
                  )} />
                  <span>We're Finalizing Your Mystery</span>
                </CardTitle>
                <CardDescription className={cn(
                  "text-amber-700 dark:text-amber-200",
                  isMobile && "text-sm"
                )}>
                  Your mystery was generated but some character content needs attention.
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(
                "space-y-4",
                isMobile && "p-4 pt-0 space-y-3"
              )}>
                <Alert className="border-amber-500/40">
                  <CheckCircle2 className={cn(
                    "text-green-500 dark:text-green-400",
                    isMobile ? "h-3 w-3" : "h-4 w-4"
                  )} />
                  <AlertTitle className={cn(isMobile && "text-sm")}>Don't worry — your mystery is safe!</AlertTitle>
                  <AlertDescription className={cn(isMobile && "text-xs")}>
                    Our technical team has been automatically notified and will resolve this as soon as possible. You don't need to do anything — we'll make sure your complete mystery package is available for you shortly.
                  </AlertDescription>
                </Alert>
                <p className={cn(
                  "text-sm text-amber-700 dark:text-amber-200",
                  isMobile && "text-xs"
                )}>
                  You can safely close this page and come back later. If the issue persists, please reach out to{" "}
                  <a href="mailto:support@mysterymaker.party" className="underline font-medium">support@mysterymaker.party</a>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-200 dark:hover:bg-amber-950/30"
                >
                  <RefreshCw className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  Check Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Show TabView only when ALL major content has landed:
            // characters AND evidence_cards AND detective_script. status=completed alone isn't
            // enough — the parent sometimes flips to completed before children/evidence finish.
            // For legacy mysteries (no status tracking), fall back to gameOverview presence.
            ((generationStatus?.status === 'completed' && characters.length > 0
              && !!packageData?.evidenceCards && !!packageData?.detectiveScript) ||
             (!generating && !generationStatus && packageData?.gameOverview && characters.length > 0))) ? (
            <MysteryPackageTabView
              packageContent={packageContent || ""}
              mysteryTitle={getMysteryTitle()}
              generationStatus={generationStatus || undefined}
              conversationId={id}
              onGenerateClick={handleGeneratePackage}
              isGenerating={generating}
              packageData={packageData || undefined}
              characters={characters}
              estimatedTime={getEstimatedTime(mystery?.player_count || 6)}
              packageId={packageId || undefined}
              isPaid={mystery?.is_paid}
              mysteryType={mystery?.mystery_type}
              mysteryStyle={mystery?.mystery_style}
              hasAccomplice={mystery?.has_accomplice}
              playerCount={mystery?.player_count}
              scriptType={mystery?.script_type as 'full' | 'pointForm' | 'both' | null | undefined}
              onPackageFieldUpdate={packageId ? handlePackageFieldUpdate : undefined}
              onCharacterFieldUpdate={handleCharacterFieldUpdate}
            />
          ) : (
            // Show generation progress or start button.
            // Also treat "completed but content not all in" as still-in-progress, since the
            // parent sometimes flips to completed before children/evidence finish (timing race).
            (generationStatus?.status === 'in_progress' ||
             (generationStatus?.status === 'completed' &&
              (characters.length === 0 || !packageData?.evidenceCards || !packageData?.detectiveScript)))
              ? renderGenerationProgress() : (
              <Card className={cn(
                "mb-6",
                isMobile && "mx-2"
              )}>
                <CardHeader className={cn(isMobile && "p-4 pb-3")}>
                  <CardTitle className={cn(isMobile && "text-lg")}>
                    Generate Your Mystery Package
                  </CardTitle>
                  <CardDescription className={cn(isMobile && "text-sm")}>
                    Your mystery is ready to be generated. Click the button below to create your custom murder mystery package.
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "p-4 pt-0")}>
                  <Button
                    onClick={handleGeneratePackage}
                    disabled={generating}
                    className={cn(
                      "w-full sm:w-auto",
                      isMobile && "w-full text-sm h-11"
                    )}
                  >
                    {generating ? (
                      <>
                        <RefreshCw className={cn(
                          "mr-2 animate-spin",
                          isMobile ? "h-3 w-3" : "h-4 w-4"
                        )} />
                        Starting Generation...
                      </>
                    ) : (
                      "Generate Mystery Package"
                    )}
                  </Button>
                  <p className={cn(
                    "text-sm text-muted-foreground mt-3",
                    isMobile && "text-xs mt-2"
                  )}>
                    Generation typically takes {getEstimatedTime(mystery?.player_count || 6)}. This page will auto-refresh to show progress.
                  </p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MysteryView;
