import { useTranslation } from "react-i18next";

// Text lookup for `mysteryPackage.hostSeal.*`. The app's typed i18n resources reject new
// literal keys in tsc (the baseline already has hundreds of these), so the lookup is typed
// loosely here once instead of adding an error per call site.
export function useHostSealText(): (key: "label" | "description" | "scriptSealed" | "scriptCannotSeal" | "evidenceNotice") => string {
  const { t } = useTranslation();
  return (key) => (t as unknown as (k: string) => string)(`mysteryPackage.hostSeal.${key}`);
}
