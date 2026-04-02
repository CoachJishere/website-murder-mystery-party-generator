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
          className="rounded-2xl transition-shadow duration-300"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div className="px-4 pt-2 pb-0">
            <textarea
              id={id}
              ref={textareaRef}
              placeholder={placeholder}
              className="w-full bg-transparent resize-none outline-none text-left text-[15px] leading-snug min-h-[24px]"
              style={{
                color: '#000000',
                fontFamily: 'var(--font-body)',
              }}
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
                  ? "opacity-50"
                  : "hover:opacity-90"
              )}
              style={{
                backgroundColor: 'var(--color-red)',
                color: 'var(--color-cream)',
              }}
              type="button"
              disabled={submitted}
            >
              {submitted ? (
                <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(245,240,232,0.3)', borderTopColor: 'var(--color-cream)' }} />
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
