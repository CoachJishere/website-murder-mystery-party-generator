
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import Head from "@/components/Head";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FeatureSteps } from "@/components/ui/feature-steps";
import { Faq1 } from "@/components/ui/faq1";
import { HowItWorks } from "@/components/ui/how-it-works";
import { useTranslation } from 'react-i18next';
import { SkipToContent } from "@/components/SkipToContent";
import TestimonialsSection from "@/components/TestimonialsSection";
import TrustpilotBadge from "@/components/TrustpilotBadge";

const BLACK = '#000000';
const CHARCOAL = '#111111';
const RED = '#C81400';
const CREAM = '#F5F0E8';
const CREAM_70 = 'rgba(245,240,232,0.7)';
const CREAM_75 = 'rgba(245,240,232,0.75)';
const CREAM_10 = 'rgba(245,240,232,0.1)';

const DarkHomePreview = () => {
  const { t } = useTranslation();

  const features = [
    {
      step: t('features.step1.step'),
      title: t('features.step1.title'),
      content: t('features.step1.content'),
      image: 'https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true'
    },
    {
      step: t('features.step2.step'),
      title: t('features.step2.title'),
      content: t('features.step2.content'),
      image: 'https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/character_profiles.png?raw=true'
    },
    {
      step: t('features.step3.step'),
      title: t('features.step3.title'),
      content: t('features.step3.content'),
      image: 'https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/host_guide.png?raw=true'
    },
  ];

  const howItWorksSteps = [
    { number: 1, title: t('howItWorks.step1.title'), description: t('howItWorks.step1.description') },
    { number: 2, title: t('howItWorks.step2.title'), description: t('howItWorks.step2.description') },
    { number: 3, title: t('howItWorks.step3.title'), description: t('howItWorks.step3.description') },
    { number: 4, title: t('howItWorks.step4.title'), description: t('howItWorks.step4.description') },
  ];

  return (
    <div className="dark-preview min-h-screen flex flex-col font-inter" style={{ backgroundColor: BLACK }}>
      <Head
        title="Dark Theme Preview - Mystery Maker"
        description="Preview of the dark theme redesign."
      />
      <SkipToContent />

      {/* Floating link back */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <Link
          to="/"
          className="px-4 py-2 rounded-full shadow-lg text-sm font-medium no-underline"
          style={{ backgroundColor: CREAM, color: BLACK }}
        >
          View Current Site &rarr;
        </Link>
      </div>

      {/* ── Navigation ── bg: RED */}
      <Header />

      <main id="main-content" className="flex-1 w-full overflow-x-hidden" style={{ backgroundColor: BLACK }}>

        {/* ── Hero ── centered bg image with overlay */}
        <div
          className="dp-hero-bg"
          style={{
            backgroundColor: RED,
            backgroundImage: 'url(/images/detective-image.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 0,
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Hero />
          </div>
        </div>

        {/* ── Trustpilot Bar ── bg: BLACK */}
        <div
          className="py-5 px-2 sm:px-4 text-center"
          style={{ backgroundColor: BLACK, borderTop: `1px solid ${CREAM_10}`, borderBottom: `1px solid ${CREAM_10}` }}
        >
          <TrustpilotBadge />
        </div>

        {/* ── Watch a Demo ── bg: BLACK */}
        <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: BLACK }}>
          <div className="w-full max-w-7xl mx-auto">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 font-display"
              style={{ color: CREAM }}
            >
              {t('videoDemo.title')}
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src="https://www.youtube.com/embed/8WInnaFHMY0"
                  title="Watch a Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── bg: BLACK */}
        <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: BLACK }}>
          <div className="w-full max-w-7xl mx-auto">
            <HowItWorks steps={howItWorksSteps} />
          </div>
        </section>

        {/* ── Everything You Need Included ── bg: BLACK */}
        <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: BLACK }}>
          <div className="w-full max-w-7xl mx-auto">
            <FeatureSteps
              features={features}
              title={t('features.title')}
              autoPlayInterval={4000}
              imageHeight="h-[300px] sm:h-[400px] lg:h-[500px]"
            />
          </div>
        </section>

        {/* ── Testimonials ── bg: BLACK */}
        <div style={{ backgroundColor: BLACK }}>
          <TestimonialsSection />
        </div>

        {/* ── FAQ ── bg: BLACK */}
        <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: BLACK }}>
          <div className="w-full max-w-7xl mx-auto">
            <Faq1 />
          </div>
        </section>

        {/* ── Support CTA ── bg: RED, full vivid, no overlay */}
        <section className="py-12 sm:py-16 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: RED }}>
          <div className="w-full max-w-7xl mx-auto text-center">
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 font-display"
              style={{ color: CREAM }}
            >
              {t('support.title')}
            </h2>
            <p className="mb-6 max-w-2xl mx-auto text-sm sm:text-base font-inter" style={{ color: CREAM_75 }}>
              {t('support.description')}
            </p>
            <Link to="/support" className="btn-on-red no-underline inline-flex">
              {t('support.button')}
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── bg: BLACK */}
      <Footer />
    </div>
  );
};

export default DarkHomePreview;
