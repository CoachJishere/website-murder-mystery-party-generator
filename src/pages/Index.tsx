
import { useRef, useState, useEffect, useCallback } from "react";
import { capture } from "@/lib/posthog";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useSpring,
  useMotionValue,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import Head from "@/components/Head";
import { SkipToContent } from "@/components/SkipToContent";
import TrustpilotBadge from "@/components/TrustpilotBadge";
import { Faq1 } from "@/components/ui/faq1";

gsap.registerPlugin(ScrollTrigger);

const RED = "#C81400";
const BLACK = "#000000";
const CHARCOAL = "#111111";
const CREAM = "#F5F0E8";
const CREAM_70 = "rgba(245,240,232,0.7)";
const CREAM_35 = "rgba(245,240,232,0.35)";
const CREAM_10 = "rgba(245,240,232,0.1)";

// ═══════════════════════════════════════════════════════════════
// LENIS SMOOTH SCROLL
// ═══════════════════════════════════════════════════════════════
function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on("scroll", () => ScrollTrigger.update());
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => lenis.destroy();
  }, [enabled]);
}

// ═══════════════════════════════════════════════════════════════
// HERO — Single screen with parallax image
// ═══════════════════════════════════════════════════════════════
function ParallaxHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Disable parallax/fade for authenticated users — there's nothing to scroll to
  const imageY = useTransform(scrollYProgress, [0, 1], isAuthenticated ? ["0%", "0%"] : ["0%", "30%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], isAuthenticated ? [1, 1] : [1, 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], isAuthenticated ? ["0%", "0%"] : ["0%", "60%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], isAuthenticated ? [1, 1] : [1, 0]);

  return (
    <section ref={ref} className="relative h-[100svh] overflow-hidden" style={{ backgroundColor: RED }}>
      <motion.div
        className="absolute inset-0 bg-cover bg-[center_20%] sm:bg-contain sm:bg-center"
        style={{
          y: imageY,
          scale: imageScale,
          backgroundImage: "url(/images/detective-image.png)",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1 }} />
      <motion.div
        className="absolute inset-0 flex items-end sm:items-center justify-center px-4 sm:px-6 pb-12 sm:pb-0"
        style={{ y: textY, opacity: textOpacity, zIndex: 2 }}
      >
        <Hero />
      </motion.div>
      {!isAuthenticated && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ zIndex: 3 }}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-sm uppercase tracking-widest"
            style={{ color: "rgba(245,240,232,0.5)", fontFamily: "var(--font-body)" }}
          >
            scroll to explore
          </motion.div>
        </div>
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED COUNTERS — stats section
// ═══════════════════════════════════════════════════════════════
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end center"],
  });
  const value = useTransform(scrollYProgress, [0, 1], [0, target]);
  useMotionValueEvent(value, "change", (v) => setDisplay(Math.round(v)));
  return (
    <span ref={ref} className="tabular-nums">
      {display}{suffix}
    </span>
  );
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

