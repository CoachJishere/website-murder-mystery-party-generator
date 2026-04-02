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

gsap.registerPlugin(ScrollTrigger);

// ═══════════════════════════════════════════════════════════════════════════
// SMOOTH SCROLLING (Lenis) — wraps the whole page
// This is the "buttery" feel that separates amateur from pro scroll sites.
// ═══════════════════════════════════════════════════════════════════════════
function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Connect Lenis to GSAP ScrollTrigger — this is the critical part
    lenis.on("scroll", () => {
      ScrollTrigger.update();
    });

    // Use requestAnimationFrame instead of gsap.ticker for more reliable sync
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Give ScrollTrigger a moment to measure after Lenis takes over
    setTimeout(() => ScrollTrigger.refresh(), 100);

    return () => {
      lenis.destroy();
    };
  }, []);
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 1: Multi-Layer Parallax Hero (easy — framer-motion)
// ═══════════════════════════════════════════════════════════════════════════
function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const layer1Y = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const layer2Y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const layer3Y = useTransform(scrollYProgress, [0, 1], ["0%", "70%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  return (
    <section ref={ref} className="relative h-[150vh] overflow-hidden">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-900 to-orange-400" />
        <motion.div style={{ y: layer1Y }} className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                top: `${Math.random() * 60}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
            />
          ))}
          <div className="absolute top-[15%] right-[20%] w-20 h-20 rounded-full bg-yellow-100 shadow-[0_0_60px_20px_rgba(255,255,200,0.3)]" />
        </motion.div>
        <motion.div style={{ y: layer2Y }} className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 400" className="w-full" preserveAspectRatio="none">
            <path d="M0,400 L0,280 Q180,120 360,220 Q540,100 720,200 Q900,80 1080,180 Q1260,100 1440,240 L1440,400 Z" fill="#1e1b4b" />
          </svg>
        </motion.div>
        <motion.div style={{ y: layer3Y, scale }} className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 300" className="w-full" preserveAspectRatio="none">
            <path d="M0,300 L0,200 Q120,80 240,180 Q360,60 480,160 Q600,40 720,150 Q840,50 960,140 Q1080,30 1200,130 Q1320,70 1440,180 L1440,300 Z" fill="#0f0a2a" />
          </svg>
        </motion.div>
        <motion.div style={{ y: layer3Y, scale }} className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 200" className="w-full" preserveAspectRatio="none">
            <path d="M0,200 L0,140 Q60,100 120,130 Q180,90 240,120 Q300,70 360,110 Q420,80 480,100 Q540,60 600,90 Q660,70 720,100 Q780,50 840,80 Q900,60 960,90 Q1020,40 1080,70 Q1140,50 1200,80 Q1260,30 1320,60 Q1380,40 1440,70 L1440,200 Z" fill="#050211" />
          </svg>
        </motion.div>
        <motion.div
          style={{ y: textY, opacity }}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="text-center px-6">
            <h1 className="text-5xl md:text-8xl font-bold text-white mb-6 drop-shadow-2xl">
              Parallax Demo
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto drop-shadow-lg">
              Every technique from easy to medium — scroll to explore them all
            </p>
            <div className="mt-12 animate-bounce text-white/60 text-sm tracking-widest uppercase">
              scroll to explore
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 2: Scroll Reveal with stagger + counters (easy — framer-motion)
// ═══════════════════════════════════════════════════════════════════════════

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

function ScrollRevealSection() {
  return (
    <section className="bg-slate-950 overflow-hidden">
      {/* Line-by-line text reveal */}
      <div className="py-32 px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-5xl mx-auto"
        >
          {["Award-winning sites", "aren't magic.", "They're just scroll", "animations done well."].map((line, i) => (
            <motion.div key={i} variants={staggerItem} className="overflow-hidden">
              <h2 className={`text-4xl md:text-7xl font-bold leading-tight ${i === 1 ? "text-purple-400" : "text-white"}`}>
                {line}
              </h2>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Animated counters */}
      <div className="py-24 px-6 bg-gradient-to-b from-slate-950 to-indigo-950">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: 200, suffix: "+", label: "Lines of code" },
            { value: 0, suffix: "", label: "Extra dependencies" },
            { value: 8, suffix: "", label: "Techniques" },
            { value: 60, suffix: "fps", label: "Smooth animations" },
          ].map((stat, i) => (
            <motion.div key={i} variants={staggerItem} className="text-center">
              <div className="text-4xl md:text-6xl font-bold text-white">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-white/50 mt-2 text-sm uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Zigzag split screen */}
      <div className="max-w-6xl mx-auto px-6 py-24 space-y-24">
        {[
          {
            title: "Design First, Code Second",
            desc: "The parallax is easy. The hard part is knowing what to animate and when. Less is more — one well-timed fade beats ten spinning elements.",
            img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
            reverse: false,
          },
          {
            title: "Scroll Rhythm Matters",
            desc: "Good scroll sites have a rhythm — reveal, pause, reveal. Each section earns the scroll.",
            img: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
            reverse: true,
          },
          {
            title: "Mobile Changes Everything",
            desc: "Most parallax effects need to be toned down or disabled on mobile. Simpler fade-ins work best on smaller screens.",
            img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
            reverse: false,
          },
        ].map((item, i) => (
          <div key={i} className={`flex flex-col ${item.reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-12 items-center`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="md:w-1/2"
            >
              <img src={item.img} alt="" className="rounded-2xl w-full h-64 md:h-80 object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: item.reverse ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
              className="md:w-1/2"
            >
              <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">{item.title}</h3>
              <p className="text-white/60 text-lg leading-relaxed">{item.desc}</p>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 3: Horizontal Scroll (easy — framer-motion)
// ═══════════════════════════════════════════════════════════════════════════
function HorizontalScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);

  return (
    <section ref={containerRef} className="h-[300vh] relative">
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        <div className="px-6 mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white text-center">Horizontal Scroll</h2>
          <p className="text-white/60 text-lg text-center mt-4">Vertical scrolling drives horizontal movement</p>
        </div>
        <motion.div style={{ x }} className="flex gap-8 px-6">
          {[
            { title: "Step 1: Pick a Theme", bg: "bg-gradient-to-br from-rose-500 to-pink-600" },
            { title: "Step 2: Chat with AI", bg: "bg-gradient-to-br from-violet-500 to-purple-600" },
            { title: "Step 3: Get Characters", bg: "bg-gradient-to-br from-blue-500 to-indigo-600" },
            { title: "Step 4: Host the Party", bg: "bg-gradient-to-br from-emerald-500 to-teal-600" },
          ].map((card, i) => (
            <div key={i} className={`${card.bg} min-w-[80vw] md:min-w-[40vw] h-[50vh] rounded-2xl flex items-center justify-center p-10 shrink-0`}>
              <h3 className="text-3xl md:text-4xl font-bold text-white">{card.title}</h3>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 4: SVG Path Drawing on Scroll (easy — framer-motion)
// A line that draws itself as you scroll. Apple uses this constantly.
// ═══════════════════════════════════════════════════════════════════════════
function SVGDrawSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end center"],
  });
  const pathLength = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <section ref={ref} className="py-32 px-6 bg-slate-950 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">SVG Path Drawing</h2>
        <p className="text-white/60 text-lg">The line draws itself as you scroll — Apple's favorite trick</p>
      </div>
      <div className="max-w-3xl mx-auto">
        <svg viewBox="0 0 600 300" className="w-full" fill="none">
          {/* Ghost path — shows where the line will go */}
          <path
            d="M 30,150 Q 150,20 300,150 Q 450,280 570,150"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
            fill="none"
          />
          {/* Animated path */}
          <motion.path
            d="M 30,150 Q 150,20 300,150 Q 450,280 570,150"
            stroke="url(#gradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            style={{ pathLength }}
          />
          {/* Animated circle that follows the path */}
          <motion.circle
            cx="30"
            cy="150"
            r="8"
            fill="#a855f7"
            style={{
              offsetPath: "path('M 30,150 Q 150,20 300,150 Q 450,280 570,150')",
              offsetDistance: useTransform(pathLength, (v) => `${v * 100}%`),
            }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Progress bar version — simpler but equally useful */}
        <div className="mt-16">
          <p className="text-white/40 text-center text-sm mb-4 uppercase tracking-wider">
            Scroll progress bar (same concept, simpler shape)
          </p>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 rounded-full origin-left"
              style={{ scaleX: pathLength }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 5: Character-by-Character Text Animation (easy — framer-motion)
// Each letter animates individually for a "typewriter on steroids" effect.
// ═══════════════════════════════════════════════════════════════════════════
function CharacterRevealSection() {
  const words = "Mystery Maker".split("");
  const subtitle = "Every letter, individually animated.".split("");

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-slate-950 to-indigo-950 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">Character-by-Character Reveal</h2>

        {/* Big word — each letter staggers in */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex justify-center flex-wrap mb-8"
        >
          {words.map((char, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0, y: 50, rotateX: -90 },
                visible: {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  transition: { duration: 0.5, delay: i * 0.05, ease: "easeOut" },
                },
              }}
              className={`text-6xl md:text-9xl font-bold ${
                char === " " ? "w-6 md:w-10" : "bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
              }`}
              style={{ display: "inline-block" }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.div>

        {/* Subtitle — wave effect */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex justify-center flex-wrap"
        >
          {subtitle.map((char, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { duration: 0.03, delay: 0.8 + i * 0.02 },
                },
              }}
              className="text-xl md:text-2xl text-white/60"
              style={{ display: "inline-block" }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 6: Mouse Hover Parallax Cards (easy — framer-motion)
// Images shift based on mouse position, not scroll. Feels 3D.
// ═══════════════════════════════════════════════════════════════════════════
function TiltCard({ title, image, color }: { title: string; image: string; color: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });
  const imgX = useSpring(useTransform(x, [-0.5, 0.5], [15, -15]), { stiffness: 300, damping: 30 });
  const imgY = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 300, damping: 30 });

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [x, y]);

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`${color} rounded-2xl p-1 cursor-pointer`}
    >
      <div className="bg-slate-900 rounded-xl overflow-hidden">
        <motion.div style={{ x: imgX, y: imgY }} className="overflow-hidden">
          <img src={image} alt="" className="w-full h-48 object-cover scale-110" />
        </motion.div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-white/50 text-sm mt-2">Hover and move your mouse around</p>
        </div>
      </div>
    </motion.div>
  );
}

function HoverParallaxSection() {
  return (
    <section className="py-32 px-6 bg-slate-950">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-4">Mouse Hover Parallax</h2>
        <p className="text-white/60 text-lg text-center mb-16">Cards that respond to your cursor — feels 3D without any 3D libraries</p>
        <div className="grid md:grid-cols-3 gap-8" style={{ perspective: "1000px" }}>
          <TiltCard
            title="The Speakeasy"
            image="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80"
            color="bg-gradient-to-br from-amber-500 to-red-600"
          />
          <TiltCard
            title="The Castle"
            image="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80"
            color="bg-gradient-to-br from-purple-500 to-indigo-600"
          />
          <TiltCard
            title="The Space Station"
            image="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80"
            color="bg-gradient-to-br from-cyan-500 to-blue-600"
          />
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 7: GSAP Pinned Timeline (medium — GSAP ScrollTrigger)
// A section that pins in place while content transitions through it.
// This is the "Apple product page" effect.
// ═══════════════════════════════════════════════════════════════════════════
function GSAPPinnedTimeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const slide0 = useRef<HTMLDivElement>(null);
  const slide1 = useRef<HTMLDivElement>(null);
  const slide2 = useRef<HTMLDivElement>(null);
  const slide3 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const slideRefs = [slide0.current, slide1.current, slide2.current, slide3.current];

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=400%",
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
        },
      });

      // Slide 0 is visible by default, fade it out
      tl.to(slideRefs[0], { opacity: 0, y: -80, duration: 1 }, 0.8);

      // Slide 1 fades in, holds, fades out
      tl.fromTo(slideRefs[1], { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1 }, 1);
      tl.to(slideRefs[1], { opacity: 0, y: -80, duration: 1 }, 2.3);

      // Slide 2 fades in, holds, fades out
      tl.fromTo(slideRefs[2], { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1 }, 2.5);
      tl.to(slideRefs[2], { opacity: 0, y: -80, duration: 1 }, 3.8);

      // Slide 3 fades in, stays
      tl.fromTo(slideRefs[3], { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1 }, 4);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const slides = [
    { title: "Tell us your theme", subtitle: "A 1920s speakeasy? A space station? A candy kingdom?", accent: "text-rose-400", bg: "from-rose-500/20", ref: slide0 },
    { title: "AI builds your mystery", subtitle: "Characters, motives, clues, and plot twists — all generated", accent: "text-violet-400", bg: "from-violet-500/20", ref: slide1 },
    { title: "Get your party package", subtitle: "Host guide, character sheets, round scripts, everything you need", accent: "text-cyan-400", bg: "from-cyan-500/20", ref: slide2 },
    { title: "Host an unforgettable night", subtitle: "Your guests will think you spent weeks planning", accent: "text-emerald-400", bg: "from-emerald-500/20", ref: slide3 },
  ];

  return (
    <section className="bg-slate-950">
      <div className="px-6 pt-24 pb-8 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">GSAP Pinned Timeline</h2>
        <p className="text-white/60 text-lg">
          The section pins in place while content cycles through — the Apple product page effect
        </p>
      </div>
      <div ref={sectionRef} className="h-screen relative overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={slide.ref}
            className="absolute inset-0 flex items-center justify-center px-6"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <div className={`max-w-3xl text-center bg-gradient-to-b ${slide.bg} to-transparent rounded-3xl p-12`}>
              <div className={`text-sm uppercase tracking-widest ${slide.accent} mb-4`}>
                Step {i + 1}
              </div>
              <h3 className="text-4xl md:text-7xl font-bold text-white mb-6">{slide.title}</h3>
              <p className="text-xl text-white/60">{slide.subtitle}</p>
            </div>
          </div>
        ))}

        {/* Scroll progress dots */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/30" />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE 8: GSAP Scrub Animation (medium — GSAP ScrollTrigger)
// Animations that play/reverse precisely mapped to scroll position.
// Unlike whileInView which triggers once, scrub is continuously linked.
// ═══════════════════════════════════════════════════════════════════════════
function GSAPScrubSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const bar1 = useRef<HTMLDivElement>(null);
  const bar2 = useRef<HTMLDivElement>(null);
  const bar3 = useRef<HTMLDivElement>(null);
  const rotateBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return;

    const ctx = gsap.context(() => {
      // Text scales up as you scroll through it
      gsap.fromTo(
        textRef.current,
        { scale: 0.3, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: textRef.current,
            start: "top 90%",
            end: "top 40%",
            scrub: 0.5,
          },
        }
      );

      // Bars grow in width — like a chart animating
      [bar1, bar2, bar3].forEach((ref, i) => {
        if (!ref.current) return;
        gsap.fromTo(
          ref.current,
          { width: "0%" },
          {
            width: `${[75, 90, 60][i]}%`,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 85%",
              end: "top 50%",
              scrub: 0.5,
            },
          }
        );
      });

      // Rotating box — continuously rotates as you scroll through it
      if (rotateBoxRef.current) {
        gsap.fromTo(
          rotateBoxRef.current,
          { rotation: 0, borderRadius: "8px" },
          {
            rotation: 360,
            borderRadius: "50%",
            ease: "none",
            scrollTrigger: {
              trigger: rotateBoxRef.current,
              start: "top 80%",
              end: "top 20%",
              scrub: 0.5,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-32 px-6 bg-gradient-to-b from-indigo-950 to-slate-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">GSAP Scrub Animations</h2>
          <p className="text-white/60 text-lg">
            Scroll up and down — every animation follows your scroll position precisely
          </p>
        </div>

        {/* Scrub-scaled text */}
        <h3
          ref={textRef}
          className="text-5xl md:text-8xl font-bold text-center my-24 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400"
        >
          Scroll controls me
        </h3>

        {/* Scrub-driven bar chart */}
        <div className="max-w-2xl mx-auto my-24 space-y-6">
          <p className="text-white/40 text-sm uppercase tracking-wider text-center mb-8">Bars grow as you scroll — scroll back up and they shrink</p>
          {[
            { ref: bar1, label: "framer-motion", color: "bg-purple-500" },
            { ref: bar2, label: "GSAP", color: "bg-green-500" },
            { ref: bar3, label: "CSS only", color: "bg-cyan-500" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-white/60 text-sm w-32 text-right shrink-0">{item.label}</span>
              <div className="flex-1 bg-white/10 rounded-full h-8 overflow-hidden">
                <div ref={item.ref} className={`${item.color} h-full rounded-full`} style={{ width: "0%" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Rotating/morphing shape */}
        <div className="flex flex-col items-center my-24">
          <p className="text-white/40 text-sm uppercase tracking-wider mb-8">Square morphs to circle as you scroll</p>
          <div
            ref={rotateBoxRef}
            className="w-32 h-32 bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-purple-500/30"
            style={{ borderRadius: "8px" }}
          />
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNIQUE BONUS: CSS-Only Parallax (trivial)
// ═══════════════════════════════════════════════════════════════════════════
function CSSParallaxSection() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Pure CSS Parallax</h2>
        <p className="text-xl text-white/80 mb-4">
          <code className="bg-white/20 px-2 py-1 rounded text-sm">background-attachment: fixed</code> — no JavaScript at all.
        </p>
        <p className="text-white/50 text-sm">Doesn't work on most mobile browsers, so use framer-motion for mobile.</p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
function Summary() {
  const techniques = [
    { num: "1", name: "Speed Layers", lib: "framer-motion", level: "Easy", desc: "useScroll + useTransform — different speeds = depth" },
    { num: "2", name: "Scroll Reveal", lib: "framer-motion", level: "Easy", desc: "whileInView — the most-used technique on the web" },
    { num: "3", name: "Horizontal Scroll", lib: "framer-motion", level: "Easy", desc: "Sticky container + scroll-driven translateX" },
    { num: "4", name: "SVG Path Drawing", lib: "framer-motion", level: "Easy", desc: "pathLength prop — Apple's signature move" },
    { num: "5", name: "Character Reveal", lib: "framer-motion", level: "Easy", desc: "Split text into spans, stagger individually" },
    { num: "6", name: "Mouse Hover Parallax", lib: "framer-motion", level: "Easy", desc: "Mouse position → 3D rotation. No scroll needed" },
    { num: "7", name: "Pinned Timeline", lib: "GSAP ScrollTrigger", level: "Medium", desc: "Pin section, scrub through content transitions" },
    { num: "8", name: "Scrub Animations", lib: "GSAP ScrollTrigger", level: "Medium", desc: "Animations follow scroll position bidirectionally" },
  ];

  return (
    <section className="py-32 px-6 bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">Everything You Just Saw</h2>
        <p className="text-white/40 text-center mb-12">
          Smooth scrolling powered by Lenis wraps the entire page
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4 text-white/50 text-sm font-medium">#</th>
                <th className="py-3 px-4 text-white/50 text-sm font-medium">Technique</th>
                <th className="py-3 px-4 text-white/50 text-sm font-medium">Library</th>
                <th className="py-3 px-4 text-white/50 text-sm font-medium">Level</th>
                <th className="py-3 px-4 text-white/50 text-sm font-medium">How it works</th>
              </tr>
            </thead>
            <tbody>
              {techniques.map((t) => (
                <tr key={t.num} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white/30 text-sm">{t.num}</td>
                  <td className="py-3 px-4 text-white font-medium">{t.name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.lib.includes("GSAP") ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {t.lib}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.level === "Easy" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {t.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/50 text-sm">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 text-center text-white/30 text-sm">
          All of this runs on framer-motion + GSAP + Lenis + Tailwind. That's it.
        </div>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function ParallaxDemo() {
  useSmoothScroll();

  return (
    <div className="bg-slate-950">
      <ParallaxHero />
      <ScrollRevealSection />
      <HorizontalScrollSection />
      <SVGDrawSection />
      <CharacterRevealSection />
      <HoverParallaxSection />
      <GSAPPinnedTimeline />
      <GSAPScrubSection />
      <CSSParallaxSection />
      <Summary />
    </div>
  );
}
