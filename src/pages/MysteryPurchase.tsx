import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { CheckCircle, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Mystery } from "@/interfaces/mystery";
import MysteryPreviewCard from "@/components/purchase/MysteryPreviewCard";
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { generateCompletePackage } from "@/services/mysteryPackageService";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { trackPurchasePageView, trackBeginCheckout } from "@/lib/analytics";
import { useWelcomeDiscount } from "@/hooks/useWelcomeDiscount";
import { ORIGINAL_PRICE, DISCOUNTED_PRICE, DISCOUNT_PERCENT, formatTimeRemaining } from "@/lib/discountUtils";
import { Clock, Tag } from "lucide-react";

interface Character {
  name: string;
  description: string;
}

interface Evidence {
  title: string;
  description: string;
}

interface ParsedMysteryDetails {
  premise: string;
  overview?: string;
  gameDetails?: string;
  characters: Character[];
  evidence?: Evidence[];
}

const MysteryPurchase = () => {
  const { id } = useParams();
  const [processing, setProcessing] = useState(false);
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [parsedDetails, setParsedDetails] = useState<ParsedMysteryDetails | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isDevMode = import.meta.env.DEV || (window.location.hostname === 'localhost');
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { isActive: hasDiscount, discountInfo, timeRemaining } = useWelcomeDiscount();

  // Enhanced extraction functions with better pattern matching
  const extractGameOverview = (content: string): string => {
    // Look for game overview section which might be marked with different headers
    const overviewPatterns = [
      /(?:##?\s*(?:GAME OVERVIEW|OVERVIEW|GAME INTRODUCTION|INTRODUCTION))([\s\S]*?)(?=##|$)/i,
      /(?:".*?")\s+is\s+a\s+([\s\S]*?)(?=\.\s)/i
    ];
    
    for (const pattern of overviewPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        return match[1].trim().replace(/^\s*[-*]\s*/, '');
      }
    }
    
    return '';
  };

  const extractPremise = (content: string): string => {
    // Look for premise or similar sections with case-insensitive matching
    const premisePatterns = [
      /(?:##?\s*(?:PREMISE|Background|Setting|SETTING|SCENARIO|Scenario|THE STORY|Story))([\s\S]*?)(?=##|$)/i,
      /(?:GAME OVERVIEW)([\s\S]*?)(?=##|MATERIALS NEEDED|BEFORE THE PARTY|$)/i
    ];
    
    for (const pattern of premisePatterns) {
      const match = content.match(pattern);
      if (match?.[1] && match[1].trim().length > 20) {
        return match[1].trim().replace(/^\s*[-*]\s*/, '');
      }
    }
    
    // Fallback: try to find the first substantial paragraph if no premise section exists
    const fallbackMatch = content.match(/^([^#]+)/);
    if (fallbackMatch?.[1] && fallbackMatch[1].trim().length > 50) {
      return fallbackMatch[1].trim().replace(/^\s*[-*]\s*/, '');
    }
    
    return '';
  };

  const parseCharacters = (content: string): Character[] => {
    const characters: Character[] = [];
    
    // Try to find character sections with case-insensitive matching
    const characterSectionsPatterns = [
      /(?:##?\s*(?:CHARACTER LIST|Characters|CHARACTERS|CHARACTER|SUSPECTS))([\s\S]*?)(?=##|$)/i,
      /(?:##?\s*(?:[A-Z\s]+ - CHARACTER GUIDE))([\s\S]*?)(?=##|$)/i
    ];
    
    let characterSection = '';
    for (const pattern of characterSectionsPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        characterSection = match[1];
        break;
      }
    }
    
    if (!characterSection) return characters;
    
    // Pattern 1: Character with description after colon/dash
    const formatOneMatches = Array.from(characterSection.matchAll(/(?:\d+\.|\*|\-)\s*\*\*([^*]+)\*\*\s*[-–:]\s*([^#\n]+)/g));
    
    // Pattern 2: Character name in bold followed by description
    const formatTwoMatches = Array.from(characterSection.matchAll(/\*\*([^*]+)\*\*\s*[-–:]\s*([^#\n]+)/g));
    
    // Pattern 3: Character name as header followed by description
    const formatThreeMatches = Array.from(content.matchAll(/##?\s*([A-Z\s]+)\s*-\s*CHARACTER GUIDE\s*\n+(?:CHARACTER DESCRIPTION\s*\n+)?([\s\S]*?)(?=YOUR BACKGROUND|YOUR RELATIONSHIPS|##|$)/ig));

    // Use the most populated set of matches
    let allMatches = [];
    if (formatOneMatches.length >= formatTwoMatches.length && formatOneMatches.length >= formatThreeMatches.length) {
      allMatches = formatOneMatches;
    } else if (formatTwoMatches.length >= formatOneMatches.length && formatTwoMatches.length >= formatThreeMatches.length) {
      allMatches = formatTwoMatches;
    } else {
      allMatches = formatThreeMatches;
    }
    
    for (const match of allMatches) {
      const [_, name, description] = match;
      if (name && description) {
        const cleanName = name.trim().replace(/^\d+\.\s*/, '');
        let cleanDescription = description.trim();
        
        characters.push({
          name: cleanName,
          description: cleanDescription
        });
      }
    }

    // If we still don't have characters, try another approach for character names only
    if (characters.length === 0) {
      const nameOnlyMatches = characterSection.match(/\*\*([^*]+)\*\*/g);
      if (nameOnlyMatches) {
        nameOnlyMatches.forEach(match => {
          const name = match.replace(/\*\*/g, '').trim();
          if (name) {
            characters.push({
              name,
              description: t("purchase.preview.characterPlaceholder")
            });
          }
        });
      }
      
      // Last resort: look for character names as headers
      if (characters.length === 0) {
        const headerMatches = Array.from(content.matchAll(/##\s*([A-Z][A-Z\s]+[A-Z])\s*(?:-|–)/g));
        headerMatches.forEach(match => {
          const name = match[1].trim();
          if (name && name.length > 2 && !name.match(/EVIDENCE CARD|HOST GUIDE/i)) {
            characters.push({
              name,
              description: t("purchase.preview.characterPlaceholderFull")
            });
          }
        });
      }
    }

    return characters;
  };
  
  const parseEvidence = (content: string): Evidence[] => {
    const evidence: Evidence[] = [];
    
    // Try to find evidence sections
    const evidenceSectionsPattern = /(?:##?\s*(?:EVIDENCE CARDS|CLUES|EVIDENCE|CLUE CARDS))([\s\S]*?)(?=##|$)/i;
    
    const evidenceItemPattern = /(?:##?\s*EVIDENCE CARD #?\d+:?\s*([^\n]+)|"?EVIDENCE CARD #?\d+:?\s*([^\n]+)"?)([\s\S]*?)(?=(?:##?\s*EVIDENCE CARD)|##|$)/gi;
    
    const match = content.match(evidenceSectionsPattern);
    const evidenceSection = match?.[1] || content;
    
    const evidenceMatches = Array.from(evidenceSection.matchAll(evidenceItemPattern));
    
    for (const match of evidenceMatches) {
      const title = (match[1] || match[2]).trim();
      const description = match[3].trim().split('\n')[0]; // Get just the first line
      
      if (title) {
        evidence.push({
          title,
          description: description || t("purchase.preview.evidencePlaceholder")
        });
      }
    }
    
    return evidence;
  };

  useEffect(() => {
    const fetchMysteryAndMessages = async () => {
      try {
        // Check if this is a redirect from Stripe with a success parameter
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseStatus = urlParams.get('purchase');
        
        if (purchaseStatus === 'success') {
          toast.success(t("purchase.toasts.success"));

          // is_paid/purchase_date are set server-side by the Stripe webhook only
          // (ADR-0033) — client writes to them are blocked at the DB. Poll briefly
          // in case the webhook hasn't landed by the time the redirect completes.
          for (let attempt = 0; attempt < 5; attempt++) {
            const { data: paidCheck } = await supabase
              .from('conversations')
              .select('is_paid')
              .eq('id', id)
              .maybeSingle();
            if (paidCheck?.is_paid) break;
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        
        if (purchaseStatus === 'cancel') {
          toast.error(t("purchase.toasts.cancel"));
        }
        
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('*, messages!fk_messages_conversation_id(*)')
          .eq('id', id)
          .maybeSingle();

        if (convError) {
          console.error("Error fetching mystery:", convError);
          toast.error(t("purchase.toasts.loadFailed"));
          return;
        }

        if (!conversation) {
          toast.error(t("purchase.toasts.notFound"));
          navigate('/dashboard');
          return;
        }

        // Extract title from messages before creating mysteryData
        const extractedTitle = conversation.messages ? extractTitleFromMessages(conversation.messages) : null;

        const mysteryData: Mystery = {
          id: conversation.id,
          title: extractedTitle || conversation.title || t("purchase.preview.defaultTitle"),
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          status: conversation.is_paid ? "purchased" : (conversation.display_status || "draft"),
          guests: conversation.player_count || 0,
          theme: conversation.theme || "",
          premise: "",
          purchase_date: conversation.purchase_date,
          is_purchased: conversation.is_paid,
          has_accomplice: conversation.has_accomplice ?? false,
          script_type: conversation.script_type || 'full',
          mystery_style: conversation.mystery_style || 'character',
        };

        setMystery(mysteryData);

        // Track purchase page view for conversion funnel
        if (!conversation.is_paid) {
          trackPurchasePageView(conversation.id, conversation.theme || undefined);
        }

        if (conversation.messages && conversation.messages.length > 0) {
          const aiMessages = conversation.messages
            .filter(m => m.is_ai)
            .sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());
          
          let detailedMessage = null;
          
          // First, look for a message with both premise and characters
          for (const msg of aiMessages) {
            const hasPremise = /(?:##\s*(?:PREMISE|GAME OVERVIEW|Background|Setting|SETTING|SCENARIO|Scenario|THE STORY|Story))/i.test(msg.content);
            const hasCharacters = /(?:##\s*(?:CHARACTER LIST|Characters|CHARACTERS|CHARACTER|SUSPECTS))/i.test(msg.content);
            
            if (hasPremise && hasCharacters) {
              detailedMessage = msg;
              break;
            }
          }
          
          // If no complete message found, look for one with any detailed content
          if (!detailedMessage) {
            for (const msg of aiMessages) {
              const hasSomeDetails = /(?:##\s*(?:PREMISE|GAME OVERVIEW|Background|Setting|CHARACTER LIST|Characters|CHARACTERS|VICTIM|MURDER|SCENARIO|EVIDENCE))/i.test(msg.content);
              if (hasSomeDetails) {
                detailedMessage = msg;
                break;
              }
            }
          }
          
          // Last resort: use the most recent message
          if (!detailedMessage && aiMessages.length > 0) {
            detailedMessage = aiMessages[0];
          }

          if (detailedMessage) {
            // Use the most recent complete concept message for characters
            // (not all messages — older revisions may have replaced characters)
            const characters = parseCharacters(detailedMessage.content);

            const details: ParsedMysteryDetails = {
              premise: extractPremise(detailedMessage.content),
              overview: extractGameOverview(detailedMessage.content),
              characters,
              evidence: parseEvidence(detailedMessage.content)
            };

            setParsedDetails(details);
            console.log("Extracted details from latest concept:", details);
          }
        }
      } catch (error) {
        console.error("Error in fetchMysteryAndMessages:", error);
        toast.error(t("purchase.toasts.genericError"));
      }
    };

    fetchMysteryAndMessages();
  }, [id, navigate, t]);

  const handleSimulatePurchase = async () => {
    if (!isDevMode) return;
    
    try {
      toast.info(t("purchase.toasts.devPurchaseSim"));
      
      // Update conversation to mark as purchased
      await supabase
        .from('conversations')
        .update({ 
          is_paid: true,
          purchase_date: new Date().toISOString()
        })
        .eq('id', id);
        
      toast.success(t("purchase.toasts.devPurchaseSuccess"));
      
      // Redirect to the mystery page view (with the tabs)
      setTimeout(() => {
        navigate(`/mystery/${id}`);
      }, 1500);
      
    } catch (error) {
      console.error("Error simulating purchase:", error);
      toast.error(t("purchase.toasts.devPurchaseFailed"));
    }
  };

  // Already-paid path (ADR-0044): a customer who has paid must never be sent to
  // Stripe again. Instead of "Complete purchase" they get "Generate my mystery",
  // which triggers generation directly (free) and takes them to the progress view.
  // This is also the recovery path for the "Victorian mansion" incident: the
  // customer finishes her concept in chat, previews it here, and generates without
  // re-paying.
  const handleGenerateAlreadyPaid = async () => {
    if (!id) {
      toast.error(t("purchase.toasts.mysteryIdMissing"));
      return;
    }
    try {
      setProcessing(true);
      toast.info(t("purchase.toasts.startingGeneration", { defaultValue: "Starting your mystery generation…" }));
      const result = await generateCompletePackage(id);
      // Entry gate (ADR-0043): concept not finished — send them back to the chat.
      if (result === "needs_more_info") {
        setProcessing(false);
        toast.error(t("purchase.toasts.conceptIncomplete", {
          defaultValue: "Your mystery concept isn't finished yet. Head back to the chat to complete it, then generate.",
        }), { duration: 10000 });
        return;
      }
      navigate(`/mystery/${id}`);
    } catch (error: any) {
      setProcessing(false);
      toast.error(error?.message || t("purchase.toasts.startGenerationFailed", { defaultValue: "Failed to start generation. Please try again." }));
    }
  };

  const handlePurchase = async () => {
    // Validate authentication
    if (!isAuthenticated) {
      toast.error(t("purchase.toasts.signInRequired"));
      navigate("/sign-in");
      return;
    }

    // Validate mystery ID
    if (!id) {
      toast.error(t("purchase.toasts.mysteryIdMissing"));
      navigate("/dashboard");
      return;
    }

    // Check if email is verified
    const isEmailVerified = user?.email_confirmed_at || user?.confirmed_at;
    if (!isEmailVerified) {
      toast.error(t("purchase.toasts.emailNotVerified"), {
        duration: 6000,
      });
      return;
    }

    // Check if user email exists
    if (!user?.email) {
      toast.error(t("purchase.toasts.userEmailMissing"));
      return;
    }

    try {
      setProcessing(true);
      toast.info(t("purchase.toasts.redirectingToCheckout"), { duration: 2000 });

      // Track checkout initiation
      trackBeginCheckout(id, mystery?.theme || undefined);

      // Construct URLs
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payment-success?conversation_id=${id}`;
      const cancelUrl = `${baseUrl}/mystery/purchase/${id}?purchase=cancel`;

      // Validate URLs before proceeding
      if (!baseUrl || !successUrl || !cancelUrl) {
        throw new Error("Failed to construct checkout URLs");
      }

      // Build Stripe checkout URL
      let stripeUrl = `https://buy.stripe.com/dRm4gAgls6c47UccYV2Nq03?prefilled_email=${encodeURIComponent(user.email)}&client_reference_id=${id}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

      // Auto-apply welcome discount promo code if active. Re-check expiry at
      // click time: the countdown state only refreshes every 15s, and Stripe
      // silently ignores expired promo codes (customer pays full price while
      // our UI implied a discount).
      if (hasDiscount && discountInfo?.promoCode &&
          new Date(discountInfo.expiresAt).getTime() > Date.now()) {
        stripeUrl += `&prefilled_promo_code=${encodeURIComponent(discountInfo.promoCode)}`;
      }

      // Persist the AI-generated title to DB so the purchase notification email is readable.
      // Only overwrites if the stored title is still in the raw "Theme - N Players" format.
      if (mystery?.title) {
        await supabase
          .from('conversations')
          .update({ title: mystery.title })
          .eq('id', id)
          .like('title', '% Players');
      }

      // Store conversation ID as fallback
      localStorage.setItem('pendingConversationId', id);

      // Small delay to ensure toast is visible
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to Stripe
      window.location.href = stripeUrl;

    } catch (error: any) {
      console.error("Payment error:", error);

      // Provide specific error messages
      let errorMessage = t("purchase.toasts.checkoutFailed");

      if (error.message?.includes("network")) {
        errorMessage = t("purchase.toasts.networkError");
      } else if (error.message?.includes("URL")) {
        errorMessage = t("purchase.toasts.checkoutConfigError");
      }

      toast.error(errorMessage, { duration: 5000 });
      setProcessing(false);
    }
  };
  
    if (!mystery) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-12 px-4">
            <div className="container mx-auto max-w-7xl">
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className={cn(
        "flex-1",
        isMobile ? "py-4 px-3" : "py-12 px-4"
      )}>
        <div className={cn(
          "container mx-auto",
          isMobile ? "max-w-full" : "max-w-7xl"
        )}>
          {/* Header Section - Mobile Optimized */}
          <div className={cn("mb-6 text-center", isMobile && "mb-4")}>
            <h1 className={cn(
              "font-bold mb-2",
              isMobile ? "text-xl" : "text-3xl"
            )}>
              {t("purchase.title")}
            </h1>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-sm px-2" : "text-base"
            )}>
              {t("purchase.subtitle")}
            </p>
          </div>
          
          {/* Main Content - Responsive Grid */}
          <div className={cn(
            "grid gap-6",
            isMobile 
              ? "grid-cols-1 space-y-4" 
              : "grid-cols-1 md:grid-cols-2 gap-8"
          )}>
            <MysteryPreviewCard 
              mystery={mystery} 
              parsedDetails={parsedDetails} 
            />

            <div className="space-y-4 sm:space-y-6">
              <Card className={cn(isMobile && "shadow-sm")}>
                <CardHeader className={cn(isMobile && "p-4")}>
                  <CardTitle className={cn(isMobile ? "text-lg" : "text-xl")}>
                    {t("purchase.package.title")}
                  </CardTitle>
                  <CardDescription className={cn(isMobile && "text-sm")}>
                    {t("purchase.package.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "p-4 pt-0")}>
                  <div className={cn(
                    "flex items-start gap-4 mb-6",
                    isMobile && "mb-4"
                  )}>
                    <div className={cn(
                      "rounded bg-primary/10 flex items-center justify-center shrink-0",
                      isMobile ? "h-12 w-12" : "h-16 w-16"
                    )}>
                      <CreditCard className={cn(
                        "text-primary",
                        isMobile ? "h-6 w-6" : "h-8 w-8"
                      )} />
                    </div>
                    <div>
                      {hasDiscount ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                              "font-bold",
                              isMobile ? "text-xl" : "text-2xl"
                            )} style={{ color: '#C81400' }}>
                              ${DISCOUNTED_PRICE.toFixed(2)}
                            </div>
                            <div className={cn(
                              "line-through text-muted-foreground",
                              isMobile ? "text-base" : "text-lg"
                            )}>
                              ${ORIGINAL_PRICE.toFixed(2)}
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(200, 20, 0, 0.15)', color: '#C81400' }}>
                              {DISCOUNT_PERCENT}% OFF
                            </span>
                          </div>
                          {timeRemaining && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: '#ff6b6b' }}>
                              <Clock className="h-3 w-3" />
                              {t("welcomeDiscount.purchase.expiresIn", {
                                defaultValue: "Welcome offer expires in {{time}}",
                                time: formatTimeRemaining(timeRemaining),
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={cn(
                          "font-bold mb-1",
                          isMobile ? "text-xl" : "text-2xl"
                        )}>
                          $24.99
                        </div>
                      )}
                      <p className={cn(
                        "text-muted-foreground mt-1",
                        isMobile && "text-sm"
                      )}>
                        {t("purchase.package.priceDescription")}
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "space-y-3 mb-6",
                    isMobile && "space-y-2 mb-4"
                  )}>
                    <h3 className={cn(
                      "font-medium",
                      isMobile && "text-sm"
                    )}>
                      {t("purchase.package.whatsIncluded")}
                    </h3>
                    {(t('purchase.package.includes', { returnObjects: true }) as string[]).map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className={cn(
                          "text-green-500 shrink-0 mt-0.5",
                          isMobile ? "h-4 w-4" : "h-5 w-5"
                        )} />
                        <span className={cn(isMobile && "text-sm")}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className={cn(
                  "flex-col gap-4",
                  isMobile && "p-4 pt-0 gap-3"
                )}>
                  <p className="text-sm p-3 rounded-md" style={{ backgroundColor: 'var(--color-charcoal)', border: '1px solid rgba(245,240,232,0.15)', color: 'rgba(245,240,232,0.7)' }}>
                    <strong>{t("purchase.fullyEditableLabel")}</strong> {t("purchase.fullyEditableNote")}
                  </p>
                  {mystery?.is_purchased ? (
                    // ALREADY PAID (ADR-0044): generate for free, never re-charge.
                    <Button
                      className={cn("w-full font-medium", isMobile ? "h-12 text-base" : "h-11")}
                      size="lg"
                      onClick={handleGenerateAlreadyPaid}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          {t("purchase.buttons.processing")}
                        </>
                      ) : (
                        <>
                          {t("purchase.buttons.generateAlreadyPaid", { defaultValue: "Generate my mystery" })}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (parsedDetails?.characters?.length ?? 0) > 0 ? (
                    // Unpaid + a previewable concept exists → normal checkout.
                    <Button
                      className={cn("w-full font-medium", isMobile ? "h-12 text-base" : "h-11")}
                      size="lg"
                      onClick={handlePurchase}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          {t("purchase.buttons.processing")}
                        </>
                      ) : (
                        <>
                          {t("purchase.buttons.complete")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    // NO CONCEPT YET (ADR-0044): don't take payment for a mystery that
                    // doesn't exist — the "Victorian mansion" incident. Send them back
                    // to finish designing so they preview a real concept before paying.
                    <div className="w-full space-y-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t("purchase.notReadyToPreview", {
                          defaultValue: "Your mystery isn't ready to preview yet. Head back to the chat to finish designing it — once you can see your cast and premise here, you can generate it.",
                        })}
                      </p>
                      <Button
                        className={cn("w-full font-medium", isMobile ? "h-12 text-base" : "h-11")}
                        size="lg"
                        onClick={() => navigate(`/mystery/chat/${id}`)}
                      >
                        {t("purchase.buttons.backToDesign", { defaultValue: "Back to design" })}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>

              {/* Important Notes Section - Mobile Optimized */}
              <div className={cn(
                "bg-muted rounded-lg p-6",
                isMobile && "p-4"
              )}>
                <h3 className={cn(
                  "font-medium mb-2",
                  isMobile && "text-sm"
                )}>
                  {t("purchase.notes.title")}
                </h3>
                <ul className={cn(
                  "list-disc pl-5 space-y-1 text-muted-foreground",
                  isMobile ? "text-xs pl-4" : "text-sm"
                )}>
                  {(t('purchase.notes.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>
                      {item.includes('{{email}}') 
                        ? item.replace('{{email}}', 'support@mysterymaker.party')
                        : item
                      }
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Back Button - Mobile Optimized */}
          <div className={cn(
            "mt-8 text-center",
            isMobile && "mt-6"
          )}>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/mystery/chat/${id}`)}
              className={cn(isMobile && "w-full h-11")}
            >
              {t("purchase.buttons.backToDesign")}
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryPurchase;
