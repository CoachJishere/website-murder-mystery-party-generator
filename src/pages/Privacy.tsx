import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Head from "@/components/Head";
import { openConsentSettings } from "@/lib/consent";
import { useTranslation } from "react-i18next";

const Privacy = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      <Head 
        title={t("privacy.title")} 
        description={t("privacy.metaDescription")}
        canonical="https://www.mysterymaker.party/privacy"
      />
      <Header />
      
      <main className="flex-1 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-center">{t("privacy.title")}</h1>
          
          <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
            <p><em>{t("privacy.lastUpdated")}</em></p>
            
            <h2>{t("privacy.s1.title")}</h2>
            <p>{t("privacy.s1.body")}</p>
            
            <h2>{t("privacy.s2.title")}</h2>
            <p>{t("privacy.s2.body")}</p>
            <ul>
              {[1, 2, 3, 4, 5].map((n) => <li key={n}>{t(`privacy.s2.i${n}`)}</li>)}
            </ul>
            
            <h2>{t("privacy.s3.title")}</h2>
            <p>{t("privacy.s3.body")}</p>
            <ul>
              {[1, 2, 3].map((n) => <li key={n}>{t(`privacy.s3.i${n}`)}</li>)}
            </ul>
            
            <h2>{t("privacy.s4.title")}</h2>
            <p>{t("privacy.s4.body")}</p>

            <h2>{t("privacy.s5.title")}</h2>
            <p>{t("privacy.s5.body")}</p>

            <h2>{t("privacy.s6.title")}</h2>
            <p>{t("privacy.s6.body")}</p>
            <ul>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <li key={n}>{t(`privacy.s6.i${n}`)}</li>)}
            </ul>
            
            <h2>{t("privacy.s7.title")}</h2>
            <p>{t("privacy.s7.body1")}</p>
            <p>
              {t("privacy.s7.body2Lead")}{" "}
              <button
                type="button"
                onClick={openConsentSettings}
                style={{ background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer", font: "inherit", color: "inherit" }}
              >
                {t("privacy.s7.cookieSettings")}
              </button>
              {t("privacy.s7.body2Tail")}
            </p>

            <h2>{t("privacy.s8.title")}</h2>
            <p>{t("privacy.s8.body")}</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;
