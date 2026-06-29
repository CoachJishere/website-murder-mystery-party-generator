
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface HeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
}

// Map our i18n locale codes to BCP-47 / OpenGraph locale codes.
const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
  it: "it_IT",
  pt: "pt_PT",
  nl: "nl_NL",
  da: "da_DK",
  sv: "sv_SE",
  fi: "fi_FI",
  ko: "ko_KR",
  ja: "ja_JP",
  "zh-CN": "zh_CN",
  "zh-cn": "zh_CN",
  zh: "zh_CN",
};

const Head = ({
  title,
  description,
  canonical = "https://www.mysterymaker.party/",
  image = "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true",
}: HeadProps) => {
  const { t, i18n } = useTranslation();

  // Resolve i18n-aware fallbacks so callers can omit explicit copy and still
  // get localized title/description.
  const resolvedTitle = title ?? t("home.seo.title");
  const resolvedDescription = description ?? t("home.seo.description");
  const brand = t("home.seo.brand", { defaultValue: "Murder Mystery Party Generator" });
  const fullTitle = `${resolvedTitle} | ${brand}`;

  const lang = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  const htmlLang = lang.startsWith("zh") ? "zh-Hans" : lang.split("-")[0];
  const ogLocale = OG_LOCALE_MAP[i18n.resolvedLanguage || i18n.language] || OG_LOCALE_MAP[htmlLang] || "en_US";

  return (
    <Helmet>
      <html lang={htmlLang} />
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={ogLocale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default Head;
