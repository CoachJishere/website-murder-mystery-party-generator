import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, Wand2, Eye, Mail, MessageSquare, X, Download, Printer, Copy } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import MysteryGuestManager from "./MysteryGuestManager";
import GuestDropoutPanel from "./GuestDropoutPanel"; // ADR-0036 Phase B / ADR-0082, staging only
import EditableSection from "./EditableSection";
import EditableMultiSection from "./EditableMultiSection";
import "../styles/mystery-package.css";
import "../styles/print.css";
import { useTranslation } from "react-i18next";
import { trackPackageTabViewed, trackFeedbackPromptShown, trackFeedbackPromptClicked } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { parseEvidenceCards } from "@/utils/evidenceCardUtils";
import HostGuideTemplate from "./HostGuideTemplate";

function stripH4Section(markdown: string, pattern: RegExp): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let skip = false;
  for (const line of lines) {
    if (/^#+\s/.test(line)) {
      skip = /^####\s/.test(line) && pattern.test(line);
      if (!skip) out.push(line);
    } else if (!skip) {
      out.push(line);
    }
  }
  return out.join('\n');
}

// Display label for each editable character field. Field data is plain text with no
// embedded section heading, so we supply one via EditableSection's fallbackLabel prop.
const CHARACTER_FIELD_LABELS: Record<string, string> = {
  character_name: 'Character Name',
  description: 'Description',
  background: 'Background',
  relationships: 'Relationships',
  secret: 'Secret',
  introduction: 'Introduction',
  rumors: 'Rumors',
  round2_script: 'Round 2 Script',
  round2_questions: 'Round 2 Questions',
  round2_innocent: 'Round 2 — Innocent',
  round2_guilty: 'Round 2 — Guilty',
  round2_accomplice: 'Round 2 — Accomplice',
  round3_script: 'Round 3 Script',
  round3_questions: 'Round 3 Questions',
  round3_innocent: 'Round 3 — Innocent',
  round3_guilty: 'Round 3 — Guilty',
  round3_accomplice: 'Round 3 — Accomplice',
  round4_script: 'Round 4 Script',
  round4_questions: 'Round 4 Questions',
  round4_innocent: 'Round 4 — Innocent',
  round4_guilty: 'Round 4 — Guilty',
  round4_accomplice: 'Round 4 — Accomplice',
  accusations: 'Accusations',
  final_statement: 'Final Statement',
  final_innocent: 'Final Statement — Innocent',
  final_guilty: 'Final Statement — Guilty',
  final_accomplice: 'Final Statement — Accomplice',
  reveal_confession_guilty: 'The Reveal — Your Confession',
  reveal_confession_accomplice: 'The Reveal — Accomplice Confession',
};

// Non-round editing tips shown above a field (ADR-0037 R1/R2 legacy path).
// Non-editable — never saved to the DB. Round-labeled fields moved to
// ROUND_HEADERS below (2026-08-16) so the round context renders as the
// actual heading instead of competing with the AI's own embedded header.
const ROUND_INTENT: Record<string, string> = {
  character_name: "**Renaming only updates this field.** It will not change the name anywhere else — round scripts, clues, and the host guide will still use the original name. Best used to pick a side of a dual name (e.g. \"Clarabelle/Clarence\") before your first read-through, not as a late correction once you've started reviewing the script.",
};

// Round-context heading + "what to do now" instruction, shown as the section's
// actual title (not a blockquote aside). Keyed to the round's lead field;
// detective (round_script) and character-based (innocent) styles are mutually
// exclusive so only one variant per round renders. When present, the field's
// own EditableSection header is hidden (hideHeader) — the AI-generated content
// almost always embeds its own `## ROUND X: ...`-style header (96% of
// introduction/rumors fields do), which used to render as a second, larger,
// redundant heading below this one. 2026-08-16.
const ROUND_HEADERS: Record<string, { title: string; instruction: string }> = {
  introduction: {
    title: "Round 1 — Introductions",
    instruction: "When it's your turn, deliver your introduction below. Listen closely to everyone else's — the details you hear now will matter in later rounds.",
  },
  rumors: {
    title: "Round 1 — Rumors",
    instruction: "Still part of Round 1, right after introductions — no break in between. Share the rumor below with anyone who'll listen, and pay attention to what you hear from others: it'll matter in later rounds.",
  },
  round2_script: {
    title: "Round 2 — Motives",
    instruction: "The question now is why. Use your questions below to probe why others might have wanted the victim gone — and be ready to answer for your own motive.",
  },
  round2_innocent: {
    title: "Round 2 — Motives",
    instruction: "The question now is why. Use your questions below to probe why others might have wanted the victim gone — and be ready to answer for your own motive.",
  },
  round3_script: {
    title: "Round 3 — The Method",
    instruction: "Focus shifts to how it was done. Press others on what they knew about the method, the means, and the scene of the crime.",
  },
  round3_innocent: {
    title: "Round 3 — The Method",
    instruction: "Focus shifts to how it was done. Press others on what they knew about the method, the means, and the scene of the crime.",
  },
  round4_script: {
    title: "Round 4 — Opportunity",
    instruction: "Where was everyone? Use the evidence to pin down alibis — and be ready to account for your own whereabouts.",
  },
  round4_innocent: {
    title: "Round 4 — Opportunity",
    instruction: "Where was everyone? Use the evidence to pin down alibis — and be ready to account for your own whereabouts.",
  },
  accusations: {
    title: "Accusations — Point Outward",
    instruction: "When the accusations round begins, accuse the person you most suspect and give one reason from the evidence. Save your own defense for the final statements that follow.",
  },
  final_statement: {
    title: "Final Statements — Your Turn to Defend",
    instruction: "After everyone has accused, this is your last word. Defend yourself — or, if you're guilty, make your confession.",
  },
  // ADR-0065: character-style Final Statements is denial for everyone, guilty or not —
  // the confession moved to a separate reveal_confession_* field/round (below), so this
  // no longer tells guilty players to crack here (detective-style final_statement above
  // is unaffected — that format's culprit is predetermined and unchanged by this fix).
  final_innocent: {
    title: "Final Statements — Your Turn to Defend",
    instruction: "After everyone has accused, this is your last word before The Reveal. Defend yourself and stick to your story — whether you're innocent or guilty, this round is not where the truth comes out.",
  },
  reveal_confession_guilty: {
    title: "The Reveal — Your Confession",
    instruction: "Read this ONLY if the Detective specifically names you as the murderer during The Reveal, after every player has already given their Final Statement above. This is a separate, later moment — don't read it early.",
  },
  reveal_confession_accomplice: {
    title: "The Reveal — Accomplice Confession",
    instruction: "Read this ONLY if the Detective specifically calls on you as the accomplice during The Reveal, after the murderer has already confessed. This is a separate, later moment — don't read it early.",
  },
};

