import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Users, CalendarClock, Briefcase, MonitorSmartphone } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SITE = "https://www.mysterymaker.party";
const PATH = "office-murder-mystery-party";
const OG_IMAGE =
  "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true";

// English-only at launch. The page targets an English-intent query
// ("office murder mystery party") and the officeParty.* copy lives only in
// en.json for now; i18next falls back to English for other locales. When the
// copy is translated, add the locale codes here and the page will emit the
// matching hreflang alternates (mirror the addition in scripts/generate-sitemap.mjs).
const LANGS = ["en"];

const hreflangCode = (lang: string) => (lang === "zh-cn" ? "zh-Hans" : lang);
const pageUrl = (lang: string) => (lang === "en" ? `${SITE}/${PATH}/` : `${SITE}/${lang}/${PATH}/`);

export default function OfficeMurderMysteryParty() {
  const { lang } = useParams<{ lang?: string }>();
  // Call through an any-typed reference so the typed-resource TFunction isn't
  // instantiated (avoids TS2589 "excessively deep") and dynamic keys are allowed.
  // Same escape hatch as CustomMurderMysteryParty.tsx / BlogIndex.tsx.
  const useT: any = useTranslation;
  const { t, i18n } = useT();

  // URL language takes precedence over the active i18n setting (matches the other pages).
  const urlLang = lang || i18n.language.split("-")[0];

  useEffect(() => {
    if (lang && lang !== i18n.language.split("-")[0]) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  // Only English is published for this page; canonical always resolves to en so
  // language-prefixed URLs don't fork into duplicate (English) content.
  const canonical = pageUrl("en");

  const benefits = ["communication", "perspective", "leadership", "engagement"] as const;

  const features = [
    { icon: Users, key: "team" },
    { icon: CalendarClock, key: "formats" },
    { icon: Briefcase, key: "size" },
    { icon: MonitorSmartphone, key: "remote" },
  ] as const;

  // Four FAQ entries, mirrored 1:1 into the FAQPage schema so the visible copy
  // and the structured data never drift.
  const faq = [
    { q: t("officeParty.faq.q1"), a: t("officeParty.faq.a1") },
    { q: t("officeParty.faq.q2"), a: t("officeParty.faq.a2") },
    { q: t("officeParty.faq.q3"), a: t("officeParty.faq.a3") },
    { q: t("officeParty.faq.q4"), a: t("officeParty.faq.a4") },
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
        <html lang="en" />
        <title>{t("officeParty.seo.title")}</title>
        <meta name="description" content={t("officeParty.seo.description")} />
        <link rel="canonical" href={canonical} />
        {LANGS.map((l) => (
          <link key={l} rel="alternate" hrefLang={hreflangCode(l)} href={pageUrl(l)} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={pageUrl("en")} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={t("officeParty.seo.title")} />
        <meta property="og:description" content={t("officeParty.seo.description")} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content="en_US" />
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
              {t("officeParty.hero.h1")}
            </h1>
            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed mb-8">
              {t("officeParty.hero.intro")}
            </p>
            <Button
              asChild
              className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors"
            >
              <Link to="/mystery/create">
                {t("officeParty.hero.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Lead + team-building benefits */}
        <section className="px-4 pb-8">
          <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
            <p className="text-foreground leading-relaxed">{t("officeParty.body.lead")}</p>

            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mt-12 mb-4">
              {t("officeParty.body.benefitsHeading")}
            </h2>
            <p className="text-foreground leading-relaxed">{t("officeParty.body.benefitsLead")}</p>
          </div>

          <div className="max-w-3xl mx-auto mt-8 space-y-6">
            {benefits.map((key) => (
              <div key={key}>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {t(`officeParty.benefits.${key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`officeParty.benefits.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Lunch-hour vs after-work formats */}
        <section className="px-4 pb-8">
          <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mt-4 mb-4">
              {t("officeParty.body.formatsHeading")}
            </h2>
            <p className="text-foreground leading-relaxed">{t("officeParty.body.formatsLead")}</p>

            <h3 className="text-xl font-semibold text-foreground mt-8 mb-2">
              {t("officeParty.body.lunchTitle")}
            </h3>
            <p className="text-foreground leading-relaxed">{t("officeParty.body.lunchBody")}</p>

            <h3 className="text-xl font-semibold text-foreground mt-8 mb-2">
              {t("officeParty.body.afterWorkTitle")}
            </h3>
            <p className="text-foreground leading-relaxed">{t("officeParty.body.afterWorkBody")}</p>

            <p className="text-muted-foreground leading-relaxed mt-6">
              {t("officeParty.body.remoteNote")}
            </p>
          </div>
        </section>

        {/* Guest-count flexibility */}
        <section className="px-4 pb-8">
          <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mt-4 mb-4">
              {t("officeParty.body.guestsHeading")}
            </h2>
            <p className="text-foreground leading-relaxed">{t("officeParty.body.guestsPara1")}</p>
            <p className="text-foreground leading-relaxed">{t("officeParty.body.guestsPara2")}</p>
          </div>
        </section>

        {/* At-a-glance feature cards */}
        <section className="px-4 pb-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, key }) => (
              <Card key={key} className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Icon className="h-6 w-6 text-[#C81400]" />
                    {t(`officeParty.features.${key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t(`officeParty.features.${key}.body`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA into the generator */}
        <section className="px-4 pb-8">
          <div className="max-w-3xl mx-auto text-center">
            <Button
              asChild
              className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors"
            >
              <Link to="/mystery/create">
                {t("officeParty.midCta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            {/* Internal links to the custom-build page and the in-depth corporate guide */}
            <p className="text-muted-foreground mt-6">
              {t("officeParty.related.lead")}{" "}
              <Link to="/custom-murder-mystery-party" className="text-[#C81400] hover:underline font-medium">
                {t("officeParty.related.customLink")}
              </Link>
              {t("officeParty.related.mid")}{" "}
              <Link
                to="/blog/murder-mystery-party-for-corporate-events/"
                className="text-[#C81400] hover:underline font-medium"
              >
                {t("officeParty.related.blogLink")}
              </Link>
              {t("officeParty.related.end")}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-20 bg-[#000000]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mb-8 text-center">
              {t("officeParty.faq.heading")}
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
