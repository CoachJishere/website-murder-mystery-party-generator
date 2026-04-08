import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface EditableSectionProps {
  content: string;
  onSave: (newContent: string) => Promise<void>;
  canEdit: boolean;
  sectionLabel: string;
  isMobile: boolean;
  className?: string;
}

/**
 * Strips markdown formatting for display in a plain textarea.
 * Removes headers (##), bold (**), italic (*), and bullet markers (- ).
 * Preserves the actual text content and line structure.
 */
function stripMarkdownForEditing(markdown: string): string {
  if (!markdown) return "";

  return markdown
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      // Remove header markers (keep the text)
      if (/^#{1,6}\s+/.test(trimmed)) {
        return trimmed.replace(/^#{1,6}\s+/, "");
      }
      return line;
    })
    .join("\n")
    // Remove bold markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    // Remove italic markers (single *)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Reconstructs markdown from edited plain text by re-applying
 * the header from the original content.
 */
function reconstructMarkdown(
  editedText: string,
  originalMarkdown: string
): string {
  if (!originalMarkdown) return editedText;

  // Extract the original header line if present
  const lines = originalMarkdown.split("\n");
  const headerLine = lines.find((l) => /^#{1,6}\s+/.test(l.trim()));

  if (headerLine) {
    return `${headerLine.trim()}\n\n${editedText.trim()}`;
  }

  return editedText;
}

const EditableSection: React.FC<EditableSectionProps> = ({
  content,
  onSave,
  canEdit,
  sectionLabel,
  isMobile,
  className,
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract header from content for display as fixed label
  const extractHeader = useCallback((md: string): string | null => {
    if (!md) return null;
    const match = md.match(/^(#{1,6})\s+(.+)$/m);
    return match ? match[2] : null;
  }, []);

  // Get the body content (everything after the first header)
  const getBodyContent = useCallback((md: string): string => {
    if (!md) return "";
    const lines = md.split("\n");
    const headerIndex = lines.findIndex((l) => /^#{1,6}\s+/.test(l.trim()));
    if (headerIndex >= 0) {
      return lines
        .slice(headerIndex + 1)
        .join("\n")
        .trim();
    }
    return md;
  }, []);

  const header = extractHeader(content);
  const bodyContent = getBodyContent(content);

  const handleEdit = useCallback(() => {
    setEditValue(stripMarkdownForEditing(bodyContent));
    setIsEditing(true);
  }, [bodyContent]);

  // Auto-resize textarea and focus on edit
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditValue(e.target.value);
      // Auto-resize
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const reconstructed = reconstructMarkdown(editValue, content);
      await onSave(reconstructed);
      setIsEditing(false);
      toast.success(t("mysteryPackage.edit.saved"));
    } catch (error: any) {
      toast.error(
        t("mysteryPackage.edit.error") ||
          error.message ||
          "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  }, [editValue, content, onSave, t]);

  const handleCancel = useCallback(() => {
    const originalStripped = stripMarkdownForEditing(bodyContent);
    if (editValue !== originalStripped) {
      if (!window.confirm(t("mysteryPackage.edit.discardConfirm"))) {
        return;
      }
    }
    setIsEditing(false);
  }, [editValue, bodyContent, t]);

  // Escape key exits editing
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, handleCancel]);

  return (
    <div className={cn("editable-section relative group", className)}>
      {/* Fixed header with edit button */}
      {header && (
        <div className="flex items-center justify-between mb-2">
          <h3
            className={cn(
              "font-semibold text-foreground",
              isMobile ? "text-base" : "text-lg"
            )}
          >
            {header}
          </h3>
          {canEdit && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 print:hidden"
              title={t("mysteryPackage.edit.button")}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      )}

      {/* No header case — show edit button inline */}
      {!header && canEdit && !isEditing && (
        <div className="absolute top-0 right-0 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            title={t("mysteryPackage.edit.button")}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Content area */}
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={handleTextareaChange}
            className={cn(
              "min-h-[120px] resize-none font-sans text-foreground",
              isMobile ? "text-sm" : "text-base"
            )}
            aria-label={sectionLabel}
          />
          <div className={cn("flex gap-2", isMobile && "flex-col")}>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className={cn(isMobile && "w-full")}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {t("mysteryPackage.edit.saving")}
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  {t("mysteryPackage.edit.save")}
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              disabled={isSaving}
              className={cn(isMobile && "w-full")}
            >
              <X className="h-3 w-3 mr-1" />
              {t("mysteryPackage.edit.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "prose max-w-none overflow-x-auto",
            isMobile && "prose-sm"
          )}
        >
          <ReactMarkdown>{header ? bodyContent : content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default EditableSection;