// Static stakes reminder shown under each character's secret (ADR-0037 G6).
const GUARD_DIRECTIVE = "**Guard this secret at all costs.** Your reputation — and perhaps your freedom — depends on keeping it hidden. Deny, deflect, and never give it up willingly. A secret handed over freely drains the tension for the whole table.";

// Extract a one-line "who is this" summary from a character description for the
// cast cheat-sheet (ADR-0037 R3).
function castBriefLine(desc?: string): string {
  const cleaned = (desc || '')
    .replace(/^#+\s*CHARACTER DESCRIPTION\s*/i, '')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const m = cleaned.match(/^(.*?[.!?])(\s|$)/);
  const s = m ? m[1] : cleaned;
  return s.length > 160 ? `${s.slice(0, 157).trimEnd()}…` : s;
}

// accusations is stored as a JSON string with {round2, round3, round4} summaries.
// Convert to readable markdown so it renders cleanly instead of leaking raw JSON.
function formatAccusations(raw: string | undefined | null): string | undefined {
  if (!raw || typeof raw !== 'string') return raw ?? undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    const parts: string[] = [];
    if (parsed.round2) parts.push(`**Round 2:** ${parsed.round2}`);
    if (parsed.round3) parts.push(`**Round 3:** ${parsed.round3}`);
    if (parsed.round4) parts.push(`**Round 4:** ${parsed.round4}`);
    return parts.length ? parts.join('\n\n') : raw;
  } catch {
    return raw;
  }
}

interface MysteryPackageData {
  title?: string;
  gameOverview?: string;
  hostGuide?: string;
  materials?: string;
  preparation?: string;
  timeline?: string;
  hostingTips?: string;
  evidenceCards?: string;
  evidenceCardImages?: { round2?: string; round3?: string; round4?: string } | null;
  relationshipMatrix?: string;
  detectiveScript?: string;
  // Used by GenerationProgress to derive realistic phase state from real DB content
  master_context?: string | null;
  extracted_characters?: any;
}

interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: any;
  isGenerating: boolean;
  conversationId?: string;
  onGenerateClick?: () => void;
  packageData?: MysteryPackageData;
  characters?: MysteryCharacter[];
  estimatedTime: string;
  packageId?: string;
  isPaid?: boolean;
  // Mystery context — used by HostGuideTemplate to parameterize static content.
  mysteryType?: string | null;
  mysteryStyle?: string | null;
  hasAccomplice?: boolean | null;
  playerCount?: number | null;
  // Host's chosen format for spoken fields. 'both' triggers stacked detailed+pointform
  // rendering; 'pointForm' shows bullets only; 'full' (default) shows prose only.
  scriptType?: 'full' | 'pointForm' | 'both' | null;
  onPackageFieldUpdate?: (fieldName: string, value: string) => Promise<void>;
  onCharacterFieldUpdate?: (characterId: string, fieldName: string, value: string) => Promise<void>;
}

// Evidence images live at stable URLs (…/round{N}.webp). When admins regenerate them
// the URL doesn't change, so browser disk cache can hold stale copies past the
// server's no-cache header. Bust per page load with a mount-time version param.
function bustCache(url: string, version: number): string {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 'v=' + version;
}

