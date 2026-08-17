import { useTranslation } from "react-i18next";

// Single source of truth for the round-context copy shown on both the host's
// editable Characters tab (MysteryPackageTabView.tsx) and the no-login guest
// character guide (CharacterAccess.tsx). Previously each file kept its own
// hardcoded copy of this content — they had already drifted (see ADR-0090) —
// so this module owns the translated strings and each caller applies its own
// markup around them.

// Maps a mystery_characters column name to the canonical round key its
// round-context copy is keyed under. Several columns (e.g. round2_script and
// round2_innocent) share identical copy because only one of the two is ever
// populated for a given package (detective-style vs. character-style).
const FIELD_TO_ROUND_KEY: Record<string, string> = {
  introduction: "introduction",
  rumors: "rumors",
  round2_script: "round2",
  round2_innocent: "round2",
  round3_script: "round3",
  round3_innocent: "round3",
  round4_script: "round4",
  round4_innocent: "round4",
  accusations: "accusations",
  // final_statement (detective-style) permits confession-or-denial; final_innocent
  // (character-style, ADR-0065) is denial-only for everyone including the guilty —
  // genuinely different instruction text, not a duplicate pair like the round2-4 ones.
  final_statement: "finalStatement",
  final_innocent: "finalInnocent",
  reveal_confession_guilty: "revealGuilty",
  reveal_confession_accomplice: "revealAccomplice",
};

const ROUND_KEYS = [
  "introduction",
  "rumors",
  "round2",
  "round3",
  "round4",
  "accusations",
  "finalStatement",
  "finalInnocent",
  "revealGuilty",
  "revealAccomplice",
] as const;

export interface RoundHeader {
  title: string;
  instruction: string;
}

export interface CharacterGuideCopy {
  fieldLabels: Record<string, string>;
  roundHeaders: Record<string, RoundHeader>;
  /** The round-context header for a given mystery_characters column, or undefined if it has none. */
  roundHeaderForField: (field: string) => RoundHeader | undefined;
  guardDirective: string;
  characterNameEditingTip: string;
}

export function useCharacterGuideCopy(): CharacterGuideCopy {
  const { t } = useTranslation();

  const fieldLabels: Record<string, string> = {
    character_name: t("characterGuide.fieldLabels.characterName"),
    description: t("characterGuide.fieldLabels.description"),
    background: t("characterGuide.fieldLabels.background"),
    relationships: t("characterGuide.fieldLabels.relationships"),
    secret: t("characterGuide.fieldLabels.secret"),
    introduction: t("characterGuide.fieldLabels.introduction"),
    rumors: t("characterGuide.fieldLabels.rumors"),
    round2_script: t("characterGuide.fieldLabels.round2Script"),
    round2_questions: t("characterGuide.fieldLabels.round2Questions"),
    round2_innocent: t("characterGuide.fieldLabels.round2Innocent"),
    round2_guilty: t("characterGuide.fieldLabels.round2Guilty"),
    round2_accomplice: t("characterGuide.fieldLabels.round2Accomplice"),
    round3_script: t("characterGuide.fieldLabels.round3Script"),
    round3_questions: t("characterGuide.fieldLabels.round3Questions"),
    round3_innocent: t("characterGuide.fieldLabels.round3Innocent"),
    round3_guilty: t("characterGuide.fieldLabels.round3Guilty"),
    round3_accomplice: t("characterGuide.fieldLabels.round3Accomplice"),
    round4_script: t("characterGuide.fieldLabels.round4Script"),
    round4_questions: t("characterGuide.fieldLabels.round4Questions"),
    round4_innocent: t("characterGuide.fieldLabels.round4Innocent"),
    round4_guilty: t("characterGuide.fieldLabels.round4Guilty"),
    round4_accomplice: t("characterGuide.fieldLabels.round4Accomplice"),
    accusations: t("characterGuide.fieldLabels.accusations"),
    final_statement: t("characterGuide.fieldLabels.finalStatement"),
    final_innocent: t("characterGuide.fieldLabels.finalInnocent"),
    final_guilty: t("characterGuide.fieldLabels.finalGuilty"),
    final_accomplice: t("characterGuide.fieldLabels.finalAccomplice"),
    reveal_confession_guilty: t("characterGuide.fieldLabels.revealConfessionGuilty"),
    reveal_confession_accomplice: t("characterGuide.fieldLabels.revealConfessionAccomplice"),
  };

  const roundHeaders: Record<string, RoundHeader> = {};
  for (const key of ROUND_KEYS) {
    roundHeaders[key] = {
      title: t(`characterGuide.roundHeaders.${key}.title`),
      instruction: t(`characterGuide.roundHeaders.${key}.instruction`),
    };
  }

  return {
    fieldLabels,
    roundHeaders,
    roundHeaderForField: (field: string) => {
      const roundKey = FIELD_TO_ROUND_KEY[field];
      return roundKey ? roundHeaders[roundKey] : undefined;
    },
    guardDirective: t("characterGuide.guardDirective"),
    characterNameEditingTip: t("characterGuide.characterNameEditingTip"),
  };
}
