import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";

const SAME_AS = [
  "https://www.linkedin.com/in/millerdjonathan/",
  "https://www.youtube.com/@MysteryMakerParty",
];

const PHOTO_URL = "https://www.mysterymaker.party/images/MMbiopic.png";

export default function About() {
  const { t } = useTranslation();
  const BIO = t("about.bio");
  const { lang } = useParams<{ lang?: string }>();
  const canonical = `https://www.mysterymaker.party${lang ? `/${lang}` : ""}/about`;

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Jonathan Miller",
    jobTitle: "Founder",
    worksFor: {
      "@type": "Organization",
      name: "Mystery Maker",
      url: "https://www.mysterymaker.party",
    },
    url: "https://www.mysterymaker.party/about",
    image: PHOTO_URL,
    description: BIO,
    sameAs: SAME_AS,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Helmet>
        <title>{t("about.title")}</title>
        <meta
          name="description"
          content={t("about.metaDescription")}
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={t("about.title")} />
        <meta
          property="og:description"
          content={t("about.ogDescription")}
        />
        <meta property="og:image" content={PHOTO_URL} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={PHOTO_URL} />
        <meta name="author" content="Jonathan Miller" />
        <script type="application/ld+json">{JSON.stringify(personJsonLd)}</script>
      </Helmet>

      <Header />

      <main className="flex-grow py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12">
            <img
              src="/images/MMbiopic.png"
              alt={t("about.photoAlt")}
              className="w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-2 border-[#C81400]"
              loading="eager"
            />
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-[#C81400] mb-2">
                Jonathan Miller
              </h1>
              <p className="text-muted-foreground text-lg">
                {t("about.role")}
              </p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-foreground leading-relaxed">{BIO}</p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-[#C81400] mb-4">{t("about.connect")}</h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/millerdjonathan/"
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="text-[#C81400] hover:underline"
                >
                  LinkedIn — linkedin.com/in/millerdjonathan
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/@MysteryMakerParty"
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="text-[#C81400] hover:underline"
                >
                  YouTube — @MysteryMakerParty
                </a>
              </li>
              <li>
                <a
                  href="https://www.narrativaimprovfest.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C81400] hover:underline"
                >
                  Narrativa Improv Festival
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
