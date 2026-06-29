import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Palette, Users, UserCog, Printer } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SITE = "https://www.mysterymaker.party";
const PATH = "custom-murder-mystery-party";
const OG_IMAGE =
  "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true";

// All languages that have a localized version of this page. Used to emit
// reciprocal hreflang alternates so Google serves the right language variant.
// 'zh-cn' is our i18n code; Google's canonical form for Simplified Chinese is
// 'zh-Hans', mapped at emit time (mirrors scripts/generate-sitemap.mjs).
const LANGS = ["en", "es", "fr", "de", "it", "pt", "nl", "da", "sv", "fi", "ko", "ja", "zh-cn"];

const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US", es: "es_ES", fr: "fr_FR", de: "de_DE", it: "it_IT", pt: "pt_PT",
  nl: "nl_NL", da: "da_DK", sv: "sv_SE", fi: "fi_FI", ko: "ko_KR", ja: "ja_JP", "zh-cn": "zh_CN",
};

const hreflangCode = (lang: string) => (lang === "zh-cn" ? "zh-Hans" : lang);
const pageUrl = (lang: string) => (lang === "en" ? `${SITE}/${PATH}/` : `${SITE}/${lang}/${PATH}/`);

export default function CustomMurderMysteryParty() {
  const { lang } = useParams<{ lang?: string }>();
  // Call through an any-typed reference so the typed-resource TFunction isn't
  // instantiated (avoids TS2589 "excessively deep") and dynamic keys are allowed.
  // Same escape hatch as BlogIndex.tsx, which casts useTranslation()'s result to any.
  const useT: any = useTranslation;
  const { t, i18n } = useT();

  // URL language takes precedence over the active i18n setting (matches BlogIndex).
  const urlLang = lang || i18n.language.split("-")[0];

  useEffect(() => {
    if (lang && lang !== i18n.language.split("-")[0]) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  // Resolve the canonical/og language to one we actually publish; fall back to en.
  const canonicalLang = LANGS.includes(urlLang) ? urlLang : "en";
  const canonical = pageUrl(canonicalLang);
  const ogLocale = OG_LOCALE_MAP[canonicalLang] || "en_US";

  const features = [
    { icon: Palette, key: "theme" },
    { icon: Users, key: "guests" },
    { icon: UserCog, key: "characters" },
    { icon: Printer, key: "kit" },
  ] as const;

  // Two FAQ entries, mirrored 1:1 into the FAQPage schema so the visible copy
  // and the structured data never drift.
  const faq = [
    { q: t("customParty.faq.q1"), a: t("customParty.faq.a1") },
    { q: t("customParty.faq.q2"), a: t("customParty.faq.a2") },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Helmet>
        <html lang={hreflangCode(canonicalLang)} />
        <title>{t("customParty.seo.title")}</title>
        <meta name="description" content={t("customParty.seo.description")} />
        <link rel="canonical" href={canonical} />
        {LANGS.map((l) => (
          <link key={l} rel="alternate" hrefLang={hreflangCode(l)} href={pageUrl(l)} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={pageUrl("en")} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={t("customParty.seo.title")} />
        <meta property="og:description" content={t("customParty.seo.description")} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content={ogLocale} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-[#C81400] mb-6">
              {t("customParty.hero.h1")}
            </h1>
            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed mb-8">
              {t("customParty.hero.intro")}
            </p>
            <Button
              asChild
              className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors"
            >
              <Link to="/mystery/create">
                {t("customParty.hero.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Body / customization explainer */}
        <section className="px-4 pb-16">
          <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
            <p className="text-foreground leading-relaxed">{t("customParty.body.lead")}</p>

            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mt-12 mb-4">
              {t("customParty.body.designHeading")}
            </h2>
            <p className="text-foreground leading-relaxed">{t("customParty.body.themePara")}</p>
            <p className="text-foreground leading-relaxed">{t("customParty.body.guestPara")}</p>
            <p className="text-foreground leading-relaxed">{t("customParty.body.characterPara")}</p>
            <p className="text-foreground leading-relaxed">{t("customParty.body.kitPara")}</p>
          </div>

          {/* Feature cards */}
          <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, key }) => (
              <Card key={key} className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Icon className="h-6 w-6 text-[#C81400]" />
                    {t(`customParty.features.${key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t(`customParty.features.${key}.body`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mid-page CTA */}
          <div className="max-w-3xl mx-auto mt-12 text-center">
            <Button
              asChild
              className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors"
            >
              <Link to="/mystery/create">
                {t("customParty.midCta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            {/* Internal link to the office/team-building landing page */}
            <p className="text-muted-foreground mt-6">
              {t("customParty.officeLink.lead")}{" "}
              <Link to="/office-murder-mystery-party" className="text-[#C81400] hover:underline font-medium">
                {t("customParty.officeLink.link")}
              </Link>{" "}
              {t("customParty.officeLink.end")}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-20 bg-[#000000]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mb-8 text-center">
              {t("customParty.faq.heading")}
            </h2>
            <div className="space-y-8">
              {faq.map((item) => (
                <div key={item.q}>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
