import React, { useMemo, useCallback, useRef } from "react";
import EditableSection from "./EditableSection";

interface EditableMultiSectionProps {
  content: string;
  onSave: (newFullContent: string) => Promise<void>;
  canEdit: boolean;
  sectionLabel: string;
  isMobile: boolean;
  className?: string;
}

/**
 * Splits a single markdown field by ## headers into separate
 * EditableSection blocks. On save of any section, reconstructs
 * the full content and calls onSave with the complete string.
 */

interface ParsedSection {
  id: string;
  raw: string; // full original text including header
}

function splitByHeaders(markdown: string): ParsedSection[] {
  if (!markdown || typeof markdown !== "string") return [];

  // Normalise escaped newlines from DB
  const normalised = markdown.replace(/\\n/g, "\n");

  // Split on lines that start with ## or ### headers
  const lines = normalised.split("\n");
  const sections: ParsedSection[] = [];
  let current: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    // A new section starts at ## or ### (but not ####)
    if (/^#{2,3} (?!#)/.test(line.trim()) && current.length > 0) {
      const raw = current.join("\n").trim();
      if (raw) {
        sections.push({ id: `section-${sectionIndex}`, raw });
        sectionIndex++;
      }
      current = [line];
    } else {
      current.push(line);
    }
  }

  // Push the last section
  const raw = current.join("\n").trim();
  if (raw) {
    sections.push({ id: `section-${sectionIndex}`, raw });
  }

  return sections;
}

const EditableMultiSection: React.FC<EditableMultiSectionProps> = ({
  content,
  onSave,
  canEdit,
  sectionLabel,
  isMobile,
  className,
}) => {
  const sections = useMemo(() => splitByHeaders(content), [content]);

  // Keep a mutable ref to the latest section contents so saves
  // always reconstruct from the most recent state
  const sectionContents = useRef<Map<string, string>>(new Map());

  // Initialise ref from parsed sections
  useMemo(() => {
    sectionContents.current = new Map(
      sections.map((s) => [s.id, s.raw])
    );
  }, [sections]);

  const handleSectionSave = useCallback(
    async (sectionId: string, newContent: string) => {
      sectionContents.current.set(sectionId, newContent);

      // Reconstruct the full field from all sections in order
      const fullContent = sections
        .map((s) => sectionContents.current.get(s.id) ?? s.raw)
        .join("\n\n");

      await onSave(fullContent);
    },
    [sections, onSave]
  );

  // If there's only one section (no ## headers), render a single EditableSection
  if (sections.length <= 1) {
    return (
      <EditableSection
        content={content}
        onSave={onSave}
        canEdit={canEdit}
        sectionLabel={sectionLabel}
        isMobile={isMobile}
        className={className}
      />
    );
  }

  return (
    <div className={className ?? "space-y-3"}>
      {sections.map((section) => (
        <EditableSection
          key={section.id}
          content={section.raw}
          onSave={(val) => handleSectionSave(section.id, val)}
          canEdit={canEdit}
          sectionLabel={`${sectionLabel} - ${section.id}`}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
};

export default EditableMultiSection;
