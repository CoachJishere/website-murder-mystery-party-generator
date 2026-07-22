import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import SignInPrompt from "@/components/SignInPrompt";
import { useAuth } from "@/context/AuthContext";

// The cold-case brief box — a faithful sibling of the party homepage's Hero chatbox
// (owner call 2026-07-04: same flow across the site). Same typewriter mechanics, same
// AIInputWithLoading, same auth gate: signed-in users carry their brief to
// /cold-case/create; guests get the SignInPrompt. The cycling examples do the selling —
// they SHOW the possibility space (an era, a place, a hook), which no static
// placeholder can.
const CASE_BRIEFS = [
  "A murder on a 1920s ocean liner, somewhere between Southampton and New York",
  "A death at a Cold War listening post, winter 1961",
  "The village doctor found in the millpond, 1938",
  "A lighthouse keeper who never lit the lamp, Cornwall 1899",
  "A poisoning at a Kyoto tea house, 1955",
  "The archaeologist who never left the dig, Egypt 1927",
  "A fall from the opera house balcony, Vienna 1913",
  "The chess champion found frozen at an alpine hotel, 1938",
  "A drowning at the jazz festival, New Orleans 1959",
  "The stationmaster's last train, rural England 1947",
  "A body in the vineyard press house, Bordeaux 1934",
  "The radio operator who missed his final broadcast, Iceland 1952",
  "A death backstage at the travelling circus, 1931",
  "The librarian locked inside her own archive, Boston 1921",
  "The ferryman who never reached the far bank, Norway 1926",
  "A fatal duel that history recorded as a hunting accident, Prussia 1897",
];

export default function ColdCaseBrief() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const briefs = useMemo(() => CASE_BRIEFS, []);
  const [inputValue, setInputValue] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // ── Typewriter cycling placeholder (mechanics mirrored from Hero.tsx) ──
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const typewriterPaused = useRef(false);
  const resumedRef = useRef(false);

  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * briefs.length));
  }, [briefs.length]);

  const getCurrentSuffix = useCallback(() => briefs[currentIndex] || "", [currentIndex, briefs]);

  // When the user clears the input while focused, reseed and pause before erasing
  useEffect(() => {
    if (isFocused && !inputValue && !resumedRef.current) {
      resumedRef.current = true;
      setDisplayText(getCurrentSuffix());
      setIsTyping(true);
    }
    if (inputValue) resumedRef.current = false;
  }, [isFocused, inputValue, getCurrentSuffix]);

  useEffect(() => {
    if (inputValue) {
      typewriterPaused.current = true;
      return;
    }
    typewriterPaused.current = false;
    const suffix = getCurrentSuffix();
    let timeout: NodeJS.Timeout;
    if (isTyping) {
      if (displayText.length < suffix.length) {
        timeout = setTimeout(() => {
          if (!typewriterPaused.current) setDisplayText(suffix.slice(0, displayText.length + 1));
        }, 30 + Math.random() * 40);
      } else {
        timeout = setTimeout(() => {
          if (!typewriterPaused.current) setIsTyping(false);
        }, 2500);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          if (!typewriterPaused.current) setDisplayText(displayText.slice(0, -1));
        }, 20);
      } else {
        setCurrentIndex((prev) => (prev + 1) % briefs.length);
        setIsTyping(true);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayText, isTyping, isFocused, inputValue, currentIndex, briefs, getCurrentSuffix]);

  const showTypewriter = !inputValue;

  const handleSubmit = (value: string) => {
    if (!value.trim()) {
      toast.error("Describe your case — an era, a place, anything you want woven in.");
      return;
    }
    if (isAuthenticated) {
      navigate(`/cold-case/create?input=${encodeURIComponent(value)}`);
    } else {
      setShowSignInPrompt(true);
    }
  };

  return (
    <div className="max-w-2xl relative">
      {/* Typewriter overlay (same structure as the party Hero) */}
      {showTypewriter && (
        <div className="absolute left-0 right-0 top-0 z-10 pointer-events-none">
          <div className="relative">
            <div className="pt-3">
              <div className="px-4 pt-2 text-left">
                <span className="text-[15px] leading-snug" style={{ color: "rgba(0, 0, 0, 0.4)" }}>
                  <span>{displayText}</span>
                  <span
                    className="inline-block w-[2px] h-[1em] ml-[1px] animate-pulse align-middle"
                    style={{ backgroundColor: "rgba(200, 20, 0, 0.5)" }}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <AIInputWithLoading
        placeholder=""
        value={inputValue}
        setValue={setInputValue}
        onSubmit={handleSubmit}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <SignInPrompt isOpen={showSignInPrompt} onClose={() => setShowSignInPrompt(false)} />
    </div>
  );
}