function EvidenceCardImageGrid({ images, isMobile }: { images: { round2?: string; round3?: string; round4?: string }; isMobile: boolean }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const cacheVersion = useMemo(() => Date.now(), []);

  return (
    <>
      <div className={cn("grid gap-4 mb-6", isMobile ? "grid-cols-1" : "grid-cols-3")}>
        {(['round2', 'round3', 'round4'] as const).map((round) => {
          const url = images[round];
          if (!url) return null;
          const bustedUrl = bustCache(url, cacheVersion);
          const roundLabel = round === 'round2' ? 'Round 2' : round === 'round3' ? 'Round 3' : 'Round 4';
          return (
            <div
              key={round}
              className="rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxUrl(bustedUrl)}
            >
              <img
                src={bustedUrl}
                alt={`Evidence - ${roundLabel}`}
                className="w-full aspect-video object-cover"
              />
              <div className="px-3 py-2 text-xs text-muted-foreground font-medium">
                Evidence — {roundLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white z-50"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="Evidence card"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

const MysteryPackageTabView = React.memo(({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId,
  onGenerateClick,
  packageData,
  characters = [],
  estimatedTime,
  packageId,
  isPaid,
  mysteryType,
  mysteryStyle,
  hasAccomplice,
  playerCount,
  scriptType: scriptTypeProp,
  onPackageFieldUpdate,
  onCharacterFieldUpdate,
}: MysteryPackageTabViewProps) => {
  const scriptType: 'full' | 'pointForm' | 'both' = scriptTypeProp || 'full';
  const [activeTab, setActiveTab] = useState("host-guide");
  const [statusMessage, setStatusMessage] = useState("Starting generation...");
  const [showGuestManager, setShowGuestManager] = useState(false);
  // ADR-0036 Phase B / ADR-0082, staging only -- unset (undefined) in prod
  // Vercel env, same off-by-default mechanism as VITE_COLD_CASE_PAYMENT_LINK
  // in ColdCaseFiles.tsx. Gates a whole "Manage" tab, not just a button.
  const guestDropoutAdaptationEnabled = import.meta.env.VITE_ENABLE_GUEST_DROPOUT_ADAPTATION === 'true';
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Feedback nudge state
  const [showFeedbackNudge, setShowFeedbackNudge] = useState(false);
  const [feedbackAlreadyGiven, setFeedbackAlreadyGiven] = useState(false);
  const feedbackPromptTracked = useRef(false);

  // Check for existing feedback and show nudge after delay
  useEffect(() => {
    if (!isPaid || !conversationId) return;

    // Check if already dismissed via localStorage
    const dismissed = localStorage.getItem(`feedback_dismissed_${conversationId}`);
    if (dismissed) return;

    // Check if feedback already exists for this conversation
    const checkFeedback = async () => {
      const { data } = await supabase
        .from('mystery_feedback' as any)
        .select('id')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (data) {
        setFeedbackAlreadyGiven(true);
        return;
      }

      // Show nudge after 30 seconds
      const timer = setTimeout(() => {
        setShowFeedbackNudge(true);
        if (!feedbackPromptTracked.current) {
          trackFeedbackPromptShown(conversationId);
          feedbackPromptTracked.current = true;
        }
      }, 30000);

      return () => clearTimeout(timer);
    };

    checkFeedback();
  }, [isPaid, conversationId]);

  const handleDismissFeedback = useCallback(() => {
    setShowFeedbackNudge(false);
    if (conversationId) {
      localStorage.setItem(`feedback_dismissed_${conversationId}`, 'true');
    }
  }, [conversationId]);

  const handleFeedbackClick = useCallback(() => {
    if (conversationId) {
      trackFeedbackPromptClicked(conversationId);
    }
  }, [conversationId]);

  // Strip the first H1/H2 heading from content since the page header already shows the title
  const stripFirstHeading = useCallback((content: string) => {
    return content.replace(/^#{1,2}\s+.+\n*/m, '').trim();
  }, []);

  // Handle tab change with analytics tracking
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    trackPackageTabViewed(tab, conversationId);
  }, [conversationId]);

  // Update status message based on generationStatus
  useEffect(() => {
    if (generationStatus) {
      setStatusMessage(generationStatus.currentStep || "Processing...");
    }
  }, [generationStatus]);



  // Helper function to safely get relationships as an array
  const getRelationshipsArray = useCallback((relationships: any): Array<{character: string, description: string}> => {
    if (!relationships) return [];
    
    if (Array.isArray(relationships)) {
      return relationships.map(rel => {
        if (typeof rel === 'object' && rel !== null) {
          return {
            character: rel.character || rel.name || '',
            description: rel.description || rel.relation || ''
          };
        }
        return { character: '', description: String(rel) };
      }).filter(rel => rel.character || rel.description);
    }
    
    return [];
  }, []);

  // Helper function to safely get secrets as an array
  const getSecretsArray = useCallback((secrets: any): string[] => {
    if (!secrets) return [];
    
    if (Array.isArray(secrets)) {
      return secrets.map(secret => String(secret));
    }
    
    if (typeof secrets === 'string') {
      return [secrets];
    }
    
    return [];
  }, []);

  // Check if a field is a stub placeholder (e.g., "N/A - See role-specific script")
  const isStub = (text: string | null | undefined): boolean => {
    if (!text) return true;
    const trimmed = text.trim();
    return trimmed.length < 50 && (
      trimmed.toLowerCase().includes('n/a') ||
      trimmed.toLowerCase().includes('see role-specific') ||
      trimmed.toLowerCase().includes('not applicable')
    );
  };

  // Function to build complete character guide content
  const buildCharacterGuideContent = useCallback((character: MysteryCharacter): string => {
    let content = `# ${character.character_name} - Character Guide\n\n`;

    // All content is pre-formatted in database - just concatenate in logical order
    if (character.description) {
      content += `${character.description}\n\n`;
    }

    if (character.background) {
      content += `${character.background}\n\n`;
    }

    if (character.relationships) {
      content += `${character.relationships}\n\n`;
    }

    if (character.rumors) {
      content += `${character.rumors}\n\n`;
    }

    if (character.secret) {
      content += `${character.secret}\n\n`;
    }

    if (character.introduction) {
      content += `${character.introduction}\n\n`;
    }

    if (character.round2_questions) {
      content += `${character.round2_questions}\n\n`;
    }

    if (character.round2_script && !isStub(character.round2_script)) {
      content += `${character.round2_script}\n\n`;
    } else {
      if (character.round2_innocent && !isStub(character.round2_innocent)) {
        content += `${character.round2_innocent}\n\n`;
      }
      if (character.round2_guilty && !isStub(character.round2_guilty)) {
        content += `${character.round2_guilty}\n\n`;
      }
      // Was missing entirely — a player who drew the accomplice slip got no round
      // scripts at all in their downloaded guide. Matches the innocent/guilty pattern.
      if (character.round2_accomplice && !isStub(character.round2_accomplice)) {
        content += `${character.round2_accomplice}\n\n`;
      }
    }

    if (character.round3_questions) {
      content += `${character.round3_questions}\n\n`;
    }

    if (character.round3_script && !isStub(character.round3_script)) {
      content += `${character.round3_script}\n\n`;
    } else {
      if (character.round3_innocent && !isStub(character.round3_innocent)) {
        content += `${character.round3_innocent}\n\n`;
      }
      if (character.round3_guilty && !isStub(character.round3_guilty)) {
        content += `${character.round3_guilty}\n\n`;
      }
      if (character.round3_accomplice && !isStub(character.round3_accomplice)) {
        content += `${character.round3_accomplice}\n\n`;
      }
    }

    if (character.round4_questions) {
      content += `${character.round4_questions}\n\n`;
    }

    if (character.round4_script && !isStub(character.round4_script)) {
      content += `${character.round4_script}\n\n`;
    } else {
      if (character.round4_innocent && !isStub(character.round4_innocent)) {
        content += `${character.round4_innocent}\n\n`;
      }
      if (character.round4_guilty && !isStub(character.round4_guilty)) {
        content += `${character.round4_guilty}\n\n`;
      }
      if (character.round4_accomplice && !isStub(character.round4_accomplice)) {
        content += `${character.round4_accomplice}\n\n`;
      }
    }

    if (character.final_statement && !isStub(character.final_statement)) {
      content += `${character.final_statement}\n\n`;
    } else {
      if (character.final_innocent && !isStub(character.final_innocent)) {
        content += `${character.final_innocent}\n\n`;
      }
      if (character.final_guilty && !isStub(character.final_guilty)) {
        content += `${character.final_guilty}\n\n`;
      }
      if (character.final_accomplice && !isStub(character.final_accomplice)) {
        content += `${character.final_accomplice}\n\n`;
      }
      // ADR-0065: the actual confession, held back for The Reveal — a separate
      // moment from the Final Statement denials above.
      if (character.reveal_confession_guilty && !isStub(character.reveal_confession_guilty)) {
        content += `${character.reveal_confession_guilty}\n\n`;
      }
      if (character.reveal_confession_accomplice && !isStub(character.reveal_confession_accomplice)) {
        content += `${character.reveal_confession_accomplice}\n\n`;
      }
    }
    
    // Convert any escaped newlines to actual newlines for proper markdown rendering
    const normalizedContent = content.replace(/\\n/g, '\n');
    return normalizedContent;
  }, [getRelationshipsArray, getSecretsArray]);

  // Helper function to format content as a bulleted list if it's not already formatted
  const formatAsBulletedList = (text: string, header: string): string => {
    // If the text already contains list markers or is empty, return as is
    if (!text || /^[\s\n]*(?:[-*•]|\d+\.|\[x?\]|\s*$)/m.test(text)) {
      return text;
    }
    
    // Normalize the text and header for comparison
    const normalizedText = text.trim().toLowerCase();
    const normalizedHeader = header.trim().toLowerCase();
    let result = '';
    
    // Only add header if it doesn't already exist at the start of the text
    if (!normalizedText.startsWith(normalizedHeader)) {
      result = `${header}\n\n`;
    }
    
    // Split into lines and process each line
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        // Skip lines that are already headers or empty
        if (!trimmed.startsWith('#') && trimmed.length > 0) {
          result += `- ${trimmed}\n`;
        } else if (trimmed.startsWith('##')) {
          // Preserve subheaders
          result += `\n${trimmed}\n`;
        }
      } else {
        // Preserve empty lines
        result += '\n';
      }
    }
    
    return result + '\n';
  };

  // Function to build complete host guide content
  const buildCompleteHostGuide = useCallback((): string => {
    if (!packageData) return "";
    
    const title = packageData.title || mysteryTitle || "Mystery";
    let content = `# Host Guide\n\n`;
    
    // Use the content EXACTLY as generated by Make.com - no rebuilding headers
    if (packageData.gameOverview) {
      content += `${packageData.gameOverview}\n\n`;
    }
    
    if (packageData.materials) {
      content += `${packageData.materials}\n\n`;
    }
    
    if (packageData.preparation) {
      content += `${packageData.preparation}\n\n`;
    }
    
    if (packageData.timeline) {
      content += `${packageData.timeline}\n\n`;
    }
    
    if (packageData.hostGuide) {
      content += `${packageData.hostGuide}\n\n`;
    }
    
    if (packageData.hostingTips) {
      content += `${packageData.hostingTips}\n\n`;
    }
    
    return content;
  }, [packageData, mysteryTitle]);

  // Memoized content extraction functions
  const extractHostGuide = useCallback(() => {
    if (!packageContent) return "";
    
    const hostGuidePattern = /# .+ - Host Guide\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(hostGuidePattern);
    return match ? match[1].trim() : "";
  }, [packageContent]);

  const extractInspectorScript = useCallback(() => {
    if (!packageContent) return "";
    
    const inspectorPattern = /# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(inspectorPattern);
    return match ? match[1].trim() : "";
  }, [packageContent]);



  const extractCharacters = useCallback(() => {
    if (!packageContent) return [];
    
    const charactersList: MysteryCharacter[] = [];
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    
    let match;
    while ((match = characterPattern.exec(packageContent)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      charactersList.push({
        id: crypto.randomUUID(),
        package_id: conversationId || "",
        character_name: characterName,
        description: characterContent.substring(0, characterContent.indexOf('\n\n')) || '',
        background: '',
        relationships: [],
        secrets: []
      });
    }
    
    return charactersList;
  }, [packageContent, conversationId]);

  const extractClues = useCallback(() => {
    if (!packageContent) return [];
    
    const clues: any[] = [];
    const cluePattern = /# EVIDENCE: (.*?)\n([\s\S]*?)(?=# EVIDENCE:|# |$)/gi;
    
    let match;
    while ((match = cluePattern.exec(packageContent)) !== null) {
      const title = match[1].trim();
      const clueContent = match[2].trim();
      
      clues.push({
        title,
        content: clueContent
      });
    }
    
    return clues;
  }, [packageContent]);

  // Memoized content getters
  const hostGuide = useMemo(() => {
    if (packageData) {
      return buildCompleteHostGuide();
    }
    
    if (packageData?.hostGuide) {
      return packageData.hostGuide;
    }
    
    return extractHostGuide();
  }, [packageData, buildCompleteHostGuide, extractHostGuide]);

  const detectiveScript = useMemo(() => {
    return packageData?.detectiveScript || extractInspectorScript();
  }, [packageData?.detectiveScript, extractInspectorScript]);

  const handleCopyDetectiveScript = useCallback(async () => {
    if (!detectiveScript) return;
    try {
      await navigator.clipboard.writeText(detectiveScript);
      toast.success(t('mysteryPackage.detectiveScript.copied'));
    } catch {
      toast.error(t('mysteryPackage.detectiveScript.copyFailed'));
    }
  }, [detectiveScript, t]);

  const handleDownloadDetectiveScript = useCallback(() => {
    if (!detectiveScript) return;
    const safeTitle = (packageData?.title || mysteryTitle || 'mystery')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'mystery';
    const blob = new Blob([detectiveScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}-detective-script.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [detectiveScript, packageData?.title, mysteryTitle]);



  const charactersList = useMemo(() => {
    if (characters && characters.length > 0) {
      return characters;
    }
    
    return extractCharacters();
  }, [characters, extractCharacters]);

  const evidenceCards = useMemo(() => {
    let content = "";
    if (packageData?.evidenceCards && typeof packageData.evidenceCards === 'string') {
      content = packageData.evidenceCards;
    } else {
      const clues = extractClues();
      if (clues.length > 0) {
        content = clues.map(clue => `## ${clue.title}\n\n${clue.content}`).join('\n\n---\n\n');
      }
    }

    // Strip entire sections only for image-gen / spoiler content.
    // Keep DESCRIPTION and IMPLICATIONS labels visible so hosts can see the Blueprint 11 structure.
    if (content) {
      content = content.replace(/### VISUAL DESCRIPTION \(FOR IMAGE GENERATION\)\s*\n[\s\S]*?(?=\n## |\n### (?!VISUAL)|$)/gi, '');
      content = stripH4Section(content, /Visual Description/i);
      content = stripH4Section(content, /\bDiscovered\b/i);
      content = stripH4Section(content, /What This Reveals/i);
      content = stripH4Section(content, /Who It Implicates/i);
    }

    return content;
  }, [packageData?.evidenceCards, packageData?.evidenceCardImages, extractClues]);

  // Check if mystery is complete enough to share
  const canShareMystery = useMemo(() => {
    return (packageData && (hostGuide || detectiveScript || evidenceCards)) || 
           (characters && characters.length > 0);
  }, [packageData, hostGuide, detectiveScript, evidenceCards, characters]);

  // Simplified loading component for individual tabs with mobile optimization
  const LoadingTabContent = useCallback(({ message, estimatedTime: loadingTime }: { message: string; estimatedTime: string }) => (
    <div className={cn(
      "loading-section",
      isMobile && "py-8"
    )}>
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className={cn(
          "animate-spin text-primary",
          isMobile ? "h-6 w-6" : "h-8 w-8"
        )} />
        <div className={cn(
          "text-muted-foreground text-center max-w-md",
          isMobile && "text-sm px-4"
        )}>
          <div dangerouslySetInnerHTML={{ __html: message }} />
          <p className="mt-2 text-sm">
            This typically takes {loadingTime} to complete.
          </p>
        </div>
      </div>
    </div>
  ), [isMobile]);

  return (
    <div className="w-full">
      <div className={cn(
        "mb-6 flex items-start justify-between gap-6",
        isMobile && "mb-4 px-2 flex-col space-y-3"
      )}>
        <h1 className={cn(
          "font-bold flex-1 min-w-0",
          isMobile ? "text-xl text-center" : "text-3xl"
        )}>
          {mysteryTitle}
        </h1>

        {/* Action buttons */}
        {canShareMystery && conversationId && (
          <div className={cn(
            "flex items-center gap-3 flex-shrink-0",
            isMobile && "flex-col w-full"
          )}>
            <Button
              onClick={() => setShowGuestManager(true)}
              className={cn(
                "gap-2",
                isMobile && "w-full"
              )}
              style={{ backgroundColor: 'var(--color-red)', color: 'var(--color-cream)' }}
            >
              <Mail className="h-4 w-4" />
              {t('mysteryPackage.shareWithGuests')}
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className={cn(
                "gap-2 print:hidden",
                isMobile && "w-full"
              )}
              style={{ borderColor: 'rgba(245,240,232,0.5)', color: 'var(--color-cream)' }}
              title={t('mysteryPackage.export.printTip')}
            >
              <Download className="h-4 w-4" />
              {t('mysteryPackage.export.saveAsPdf')}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={cn(
            "w-full mb-4 p-1.5 overflow-hidden rounded-lg h-auto",
            isMobile
              ? "grid grid-cols-2 gap-1"
              : cn("grid grid-cols-2 gap-1", guestDropoutAdaptationEnabled ? "md:grid-cols-5" : "md:grid-cols-4")
          )}
          style={{ backgroundColor: 'var(--color-charcoal)', border: '1px solid var(--color-cream-border)' }}
        >
          <TabsTrigger
            value="host-guide"
            className={cn(
              "whitespace-nowrap rounded-md transition-all",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
            style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            {t(isMobile ? 'mysteryPackage.mobileTabs.host' : 'mysteryPackage.tabs.hostGuide')}
          </TabsTrigger>
          <TabsTrigger
            value="characters"
            className={cn(
              "whitespace-nowrap rounded-md transition-all",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
            style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            {t(isMobile ? 'mysteryPackage.mobileTabs.characters' : 'mysteryPackage.tabs.characters', { count: charactersList?.length || 0 })}
          </TabsTrigger>
          <TabsTrigger
            value="clues"
            className={cn(
              "whitespace-nowrap rounded-md transition-all",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
            style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            {t('mysteryPackage.tabs.clues')}
          </TabsTrigger>
          <TabsTrigger
            value="inspector"
            className={cn(
              "whitespace-nowrap rounded-md transition-all",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
            style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
          >
            {/* Tab label adapts to mystery type: "Detective" for murder, "Investigator" for intrigue. */}
            {mysteryType === 'intrigue'
              ? t(isMobile ? 'mysteryPackage.mobileTabs.inspectorIntrigue' : 'mysteryPackage.tabs.inspectorIntrigue')
              : t(isMobile ? 'mysteryPackage.mobileTabs.inspector' : 'mysteryPackage.tabs.inspector')}
          </TabsTrigger>
          {guestDropoutAdaptationEnabled && (
            <TabsTrigger
              value="extras"
              className={cn(
                "whitespace-nowrap rounded-md transition-all",
                isMobile && "text-xs px-2 py-2 h-auto"
              )}
              style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              {t('mysteryPackage.tabs.extras')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="host-guide" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {packageData && (packageData.gameOverview || packageData.hostGuide) ? (
              <HostGuideTemplate
                mysteryType={mysteryType}
                mysteryStyle={mysteryStyle}
                hasAccomplice={hasAccomplice}
                playerCount={playerCount}
                gameOverview={packageData.gameOverview}
                materials={packageData.materials}
                hostingTips={packageData.hostingTips}
                onPackageFieldUpdate={onPackageFieldUpdate}
                isMobile={isMobile}
              />
            ) : hostGuide ? (
              <div className={cn("prose max-w-none overflow-x-auto", isMobile && "prose-sm")}>
                <ReactMarkdown>{hostGuide}</ReactMarkdown>
              </div>
            ) : isGenerating ? (
              <LoadingTabContent
                message={t('mysteryPackage.loading.generatingMessage')}
                estimatedTime={estimatedTime}
              />
            ) : (
              <div className={cn(
                "text-center py-12 space-y-4",
                isMobile && "py-8 space-y-3 px-4"
              )}>
                <Wand2 className={cn(
                  "mx-auto text-muted-foreground",
                  isMobile ? "h-10 w-10" : "h-12 w-12"
                )} />
                <h3 className={cn(
                  "font-semibold",
                  isMobile ? "text-lg" : "text-xl"
                )}>
                  {t('mysteryPackage.placeholder.title')}
                </h3>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.description')}
                </p>
                {onGenerateClick && (
                  <Button
                    onClick={onGenerateClick}
                    className={cn(
                      "mt-4",
                      isMobile && "w-full text-sm h-11"
                    )}
                  >
                    {t('mysteryPackage.placeholder.button')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="characters" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {Array.isArray(charactersList) && charactersList.length > 0 ? (
              <div className={cn(
                "space-y-4",
                isMobile && "space-y-3"
              )}>
                {charactersList.length > 1 && (
                  <div className={cn("prose max-w-none mb-2", isMobile && "prose-sm")}>
                    <ReactMarkdown>{`## The Suspects — Who's Who\n\nA quick reference so players can keep everyone straight.\n\n${charactersList.map((c: any) => `- **${c.character_name}** — ${castBriefLine(c.description)}`).join('\n')}`}</ReactMarkdown>
                  </div>
                )}
                <div className={cn(
                  "rounded-md border border-muted bg-muted/40 px-3 py-2 text-xs text-muted-foreground mb-2",
                  isMobile && "text-[11px]"
                )}>
                  {guestDropoutAdaptationEnabled
                    ? t('adaptation.entryPoint.notice')
                    : <>You can edit every character below, but the number of suspects is fixed for this mystery — adding or removing a character means regenerating.</>}
                  {' '}Have more guests than characters? They can join as <strong>co-investigators</strong> on the detective's team (see the Host Guide) — just don't share the detective script with them, as it names the culprit.
                </div>
                {charactersList.map((character, index) => {
                  // Detective-style uses round_script fields (with headers); character-based uses innocent/guilty fields
                  const hasDetectiveScripts = !!(character.round2_script || character.round3_script || character.round4_script);

                  // Wrap a prose body in straight quotes so it reads obviously as a script
                  // to deliver. Strips leading inline "**IF YOU'RE INNOCENT**" / stage-direction
                  // headers the model bakes in. Skips bullets and headings.
                  const wrapProseInQuotes = (text: string): string => {
                    if (!text) return text;
                    let body = text.trim();
                    if (body.startsWith('-') || body.startsWith('•') || body.startsWith('*')) return text;
                    if (body.startsWith('#')) return text;
                    while (true) {
                      const stripped = body.replace(/^\*\*[^*\n]+\*\*\s*\n+/, '');
                      if (stripped === body) break;
                      body = stripped;
                    }
                    body = body.trim();
                    if (!body) return text;
                    if (body.startsWith('"') && body.endsWith('"')) return body;
                    return `"${body}"`;
                  };

                  // For prose blocks that may include a leading `## SECTION` heading, split
                  // the heading off, wrap only the prose body in quotes.
                  const wrapPreservingHeading = (block: string): string => {
                    const m = block.match(/^(##\s+[^\n]+\n+)([\s\S]*)$/);
                    if (!m) return wrapProseInQuotes(block);
                    return `${m[1]}${wrapProseInQuotes(m[2])}`;
                  };

                  // Compose detailed prose + point-form bullets per the host's script_type choice.
                  // For 'full', return detailed (optionally wrapped in quotes if it's speech).
                  // For 'both', stack: detailed (optionally quoted, after heading) + "**Point Form:**" + bullets.
                  // For 'pointForm', return bullets unwrapped (they're tactical reminders, not speech).
                  // `quoteProse` defaults to false; pass true only for spoken fields where the
                  // body should display as something to deliver aloud.
                  const composeFormat = (detailed?: string, pointForm?: string, quoteProse: boolean = false): string | undefined => {
                    const d = (detailed || '').trim();
                    const p = (pointForm || '').trim();
                    if (!d && !p) return undefined;
                    if (scriptType === 'full' || !p) {
                      if (!d) return undefined;
                      return quoteProse ? wrapPreservingHeading(d) : d;
                    }
                    if (scriptType === 'pointForm') return p || d || undefined;
                    if (!d) return p;
                    // 'both' — optionally wrap prose, then append point-form section
                    const proseSection = quoteProse ? wrapPreservingHeading(d) : d;
                    return `${proseSection}\n\n**Point Form:**\n\n${p}`;
                  };

                  // Define character fields to render as editable sections.
                  // character_name leads so hosts can rename a character (e.g. pick one
                  // side of a dual-gender template name like "Clarabelle/Clarence Cow").
                  const characterFields: Array<{ key: string; content: string | undefined }> = [
                    { key: 'character_name', content: character.character_name },
                    { key: 'description', content: character.description },
                    { key: 'background', content: character.background },
                    { key: 'relationships', content: typeof character.relationships === 'string' ? character.relationships : undefined },
                    // Spoken fields below get quoteProse=true; rumors and accusations are
                    // structured (lists / tactical bullets), so they don't get quote-wrapped.
                    { key: 'introduction', content: composeFormat(character.introduction, character.introduction_pointform, true) },
                    { key: 'secret', content: character.secret },
                    { key: 'rumors', content: composeFormat(character.rumors, character.rumors_pointform) },
                    ...(hasDetectiveScripts
                      ? [{ key: 'round2_script', content: composeFormat(character.round2_script, character.round2_script_pointform, true) }]
                      : [
                          { key: 'round2_innocent',   content: composeFormat(character.round2_innocent,   character.round2_innocent_pointform,   true) },
                          { key: 'round2_guilty',     content: composeFormat(character.round2_guilty,     character.round2_guilty_pointform,     true) },
                          { key: 'round2_accomplice', content: composeFormat(character.round2_accomplice, character.round2_accomplice_pointform, true) },
                        ]),
                    { key: 'round2_questions', content: character.round2_questions },
                    ...(hasDetectiveScripts
                      ? [{ key: 'round3_script', content: composeFormat(character.round3_script, character.round3_script_pointform, true) }]
                      : [
                          { key: 'round3_innocent',   content: composeFormat(character.round3_innocent,   character.round3_innocent_pointform,   true) },
                          { key: 'round3_guilty',     content: composeFormat(character.round3_guilty,     character.round3_guilty_pointform,     true) },
                          { key: 'round3_accomplice', content: composeFormat(character.round3_accomplice, character.round3_accomplice_pointform, true) },
                        ]),
                    { key: 'round3_questions', content: character.round3_questions },
                    ...(hasDetectiveScripts
                      ? [{ key: 'round4_script', content: composeFormat(character.round4_script, character.round4_script_pointform, true) }]
                      : [
                          { key: 'round4_innocent',   content: composeFormat(character.round4_innocent,   character.round4_innocent_pointform,   true) },
                          { key: 'round4_guilty',     content: composeFormat(character.round4_guilty,     character.round4_guilty_pointform,     true) },
                          { key: 'round4_accomplice', content: composeFormat(character.round4_accomplice, character.round4_accomplice_pointform, true) },
                        ]),
                    { key: 'round4_questions', content: character.round4_questions },
                    { key: 'accusations', content: composeFormat(formatAccusations(character.accusations), character.accusations_pointform) },
                    ...(hasDetectiveScripts && character.final_statement
                      ? [{ key: 'final_statement', content: composeFormat(character.final_statement, character.final_statement_pointform, true) }]
                      : [
                          { key: 'final_innocent',   content: composeFormat(character.final_innocent,   character.final_innocent_pointform,   true) },
                          { key: 'final_guilty',     content: composeFormat(character.final_guilty,     character.final_guilty_pointform,     true) },
                          { key: 'final_accomplice', content: composeFormat(character.final_accomplice, character.final_accomplice_pointform, true) },
                          // ADR-0065: the actual confession, held back for The Reveal —
                          // distinct from final_guilty/final_accomplice above, which are
                          // now Final-Statements-round denials. No innocent counterpart:
                          // innocent characters are never called on to confess.
                          { key: 'reveal_confession_guilty',     content: composeFormat(character.reveal_confession_guilty,     character.reveal_confession_guilty_pointform,     true) },
                          { key: 'reveal_confession_accomplice', content: composeFormat(character.reveal_confession_accomplice, character.reveal_confession_accomplice_pointform, true) },
                        ]),
                  ];

                  return (
                    <Accordion key={character.id || index} type="single" collapsible className="character-accordion">
                      <AccordionItem value={`character-${index}`}>
                        <AccordionTrigger className={cn(
                          "text-left",
                          isMobile && "py-3"
                        )}>
                          <h3 className={cn(
                            "font-semibold",
                            isMobile ? "text-base" : "text-lg"
                          )}
                          style={{ color: '#E53E2A', fontFamily: "'Bowlby One', cursive" }}>
                            {character.character_name}
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent
                          forceMount
                          className={cn(
                            "text-foreground",
                            "group-data-[state=closed]:hidden print:!block print:!h-auto print:!overflow-visible",
                            isMobile && "text-sm"
                          )}
                        >
                          <div className="space-y-4">
                            {packageData?.gameOverview && (
                              <EditableSection
                                content={packageData.gameOverview}
                                onSave={() => Promise.resolve()}
                                canEdit={false}
                                sectionLabel={`${character.character_name} - game_overview`}
                                fallbackLabel="Game Overview"
                                isMobile={isMobile}
                              />
                            )}
                            {characterFields
                              .filter(f => f.content && !isStub(f.content))
                              .map(field => (
                                <React.Fragment key={`${character.id}-${field.key}`}>
                                  {ROUND_HEADERS[field.key] ? (
                                    <div className={cn("mb-2", isMobile && "text-sm")}>
                                      <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>
                                        {ROUND_HEADERS[field.key].title}
                                      </h3>
                                      <p className={cn("italic text-muted-foreground mt-1", isMobile ? "text-sm" : "text-base")}>
                                        {ROUND_HEADERS[field.key].instruction}
                                      </p>
                                    </div>
                                  ) : ROUND_INTENT[field.key] && (
                                    <div className={cn("prose max-w-none guide-intent", isMobile && "prose-sm")}>
                                      <ReactMarkdown>{`> ${ROUND_INTENT[field.key]}`}</ReactMarkdown>
                                    </div>
                                  )}
                                  <EditableSection
                                    content={field.content!}
                                    onSave={(val) =>
                                      onCharacterFieldUpdate?.(character.id, field.key, val) ?? Promise.resolve()
                                    }
                                    canEdit={!!onCharacterFieldUpdate}
                                    sectionLabel={`${character.character_name} - ${field.key}`}
                                    fallbackLabel={CHARACTER_FIELD_LABELS[field.key]}
                                    hideHeader={!!ROUND_HEADERS[field.key]}
                                    isMobile={isMobile}
                                  />
                                  {field.key === 'secret' && (
                                    <div className={cn("prose max-w-none guide-intent", isMobile && "prose-sm")}>
                                      <ReactMarkdown>{`> ${GUARD_DIRECTIVE}`}</ReactMarkdown>
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            ) : isGenerating ? (
              <LoadingTabContent
                message={t('mysteryPackage.loading.characters')}
                estimatedTime={estimatedTime}
              />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.characters')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clues" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {evidenceCards ? (
              <>
                {/* Print button when images are available */}
                {packageData?.evidenceCardImages && Object.keys(packageData.evidenceCardImages).length > 0 && (
                  <div className="flex justify-end mb-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        // Hide the React root via inline style (beats all CSS specificity) so
                        // only the portal'd .evidence-print-inline div prints. Restore on afterprint.
                        const root = document.getElementById('root');
                        if (!root) { window.print(); return; }
                        const prevDisplay = root.style.display;
                        const restore = () => {
                          root.style.display = prevDisplay;
                          window.removeEventListener('afterprint', restore);
                        };
                        window.addEventListener('afterprint', restore);
                        root.style.display = 'none';
                        // Let layout flush before the print dialog captures the page
                        requestAnimationFrame(() => window.print());
                      }}
                      style={{ backgroundColor: 'var(--color-red)', color: 'var(--color-cream)' }}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Evidence Cards
                    </Button>
                  </div>
                )}

                {/* Print-only evidence cards — portalled to body so CSS body > *:not() selector works */}
                {packageData?.evidenceCardImages && evidenceCards && (() => {
                  const images = packageData.evidenceCardImages as { round2?: string; round3?: string; round4?: string };
                  const cards = parseEvidenceCards(typeof evidenceCards === 'string' ? evidenceCards : '', images);
                  if (cards.length === 0) return null;
                  return createPortal(
                    <div className="evidence-print-inline">
                      <style>{`
                        @media screen { .evidence-print-inline { display: none !important; } }
                        @media print {
                          /* print.css forces the active tabpanel visible; override so only our cards print */
                          [role="tabpanel"][data-state="active"],
                          [role="tabpanel"] { display: none !important; }
                          body > *:not(.evidence-print-inline) { display: none !important; }
                          .evidence-print-inline { display: block !important; }
                          .epi-page {
                            width: 100%; height: 210mm; max-height: 210mm;
                            padding: 8mm 12mm 6mm; box-sizing: border-box;
                            display: flex; flex-direction: column;
                            page-break-after: always; page-break-inside: avoid; overflow: hidden;
                          }
                          .epi-page:last-child { page-break-after: auto; }
                          .epi-round {
                            font-size: 10px; font-weight: 700; text-transform: uppercase;
                            letter-spacing: 3px; color: #C81400 !important; margin-bottom: 10px;
                          }
                          .epi-image-frame {
                            width: 100%; flex: 1 1 auto; min-height: 0; overflow: hidden;
                            border-radius: 4px; background: #f0ece4; margin-bottom: 12px;
                          }
                          .epi-image { width: 100%; height: 100%; object-fit: cover; display: block; }
                          .epi-desc {
                            font-size: 12px; line-height: 1.55; color: #333;
                            margin: 0 0 6px 0; flex-shrink: 0;
                          }
                          .epi-footer {
                            font-size: 9px; color: #bbb !important; text-align: right;
                            margin-top: 10px; flex-shrink: 0;
                          }
                          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                        @page { size: A4 landscape; margin: 0; }
                      `}</style>
                      {cards.map((card, i) => (
                        <div key={i} className="epi-page">
                          <div className="epi-round">{card.round}</div>
                          <div className="epi-image-frame">
                            <img src={bustCache(card.imageUrl, Date.now())} alt={card.round} className="epi-image" />
                          </div>
                          {card.description.split(/\n\n+/).map((para, pi) => (
                            <p key={pi} className="epi-desc">{para.replace(/\n/g, ' ').trim()}</p>
                          ))}
                          <div className="epi-footer">Card {i + 1} of {cards.length}</div>
                        </div>
                      ))}
                    </div>,
                    document.body
                  );
                })()}

                {/* Evidence card images with lightbox */}
                {packageData?.evidenceCardImages && (
                  <EvidenceCardImageGrid images={packageData.evidenceCardImages} isMobile={isMobile} />
                )}

                <EditableMultiSection
                  content={evidenceCards}
                  onSave={(val) => onPackageFieldUpdate?.('evidence_cards', val) ?? Promise.resolve()}
                  canEdit={!!onPackageFieldUpdate}
                  sectionLabel="Evidence Cards"
                  isMobile={isMobile}
                />
              </>
            ) : isGenerating ? (
              <LoadingTabContent
                message={t('mysteryPackage.loading.clues')}
                estimatedTime={estimatedTime}
              />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.clues')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inspector" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {detectiveScript ? (
              <>
                <div className={cn(
                  "flex flex-wrap items-center justify-end gap-2 mb-3",
                  isMobile && "mb-2"
                )}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDetectiveScript}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {t('mysteryPackage.detectiveScript.copy')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadDetectiveScript}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t('mysteryPackage.detectiveScript.download')}
                  </Button>
                </div>
                <EditableMultiSection
                  content={detectiveScript}
                  onSave={(val) => onPackageFieldUpdate?.('detective_script', val) ?? Promise.resolve()}
                  canEdit={!!onPackageFieldUpdate}
                  sectionLabel="Detective Script"
                  isMobile={isMobile}
                />
              </>
            ) : isGenerating ? (
              <LoadingTabContent
                message={t('mysteryPackage.loading.inspector')}
                estimatedTime={estimatedTime}
              />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.inspector')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {guestDropoutAdaptationEnabled && packageId && (
          <TabsContent value="extras" className={cn("overflow-hidden", isMobile && "px-2")}>
            <div className={cn("mystery-content", isMobile && "text-sm")}>
              <GuestDropoutPanel
                packageId={packageId}
                characters={characters}
                mysteryStyle={mysteryStyle}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Feedback Nudge */}
      {isPaid && conversationId && feedbackAlreadyGiven && (
        <div className={cn(
          "mt-6 text-center text-sm text-muted-foreground",
          isMobile && "mt-4 px-2"
        )}>
          Thanks for sharing your feedback!
        </div>
      )}

      {isPaid && conversationId && showFeedbackNudge && !feedbackAlreadyGiven && (
        <Card
          className={cn("mt-6", isMobile && "mt-4 mx-2")}
          style={{ backgroundColor: 'var(--color-charcoal)', border: '1px solid rgba(245,240,232,0.15)' }}
        >
          <CardContent className={cn(
            "flex items-center justify-between py-4",
            isMobile && "flex-col space-y-3 px-4 py-3"
          )}>
            <div className={cn(
              "flex items-center gap-3",
              isMobile && "text-center flex-col"
            )}>
              <MessageSquare className="h-5 w-5 shrink-0" style={{ color: 'var(--color-red)' }} />
              <div>
                <p className={cn("font-medium", isMobile && "text-sm")} style={{ color: 'var(--color-cream)' }}>
                  How was your mystery party?
                </p>
                <p className={cn("text-sm", isMobile && "text-xs")} style={{ color: 'var(--color-cream-muted)' }}>
                  Your feedback helps us improve!
                </p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-2",
              isMobile && "w-full"
            )}>
              <Link
                to={`/feedback/${conversationId}`}
                onClick={handleFeedbackClick}
                className={cn("no-underline", isMobile && "flex-1")}
              >
                <Button
                  size="sm"
                  className={cn(isMobile && "w-full")}
                  style={{ backgroundColor: 'var(--color-red)', color: 'var(--color-cream)' }}
                >
                  Share Feedback
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissFeedback}
                className="h-8 w-8 p-0"
                style={{ color: 'var(--color-cream)' }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mystery Guest Manager Dialog */}
      <MysteryGuestManager
        open={showGuestManager}
        onOpenChange={setShowGuestManager}
        characters={characters}
        mysteryId={conversationId || ""}
        mysteryTitle={mysteryTitle}
        packageId={packageId}
      />

    </div>
  );
});

MysteryPackageTabView.displayName = 'MysteryPackageTabView';

export default MysteryPackageTabView;
