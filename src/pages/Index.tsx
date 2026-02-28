
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import Head from "@/components/Head";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FeatureSteps } from "@/components/ui/feature-steps";
import { Faq1 } from "@/components/ui/faq1";
import { HowItWorks } from "@/components/ui/how-it-works";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from 'react-i18next';
import { SkipToContent } from "@/components/SkipToContent";
import TestimonialsSection from "@/components/TestimonialsSection";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  
  // Feature Steps data
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

  // How It Works steps
  const howItWorksSteps = [
    {
      number: 1,
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.description')
    },
    {
      number: 2,
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.description')
    },
    {
      number: 3,
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.description')
    },
    {
      number: 4,
      title: t('howItWorks.step4.title'),
      description: t('howItWorks.step4.description')
    }
  ];

  return (
    <div className="min-h-screen flex flex-col font-inter">
      <Head
        title="Create Custom Murder Mystery Parties"
        description="Generate unique murder mystery party scenarios with our AI-powered tool. Customize themes, characters, and plots for unforgettable events."
      />
      <SkipToContent />
      <Header />

      <main id="main-content" className="flex-1 w-full overflow-x-hidden">
        {/* Hero section is shown for all users */}
        <div className="bg-card">
          <Hero />
        </div>

        {/* Video Demo Section - Only for non-authenticated users */}
        {!isAuthenticated && (
          <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="w-full max-w-7xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-black font-playfair">
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
        )}

        {!isAuthenticated && (
          <>
            {/* How It Works Section */}
            <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <HowItWorks steps={howItWorksSteps} />
              </div>
            </section>
            
            {/* Feature Steps Component */}
            <section className="py-6 sm:py-8 bg-card px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <FeatureSteps 
                  features={features}
                  title={t('features.title')}
                  autoPlayInterval={4000}
                  imageHeight="h-[300px] sm:h-[400px] lg:h-[500px]"
                />
              </div>
            </section>
            
            {/* Testimonials */}
            <TestimonialsSection />
            
            {/* FAQ Section */}
            <section className="py-6 sm:py-8 bg-card px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <Faq1 />
              </div>
            </section>
            
            {/* Support Link Section */}
            <section className="py-8 sm:py-12 px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-black font-playfair">
                  {t('support.title')}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-sm sm:text-base font-inter">
                  {t('support.description')}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-[#8B1538] hover:bg-[#6B0F28] text-white h-12 px-6 text-base font-inter"
                >
                  <Link to="/support" className="no-underline">
                    {t('support.button')}
                  </Link>
                </Button>
              </div>
            </section>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