function StatsSection() {
  const { t } = useTranslation();
  return (
    <section className="py-20 px-6" style={{ backgroundColor: BLACK }}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8"
      >
        {[
          { value: 1000, suffix: "+", label: t("home.stats.mysteriesCreated") },
          { value: 999, suffix: "+", label: t("home.stats.themesPossible") },
          { value: 5, suffix: ` ${t("home.stats.minutesShort")}`, label: t("home.stats.toGetStarted") },
        ].map((stat, i) => (
          <motion.div key={i} variants={staggerItem} className="text-center">
            <div className="text-3xl sm:text-4xl md:text-6xl" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="mt-2 text-sm uppercase tracking-wider" style={{ color: CREAM_35, fontFamily: "var(--font-body)" }}>
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOW IT WORKS — Horizontal Scroll (desktop) / Stacked (mobile)
// ═══════════════════════════════════════════════════════════════
function HorizontalHowItWorks() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // GSAP-driven horizontal scroll with pin — works correctly with Lenis
  useEffect(() => {
    if (isMobile || !sectionRef.current || !trackRef.current) return;

    const track = trackRef.current;
    const scrollAmount = track.scrollWidth - window.innerWidth + 48;

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: -scrollAmount,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${scrollAmount}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobile]);

  const steps = [
    { number: 1, title: t("howItWorks.step1.title"), desc: t("howItWorks.step1.description"), accent: RED },
    { number: 2, title: t("howItWorks.step2.title"), desc: t("howItWorks.step2.description"), accent: "#E74C3C" },
    { number: 3, title: t("howItWorks.step3.title"), desc: t("howItWorks.step3.description"), accent: "#A01000" },
    { number: 4, title: t("howItWorks.step4.title"), desc: t("howItWorks.step4.description"), accent: "#D4380D" },
  ];

  const StepCard = ({ step, i }: { step: typeof steps[0]; i: number }) => (
    <div
      className={isMobile
        ? "rounded-2xl flex flex-col items-center justify-center p-8"
        : "min-w-[30vw] h-[50vh] rounded-2xl flex flex-col items-center justify-center p-8 shrink-0"
      }
      style={{ backgroundColor: BLACK, border: `1px solid ${CREAM_10}` }}
    >
      <div
        className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-5 text-2xl md:text-3xl"
        style={{ backgroundColor: step.accent, color: CREAM, fontFamily: "var(--font-display)" }}
      >
        {step.number}
      </div>
      <h3 className="text-xl md:text-3xl mb-3 text-center" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
        {step.title}
      </h3>
      <p className="text-base md:text-lg text-center max-w-md" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
        {step.desc}
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <section className="py-16 px-4" style={{ backgroundColor: CHARCOAL }}>
        <h2 className="text-2xl sm:text-3xl text-center mb-4" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
          HOW IT WORKS
        </h2>
        <p className="text-base text-center mb-10" style={{ color: CREAM_70 }}>
          Four simple steps to your perfect murder mystery
        </p>
        <div className="relative max-w-sm mx-auto">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-5 relative"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                {/* Number circle */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl shrink-0 relative z-10"
                  style={{ backgroundColor: step.accent, color: CREAM, fontFamily: "var(--font-display)" }}
                >
                  {step.number}
                </div>
                {/* Content */}
                <div className="pt-2">
                  <h3 className="text-lg mb-1" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="overflow-hidden" style={{ backgroundColor: CHARCOAL }}>
      <div className="h-screen flex flex-col justify-center">
        <div className="px-6 mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-5xl text-center mb-4" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
            HOW IT WORKS
          </h2>
          <p className="text-lg text-center" style={{ color: CREAM_70 }}>
            Four simple steps to your perfect murder mystery
          </p>
        </div>
        <div ref={trackRef} className="flex gap-8 px-6 will-change-transform">
          {steps.map((step, i) => <StepCard key={i} step={step} i={i} />)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES — Staggered Zigzag Scroll Reveal
// ═══════════════════════════════════════════════════════════════
function FeaturesStaggered() {
  const { t } = useTranslation();
  const features = [
    {
      title: t("features.step1.title"),
      desc: t("features.step1.content"),
      image: "/images/custom_themes.png",
    },
    {
      title: t("features.step2.title"),
      desc: t("features.step2.content"),
      image: "/images/character_profiles.png",
    },
    {
      title: t("features.step3.title"),
      desc: t("features.step3.content"),
      image: "/images/host_guide.png",
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: BLACK }}>
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl md:text-5xl text-center mb-10 sm:mb-16"
          style={{ color: CREAM, fontFamily: "var(--font-display)" }}
        >
          EVERYTHING YOU NEED INCLUDED
        </motion.h2>
        <div className="space-y-12 sm:space-y-24">
          {features.map((feature, i) => (
            <div key={i} className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-6 sm:gap-12 items-center`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="md:w-1/2"
              >
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="rounded-2xl w-full h-48 sm:h-64 md:h-80 object-cover"
                  style={{ border: `1px solid ${CREAM_10}` }}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: i % 2 === 1 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                className="md:w-1/2 text-center md:text-left"
              >
                <h3 className="text-xl sm:text-2xl md:text-4xl mb-3 sm:mb-4" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
                  {feature.title}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
                  {feature.desc}
                </p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// TESTIMONIALS — 3D Tilt Cards
// ═══════════════════════════════════════════════════════════════
function TiltTestimonialCard({ text, author, initial: initChar, stars }: { text: string; author: string; initial: string; stars: number }) {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [x, y]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="rounded-xl cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="rounded-xl p-5 sm:p-6 h-full" style={{ backgroundColor: CHARCOAL, border: `1px solid ${CREAM_10}` }}>
        <div className="flex items-center space-x-1 mb-4">
          {Array.from({ length: 5 }, (_, star) => (
            <svg key={star} className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: star < stars ? RED : CREAM_35 }} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="mb-4 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>{text}</p>
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: RED }}>
            <span className="text-xs font-semibold" style={{ color: CREAM }}>{initChar}</span>
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: CREAM, fontFamily: "var(--font-body)" }}>{author}</p>
            <p className="text-xs mt-0.5" style={{ color: CREAM_35, fontFamily: "var(--font-body)" }}>
              <span style={{ color: '#1da66f' }}>★</span> {t("home.verifiedTrustpilotReview")}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialsParallax() {
  const { t } = useTranslation();
  const testimonials = [
    {
      text: t("home.parallaxTestimonials.sophia.text"),
      author: t("home.parallaxTestimonials.sophia.author"),
      initial: "S",
      stars: 5,
    },
    {
      text: t("home.parallaxTestimonials.will.text"),
      author: t("home.parallaxTestimonials.will.author"),
      initial: "W",
      stars: 5,
    },
    {
      text: t("home.parallaxTestimonials.jed.text"),
      author: t("home.parallaxTestimonials.jed.author"),
      initial: "J",
      stars: 5,
    },
  ];

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: BLACK }}>
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl md:text-5xl text-center mb-8 sm:mb-12"
          style={{ color: CREAM, fontFamily: "var(--font-display)" }}
        >
          WHAT OTHERS ARE SAYING
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6" style={{ perspective: "1000px" }}>
          {testimonials.map((t, i) => <TiltTestimonialCard key={i} {...t} />)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPORT CTA — red section with scroll entrance
// ═══════════════════════════════════════════════════════════════
function SupportCTA() {
  const { t } = useTranslation();
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6" style={{ backgroundColor: RED }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-2xl sm:text-3xl md:text-5xl mb-4" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
          {t("support.title")}
        </h2>
        <p className="mb-8 text-base sm:text-lg" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          {t("support.description")}
        </p>
        <Link to="/support" className="btn-on-red no-underline inline-flex">
          {t("support.button")}
        </Link>
        <p className="mt-6 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          Build a{" "}
          <Link to="/" className="underline" style={{ color: CREAM }}>
            custom murder mystery party
          </Link>{" "}
          tailored to your theme and guest list.
        </p>
        <p className="mt-2 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          Prefer to start free?{" "}
          <Link to="/blog/free-murder-mystery-games-printable" className="underline" style={{ color: CREAM }}>
            Browse our free murder mystery templates
          </Link>
          .
        </p>
        <p className="mt-2 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          Planning something for the office?{" "}
          <Link to="/blog/murder-mystery-party-for-corporate-events" className="underline" style={{ color: CREAM }}>
            See our corporate murder mystery party guide
          </Link>
          .
        </p>
        <p className="mt-2 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          Writing your own from scratch?{" "}
          <Link to="/blog/murder-mystery-party-script-template-guide" className="underline" style={{ color: CREAM }}>
            Use our murder mystery template guide
          </Link>
          .
        </p>
        <p className="mt-2 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          Need help casting the cast?{" "}
          <Link to="/blog/murder-mystery-party-character-ideas" className="underline" style={{ color: CREAM }}>
            Explore murder mystery party character ideas
          </Link>
          .
        </p>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// YOUTUBE VIDEO WITH PLAY TRACKING
// ═══════════════════════════════════════════════════════════════
const YouTubeTracked = () => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // YouTube sends info=1 when playback starts
        if (data?.event === 'onStateChange' && data?.info === 1 && !hasTracked.current) {
          hasTracked.current = true;
          capture('homepage_video_played', { video_id: 'IFZdtPfUtPo' });
        }
      } catch {
        // non-JSON messages from other sources
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className="absolute top-0 left-0 w-full h-full rounded-lg"
      src="https://www.youtube.com/embed/IFZdtPfUtPo?enablejsapi=1"
      title={t("home.watchDemo")}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN INDEX PAGE
// ═══════════════════════════════════════════════════════════════
const Index = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  // Only enable smooth scroll for non-authenticated (marketing) page
  useSmoothScroll(!isAuthenticated);

  return (
    <div
      className={`min-h-screen flex flex-col ${isAuthenticated ? "h-screen overflow-hidden" : ""}`}
      style={{ backgroundColor: BLACK }}
    >
      <Head
        title={t("home.seo.title")}
        description={t("home.seo.description")}
      />
      <SkipToContent />
      <Header />

      <main id="main-content" className="flex-1 w-full overflow-x-hidden">
        <ParallaxHero isAuthenticated={isAuthenticated} />

        {!isAuthenticated && (
          <>
            {/* Trustpilot */}
            <div
              className="py-5 px-4 text-center"
              style={{ backgroundColor: BLACK, borderTop: `1px solid ${CREAM_10}`, borderBottom: `1px solid ${CREAM_10}` }}
            >
              <TrustpilotBadge />
            </div>

            <StatsSection />

            {/* Video Demo */}
            <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: CHARCOAL }}>
              <div className="w-full max-w-7xl mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-5xl text-center mb-8 sm:mb-12" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
                  {t('videoDemo.title')}
                </h2>
                <div className="max-w-4xl mx-auto">
                  <div className="relative pb-[56.25%] h-0">
                    <YouTubeTracked />
                  </div>
                </div>
              </div>
            </section>

            <HorizontalHowItWorks />
            <FeaturesStaggered />
            <TestimonialsParallax />

            {/* FAQ */}
            <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: CHARCOAL }}>
              <div className="w-full max-w-7xl mx-auto">
                <Faq1 />
              </div>
            </section>

            <SupportCTA />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
