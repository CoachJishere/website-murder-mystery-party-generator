
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import SignInPrompt from "@/components/SignInPrompt";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();

  // Define all possible mystery themes with their corresponding prompts
  const MYSTERY_THEMES = useMemo(() => [
    { name: "hero.themes.1920sSpeakeasy", prompt: t("hero.prompts.1920sSpeakeasy") },
    { name: "hero.themes.hollywoodMurder", prompt: t("hero.prompts.hollywoodMurder") },
    { name: "hero.themes.castleMystery", prompt: t("hero.prompts.castleMystery") },
    { name: "hero.themes.sciFiMystery", prompt: t("hero.prompts.sciFiMystery") },
    { name: "hero.themes.artGalleryOpening", prompt: t("hero.prompts.artGalleryOpening") },
    { name: "hero.themes.bakeryCompetition", prompt: t("hero.prompts.bakeryCompetition") },
    { name: "hero.themes.mountainSkiResort", prompt: t("hero.prompts.mountainSkiResort") },
    { name: "hero.themes.luxuryTrainJourney", prompt: t("hero.prompts.luxuryTrainJourney") },
    { name: "hero.themes.historicUniversity", prompt: t("hero.prompts.historicUniversity") },
    { name: "hero.themes.pokerTournament", prompt: t("hero.prompts.pokerTournament") },
    { name: "hero.themes.barbieDreamworld", prompt: t("hero.prompts.barbieDreamworld") },
    { name: "hero.themes.dystopianWaterworld", prompt: t("hero.prompts.dystopianWaterworld") },
    { name: "hero.themes.jungleSteampunk", prompt: t("hero.prompts.jungleSteampunk") },
    { name: "hero.themes.magicalBakery", prompt: t("hero.prompts.magicalBakery") },
    { name: "hero.themes.gamingTournament", prompt: t("hero.prompts.gamingTournament") },
    { name: "hero.themes.synthwave80s", prompt: t("hero.prompts.synthwave80s") },
    { name: "hero.themes.beachResort", prompt: t("hero.prompts.beachResort") },
    { name: "hero.themes.operaHouse", prompt: t("hero.prompts.operaHouse") },
    { name: "hero.themes.wineCountry", prompt: t("hero.prompts.wineCountry") },
    { name: "hero.themes.safariAdventure", prompt: t("hero.prompts.safariAdventure") },
    { name: "hero.themes.fashionShow", prompt: t("hero.prompts.fashionShow") },
    { name: "hero.themes.casinoNight", prompt: t("hero.prompts.casinoNight") },
    { name: "hero.themes.fairyTaleKingdom", prompt: t("hero.prompts.fairyTaleKingdom") },
    { name: "hero.themes.spaceColony", prompt: t("hero.prompts.spaceColony") },
    { name: "hero.themes.superheroAcademy", prompt: t("hero.prompts.superheroAcademy") },
    { name: "hero.themes.underwaterCity", prompt: t("hero.prompts.underwaterCity") },
    { name: "hero.themes.wildWestSaloon", prompt: t("hero.prompts.wildWestSaloon") },
    { name: "hero.themes.vikingFeast", prompt: t("hero.prompts.vikingFeast") },
    { name: "hero.themes.candyKingdom", prompt: t("hero.prompts.candyKingdom") },
    { name: "hero.themes.dragonsLair", prompt: t("hero.prompts.dragonsLair") },
    { name: "hero.themes.timeTravelersBall", prompt: t("hero.prompts.timeTravelersBall") },
    { name: "hero.themes.atlantisRising", prompt: t("hero.prompts.atlantisRising") },
    { name: "hero.themes.toyBoxAdventure", prompt: t("hero.prompts.toyBoxAdventure") },
    { name: "hero.themes.vampireMasquerade", prompt: t("hero.prompts.vampireMasquerade") },
    { name: "hero.themes.dimensionHopping", prompt: t("hero.prompts.dimensionHopping") },
    { name: "hero.themes.cyberpunkNightclub", prompt: t("hero.prompts.cyberpunkNightclub") },
    { name: "hero.themes.ghostShip", prompt: t("hero.prompts.ghostShip") },
    { name: "hero.themes.sentientPlantColony", prompt: t("hero.prompts.sentientPlantColony") }
  ], [t]);

  // State for input value and UI
  const [inputValue, setInputValue] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // ── Typewriter cycling placeholder ──
  const STATIC_PREFIX = t('hero.typewriterPrefix', 'Create a mystery ');
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const typewriterPaused = useRef(false);

  // Pick a random starting index on mount
  useEffect(() => {
    setCurrentThemeIndex(Math.floor(Math.random() * MYSTERY_THEMES.length));
  }, [MYSTERY_THEMES.length]);

  // Get only the suffix (strip "Create a mystery " from the prompt)
  const getCurrentSuffix = useCallback(() => {
    const fullPrompt = MYSTERY_THEMES[currentThemeIndex]?.prompt || "";
    const prefixPattern = /^Create a mystery\s*/i;
    const ptPrefixPattern = /^Crie um mistério\s*/i;
    return fullPrompt.replace(prefixPattern, "").replace(ptPrefixPattern, "");
  }, [currentThemeIndex, MYSTERY_THEMES]);

  // Typewriter effect
  // Track whether we've already seeded the full suffix for a focused-empty resume
  const resumedRef = useRef(false);

  // When user clears input while focused, seed the full suffix and pause before erasing
  useEffect(() => {
    if (isFocused && !inputValue && !resumedRef.current) {
      resumedRef.current = true;
      const currentSuffix = getCurrentSuffix();
      setDisplayText(currentSuffix);
      setIsTyping(true); // set to typing so the 2500ms pause-before-erase triggers naturally
    }
    if (inputValue) {
      resumedRef.current = false;
    }
  }, [isFocused, inputValue, getCurrentSuffix]);

  // Main typewriter loop
  useEffect(() => {
    // Pause when user is typing their own text
    if (inputValue) {
      typewriterPaused.current = true;
      return;
    }
    typewriterPaused.current = false;

    const currentSuffix = getCurrentSuffix();
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (displayText.length < currentSuffix.length) {
        timeout = setTimeout(() => {
          if (!typewriterPaused.current) {
            setDisplayText(currentSuffix.slice(0, displayText.length + 1));
          }
        }, 30 + Math.random() * 40);
      } else {
        timeout = setTimeout(() => {
          if (!typewriterPaused.current) {
            setIsTyping(false);
          }
        }, 2500);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          if (!typewriterPaused.current) {
            setDisplayText(displayText.slice(0, -1));
          }
        }, 20);
      } else {
        setCurrentThemeIndex((prev) => (prev + 1) % MYSTERY_THEMES.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, isFocused, inputValue, currentThemeIndex, MYSTERY_THEMES, getCurrentSuffix]);

  // Show typewriter overlay when no user input (whether focused or not)
  const showTypewriter = !inputValue;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Don't clear displayText — typewriter keeps running until user types
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    resumedRef.current = false;
  }, []);

  const extractThemeFromPrompt = (prompt: string) => {
    const themeMatch = prompt.match(/theme[d]?\s+(is|of|as|for|about|like)?\s+([a-zA-Z0-9\s'"-]+)/i);
    if (themeMatch && themeMatch[2]) {
      return themeMatch[2].trim();
    }

    const settings = [
      "speakeasy", "hollywood", "castle", "space", "gallery", "bakery", "resort",
      "train", "university", "tournament", "dreamworld", "waterworld", "jungle",
      "magical", "gaming", "80s", "beach", "opera", "vineyard", "safari", "fashion",
      "casino", "fairy tale", "colony", "superhero", "underwater", "wild west",
      "viking", "candy", "dragon", "time travel", "atlantis", "toys", "vampire",
      "dimension", "cyberpunk", "ghost ship", "plant"
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const setting of settings) {
      if (lowerPrompt.includes(setting)) {
        return setting.charAt(0).toUpperCase() + setting.slice(1);
      }
    }

    return "Murder Mystery";
  };

  const handleSubmit = (value: string) => {
    if (!value.trim()) {
      toast.error("Please enter a description for your mystery");
      return;
    }

    if (isAuthenticated) {
      setIsCreating(true);

      try {
        const theme = extractThemeFromPrompt(value);
        console.log("Navigating to create page with theme:", theme);
        navigate(`/mystery/create?input=${encodeURIComponent(value)}`);
      } catch (error) {
        console.error("Error:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsCreating(false);
      }
    } else {
      setShowSignInPrompt(true);
    }
  };

  return (
    <div
      className="py-8 sm:py-12 md:py-20 px-2 sm:px-4 md:px-6 lg:px-8"
      style={{
        backgroundColor: 'var(--color-red)',
        backgroundImage: 'url(/images/detective-image.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          zIndex: 0,
        }}
      />
      <div className="w-full max-w-7xl mx-auto text-center" style={{ position: 'relative', zIndex: 1 }}>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[60px] font-display mb-3 sm:mb-4 tracking-tight leading-tight uppercase"
          style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('hero.title')}
        </h1>
        <p
          className="text-lg sm:text-xl max-w-2xl mx-auto mb-4 sm:mb-5 px-2 font-inter"
          style={{ color: 'var(--color-cream-muted)', fontFamily: 'var(--font-body)' }}
        >
          {isAuthenticated
            ? t('hero.subtitleAuth')
            : t('hero.subtitle')}
        </p>

        <div className="max-w-2xl mx-auto px-2 sm:px-0 relative">
          {/* Typewriter overlay */}
          {showTypewriter && (
            <div className="absolute left-2 sm:left-0 right-2 sm:right-0 top-0 z-10 pointer-events-none">
              <div className="max-w-2xl mx-auto relative">
                <div className="pt-3">
                  <div className="px-4 pt-2 text-left">
                    <span className="text-[15px] leading-snug" style={{ color: 'rgba(0, 0, 0, 0.4)' }}>
                      <span>{STATIC_PREFIX}</span>
                      <span>{displayText}</span>
                      <span className="inline-block w-[2px] h-[1em] ml-[1px] animate-pulse align-middle" style={{ backgroundColor: 'rgba(200, 20, 0, 0.5)' }} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <AIInputWithLoading
            placeholder={showTypewriter
              ? ""
              : isAuthenticated
                ? t('hero.placeholderAuth')
                : t('hero.placeholder')}
            value={inputValue}
            setValue={setInputValue}
            onSubmit={handleSubmit}
            loading={isCreating}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <SignInPrompt
          isOpen={showSignInPrompt}
          onClose={() => setShowSignInPrompt(false)}
        />
      </div>
    </div>
  );
};

export default Hero;
