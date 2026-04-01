"use client";

import { ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";
import { useTranslation } from "react-i18next";

interface AIInputWithLoadingProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  loadingDuration?: number;
  thinkingDuration?: number;
  onSubmit?: (value: string) => void | Promise<void>;
  className?: string;
  autoAnimate?: boolean;
  value?: string;
  setValue?: (value: string) => void;
  loading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function AIInputWithLoading({
  id = "ai-input-with-loading",
  placeholder = "Ask me anything!",
  minHeight = 80,
  maxHeight = 200,
  loadingDuration = 3000,
  thinkingDuration = 1000,
  onSubmit,
  className,
  autoAnimate = false,
  value,
  setValue,
  loading = false,
  onFocus,
  onBlur,
}: AIInputWithLoadingProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value || "");
  const [submitted, setSubmitted] = useState(autoAnimate || loading);
  const [isAnimating, setIsAnimating] = useState(autoAnimate);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
      setTimeout(() => adjustHeight(), 0);
    }
  }, [value, adjustHeight]);

  useEffect(() => {
    setSubmitted(loading);
  }, [loading]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runAnimation = () => {
      if (!isAnimating) return;
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, thinkingDuration);
      }, loadingDuration);
    };

    if (isAnimating) {
      runAnimation();
    }

    return () => clearTimeout(timeoutId);
  }, [isAnimating, loadingDuration, thinkingDuration]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || submitted) return;

    setSubmitted(true);
    await onSubmit?.(inputValue);
    setInputValue("");
    adjustHeight(true);

    setTimeout(() => {
      setSubmitted(false);
    }, loadingDuration);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setValue && setValue(newValue);
    adjustHeight();
  };

  return (
    <div className={cn("w-full py-3", className)}>
      <div className="relative max-w-2xl w-full mx-auto">
        <div
          className={cn(
            "bg-white dark:bg-zinc-900 rounded-2xl",
            "shadow-[0_2px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)]",
            "border border-black/[0.06] dark:border-white/[0.08]",
            "transition-shadow duration-300",
            "hover:shadow-[0_4px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_30px_rgba(0,0,0,0.4)]",
            "focus-within:shadow-[0_4px_30px_rgba(139,21,56,0.15)] dark:focus-within:shadow-[0_4px_30px_rgba(139,21,56,0.25)]",
            "focus-within:border-[#8B1538]/20 dark:focus-within:border-[#8B1538]/30"
          )}
        >
          <div className="px-4 pt-2 pb-0">
            <textarea
              id={id}
              ref={textareaRef}
              placeholder={placeholder}
              className={cn(
                "w-full bg-transparent resize-none outline-none text-left",
                "text-black dark:text-white text-[15px] leading-snug",
                "placeholder:text-black/40 dark:placeholder:text-white/40",
                "min-h-[24px]"
              )}
              value={inputValue}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onFocus={onFocus}
              onBlur={onBlur}
              disabled={submitted}
              rows={1}
            />
          </div>
          <div className="flex items-center justify-end px-3 pb-1.5 pt-0">
            <button
              onClick={handleSubmit}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200",
                submitted
                  ? "bg-black/30 dark:bg-white/20 text-white"
                  : "bg-black/70 hover:bg-black/90 dark:bg-white/70 dark:hover:bg-white/90 text-white dark:text-black"
              )}
              type="button"
              disabled={submitted}
            >
              {submitted ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
