import { useRef, useState, useEffect, useCallback } from "react";
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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
// LENIS SMOOTH SCROLL — buttery scrolling across the whole page
// ═══════════════════════════════════════════════════════════════
function useSmoothScroll() {
  useEffect(() => {
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
  }, []);
}

// ═══════════════════════════════════════════════════════════════
// HERO — Single screen with parallax image
// Image moves slower than text as you scroll, creating depth
// ═══════════════════════════════════════════════════════════════
function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Image moves up slowly (parallax depth)
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  // Text moves up faster (foreground)
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100vh] overflow-hidden" style={{ backgroundColor: RED }}>
      {/* Detective image — parallax layer (moves slow) */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: imageY,
          scale: imageScale,
          backgroundImage: "url(/images/detective-image.png)",
          backgroundSize: "contain",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1 }}
      />

      {/* Text — foreground layer (moves fast, fades out) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center px-4 sm:px-6"
        style={{ y: textY, opacity: textOpacity, zIndex: 2 }}
      >
        <div className="max-w-3xl text-center">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[60px] mb-3 sm:mb-4 leading-tight"
            style={{ color: CREAM, fontFamily: "var(--font-display)" }}
          >
            CREATE MURDER MYSTERY PARTIES IN MINUTES
          </h1>
          <p
            className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto"
            style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}
          >
            Design custom mysteries exactly how you want them — any theme, any characters, any setting.
          </p>
          <div
            className="max-w-2xl mx-auto rounded-2xl p-4"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 4px 30px rgba(0,0,0,0.2)",
            }}
          >
            <p
              className="text-left text-[15px]"
              style={{ color: "rgba(0,0,0,0.4)", fontFamily: "var(--font-body)" }}
            >
              Create a mystery set in a 1920s speakeasy...
            </p>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
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
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED COUNTERS (Technique 2) — social proof section
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
      {display}
      {suffix}
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
          { value: 500, suffix: "+", label: "Mysteries Created" },
          { value: 999, suffix: "+", label: "Themes Possible" },
          { value: 5, suffix: " min", label: "To Get Started" },
        ].map((stat, i) => (
          <motion.div key={i} variants={staggerItem} className="text-center">
            <div
              className="text-3xl sm:text-4xl md:text-6xl"
              style={{ color: CREAM, fontFamily: "var(--font-display)" }}
            >
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <div
              className="mt-2 text-sm uppercase tracking-wider"
              style={{ color: CREAM_35, fontFamily: "var(--font-body)" }}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOW IT WORKS — Horizontal Scroll (Technique 3)
// ═══════════════════════════════════════════════════════════════
function HorizontalHowItWorks() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [xEnd, setXEnd] = useState(0);

  useEffect(() => {
    const measure = () => {
      setIsMobile(window.innerWidth < 768);
      if (trackRef.current) {
        const trackWidth = trackRef.current.scrollWidth;
        const viewportWidth = window.innerWidth;
        setXEnd(-(trackWidth - viewportWidth + 48));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  // Pixel-based: scrolls exactly far enough to show the last card
  const x = useTransform(scrollYProgress, [0, 1], [0, xEnd]);

  const steps = [
    { number: 1, title: t("howItWorks.step1.title"), desc: t("howItWorks.step1.description"), accent: RED },
    { number: 2, title: t("howItWorks.step2.title"), desc: t("howItWorks.step2.description"), accent: "#E74C3C" },
    { number: 3, title: t("howItWorks.step3.title"), desc: t("howItWorks.step3.description"), accent: "#A01000" },
    { number: 4, title: t("howItWorks.step4.title"), desc: t("howItWorks.step4.description"), accent: "#D4380D" },
  ];

  const StepCard = ({ step, i }: { step: typeof steps[0]; i: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: i * 0.1 }}
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
      <h3
        className="text-xl md:text-3xl mb-3 text-center"
        style={{ color: CREAM, fontFamily: "var(--font-display)" }}
      >
        {step.title}
      </h3>
      <p
        className="text-base md:text-lg text-center max-w-md"
        style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}
      >
        {step.desc}
      </p>
    </motion.div>
  );

  // Mobile: stacked cards with scroll reveal
  if (isMobile) {
    return (
      <section className="py-16 px-4" style={{ backgroundColor: CHARCOAL }}>
        <h2
          className="text-3xl text-center mb-4"
          style={{ color: CREAM, fontFamily: "var(--font-display)" }}
        >
          HOW IT WORKS
        </h2>
        <p className="text-base text-center mb-8" style={{ color: CREAM_70 }}>
          Four simple steps to your perfect murder mystery
        </p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} i={i} />
          ))}
        </div>
      </section>
    );
  }

  // Desktop: horizontal scroll
  return (
    <section ref={containerRef} className="h-[300vh] relative" style={{ backgroundColor: CHARCOAL }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        <div className="px-6 mb-8">
          <h2
            className="text-3xl md:text-5xl text-center mb-4"
            style={{ color: CREAM, fontFamily: "var(--font-display)" }}
          >
            HOW IT WORKS
          </h2>
          <p className="text-lg text-center" style={{ color: CREAM_70 }}>
            Four simple steps to your perfect murder mystery
          </p>
        </div>
        <motion.div ref={trackRef} style={{ x }} className="flex gap-8 px-6">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} i={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEATURES — Staggered Scroll Reveal (Technique 2)
// Zigzag layout with images on alternating sides
// ═══════════════════════════════════════════════════════════════
function FeaturesStaggered() {
  const { t } = useTranslation();
  const features = [
    {
      title: t("features.step1.title"),
      desc: t("features.step1.content"),
      image: "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true",
    },
    {
      title: t("features.step2.title"),
      desc: t("features.step2.content"),
      image: "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/character_profiles.png?raw=true",
    },
    {
      title: t("features.step3.title"),
      desc: t("features.step3.content"),
      image: "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/host_guide.png?raw=true",
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
            <div
              key={i}
              className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-6 sm:gap-12 items-center`}
            >
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
                className="md:w-1/2"
              >
                <h3
                  className="text-xl sm:text-2xl md:text-4xl mb-3 sm:mb-4"
                  style={{ color: CREAM, fontFamily: "var(--font-display)" }}
                >
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
// TESTIMONIALS — 3D Tilt Cards (Technique 6)
// ═══════════════════════════════════════════════════════════════
function TiltTestimonialCard({
  text,
  author,
  initial: initChar,
  stars,
}: {
  text: string;
  author: string;
  initial: string;
  stars: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [x, y]
  );

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="rounded-xl p-5 sm:p-6 cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="rounded-xl p-5 sm:p-6 h-full"
        style={{ backgroundColor: CHARCOAL, border: `1px solid ${CREAM_10}` }}
      >
        <div className="flex items-center space-x-1 mb-4">
          {Array.from({ length: 5 }, (_, star) => (
            <svg
              key={star}
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: star < stars ? RED : CREAM_35 }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="mb-4 text-sm sm:text-base" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          {text}
        </p>
        <div className="flex items-center">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mr-3"
            style={{ backgroundColor: RED }}
          >
            <span className="text-xs font-semibold" style={{ color: CREAM }}>
              {initChar}
            </span>
          </div>
          <p className="font-semibold text-sm" style={{ color: CREAM, fontFamily: "var(--font-body)" }}>
            {author}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialsParallax() {
  const { t } = useTranslation();
  const testimonials = [1, 2, 3].map((i) => ({
    text: t(`testimonials.testimonial${i}.text`),
    author: t(`testimonials.testimonial${i}.author`),
    initial: ["J", "LB", "A"][i - 1],
    stars: 5,
  }));

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: BLACK }}>
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl md:text-4xl text-center mb-8 sm:mb-12"
          style={{ color: CREAM, fontFamily: "var(--font-display)" }}
        >
          WHAT OTHERS ARE SAYING
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6" style={{ perspective: "1000px" }}>
          {testimonials.map((t, i) => (
            <TiltTestimonialCard key={i} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FAQ — with staggered scroll reveal on heading
// ═══════════════════════════════════════════════════════════════
function FAQSection() {
  return (
    <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: CHARCOAL }}>
      <div className="w-full max-w-7xl mx-auto">
        <Faq1 />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPORT CTA — on red, with scroll-triggered entrance
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
        <h2 className="text-2xl md:text-4xl mb-4" style={{ color: CREAM, fontFamily: "var(--font-display)" }}>
          {t("support.title")}
        </h2>
        <p className="mb-8 text-base sm:text-lg" style={{ color: CREAM_70, fontFamily: "var(--font-body)" }}>
          {t("support.description")}
        </p>
        <Link to="/support" className="btn-on-red no-underline inline-flex">
          {t("support.button")}
        </Link>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function HomeParallaxPreview() {
  useSmoothScroll();

  return (
    <div style={{ backgroundColor: BLACK }}>
      <Header />

      {/* Floating comparison link */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <Link
          to="/"
          className="px-4 py-2 rounded-full shadow-lg text-sm font-medium no-underline"
          style={{ backgroundColor: CREAM, color: BLACK }}
        >
          View Current Site &rarr;
        </Link>
      </div>

      <ParallaxHero />

      {/* Trustpilot */}
      <div
        className="py-5 px-4 text-center"
        style={{ backgroundColor: BLACK, borderTop: `1px solid ${CREAM_10}`, borderBottom: `1px solid ${CREAM_10}` }}
      >
        <TrustpilotBadge />
      </div>

      <StatsSection />
      <HorizontalHowItWorks />
      <FeaturesStaggered />
      <TestimonialsParallax />
      <FAQSection />
      <SupportCTA />
      <Footer />
    </div>
  );
}
