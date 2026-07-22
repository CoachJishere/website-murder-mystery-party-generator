import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Faq1 } from "@/components/ui/faq1";
import ColdCaseBrief from "@/components/ColdCaseBrief";
import SignInPrompt from "@/components/SignInPrompt";
import TrustpilotBadge from "@/components/TrustpilotBadge";
import { useAuth } from "@/context/AuthContext";

const SITE = "https://www.mysterymaker.party";
const PATH = "cold-case-files";

// English-only at launch (OfficeMurderMysteryParty precedent). House layout language with
// the product's own evidence imagery; copy leads with the brand promise: the buyer briefs
// the case, THEN we generate. The hero brief box mirrors the party homepage's "describe
// what you want" gesture (owner call 2026-07-04) — one honest input, no fake conversation,
// straight into Stripe checkout with the brief riding as session metadata.
const CASE_SERIF = "[font-family:Georgia,'Times_New_Roman',serif]";

// How it works — the party homepage's exact treatment (Index.tsx HorizontalHowItWorks):
// wide cards that travel sideways under a GSAP scroll pin on desktop, a numbered
// timeline stack on mobile. Three steps instead of four, so the cards run wider.
const HIW_STEPS = [
  {
    n: 1,
    accent: "#C81400",
    title: "Brief us",
    desc: "An era, a place, a detail you want woven in — a 1920s ocean liner, a Cold War observatory, your call. Or say \"surprise me.\"",
  },
  {
    n: 2,
    accent: "#E74C3C",
    title: "We build your murder",
    desc: "An original case that has never existed before, tested to be genuinely solvable. We email you when it's ready — usually within the hour.",
  },
  {
    n: 3,
    accent: "#A01000",
    title: "Solve it",
    desc: "Four objectives stand between you and the killer's name. Read the file, catch the contradictions, and close what the inquest couldn't.",
  },
];

function ColdCaseHowItWorks({ reduce }: { reduce: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile || reduce || !sectionRef.current || !trackRef.current) return;
    const track = trackRef.current;
    const scrollAmount = track.scrollWidth - window.innerWidth + 48;
    if (scrollAmount <= 0) return;
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
  }, [isMobile, reduce]);

  if (isMobile) {
    return (
      <section className="py-16 px-4" style={{ backgroundColor: "#111111" }}>
        <h2 className="font-display text-2xl sm:text-3xl text-center mb-4 text-[#f2ede6]">
          HOW IT WORKS
        </h2>
        <p className="text-base text-center mb-10 text-[#b5ad9f]">
          Three steps from a sentence to a solved murder
        </p>
        <div className="relative max-w-sm mx-auto space-y-8">
          {HIW_STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              className="flex items-start gap-5"
              initial={reduce ? undefined : { opacity: 0, x: -20 }}
              whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl shrink-0 font-display"
                style={{ backgroundColor: step.accent, color: "#F5F0E8" }}
              >
                {step.n}
              </div>
              <div className="pt-2">
                <h3 className="font-display text-lg mb-1 text-[#f2ede6]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#b5ad9f]">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  // Reduced motion: the same wide cards, no pin — a plain row that wraps.
  if (reduce) {
    return (
      <section className="py-24 px-6" style={{ backgroundColor: "#111111" }}>
        <h2 className="font-display text-3xl md:text-5xl text-center mb-4 text-[#f2ede6]">HOW IT WORKS</h2>
        <p className="text-lg text-center mb-12 text-[#b5ad9f]">Three steps from a sentence to a solved murder</p>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {HIW_STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl flex flex-col items-center justify-center p-10 text-center"
              style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.1)" }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-3xl font-display" style={{ backgroundColor: step.accent, color: "#F5F0E8" }}>
                {step.n}
              </div>
              <h3 className="font-display text-2xl mb-3 text-[#f2ede6]">{step.title}</h3>
              <p className="text-base text-[#b5ad9f] max-w-md">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="overflow-hidden" style={{ backgroundColor: "#111111" }}>
      <div className="h-screen flex flex-col justify-center">
        <div className="px-6 mb-8">
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl text-center mb-4 text-[#f2ede6]">
            HOW IT WORKS
          </h2>
          <p className="text-lg text-center text-[#b5ad9f]">
            Three steps from a sentence to a solved murder
          </p>
        </div>
        <div ref={trackRef} className="flex gap-8 px-6 will-change-transform">
          {HIW_STEPS.map((step) => (
            <div
              key={step.n}
              className="min-w-[42vw] h-[50vh] rounded-2xl flex flex-col items-center justify-center p-8 shrink-0"
              style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.1)" }}
            >
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-5 text-2xl md:text-3xl font-display"
                style={{ backgroundColor: step.accent, color: "#F5F0E8" }}
              >
                {step.n}
              </div>
              <h3 className="font-display text-xl md:text-3xl mb-3 text-center text-[#f2ede6]">{step.title}</h3>
              <p className="text-base md:text-lg text-center max-w-md text-[#b5ad9f]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ColdCaseFiles() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // The free trial is gated: signing up starts the welcome-discount countdown and puts
  // the trial card in their dashboard. Signed-in visitors just open the file.
  const onSampleClick = (e: React.MouseEvent) => {
    if (isAuthenticated) return; // default <a target=_blank> behavior
    e.preventDefault();
    // Survives the OAuth bounce: AuthCallback always lands on /dashboard, where this
    // flag raises the "your free case is waiting" banner over the trial card.
    try { localStorage.setItem("ccf_sample_intent", "1"); } catch { /* fine */ }
    setShowSignInPrompt(true);
  };

  // Evidence-board parallax (same framer-motion pattern as the homepage's MysteryRoomHero).
  // Research-constrained (NN/g parallax usability + JUX 2015): decorative layers ONLY —
  // headline/CTA never move; transform/opacity only; prefers-reduced-motion disables all.
  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yDoc = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "16%"]);
  const yPolaroid = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "42%"]);
  const yPlate = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "68%"]);
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 26 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.55, ease: "easeOut" as const },
      };

  const scrollToBrief = () =>
    document.getElementById("brief-box")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });

  return (
    <div className={`min-h-screen flex flex-col bg-[#100d0b] text-[#f2ede6] ${isAuthenticated ? "h-screen overflow-hidden" : ""}`}>
      <Helmet>
        <title>Create Your Own Cold Case — An Original Unsolved Murder | Mystery Maker</title>
        <meta
          name="description"
          content="Tell us where and when — we build an original unsolved murder around it. 25 period documents, photographs, a real twist, one self-contained file. Read the evidence and name the killer."
        />
        <link rel="canonical" href={`${SITE}/${PATH}/`} />
        <meta property="og:title" content="Create your own cold case — then solve it" />
        <meta
          property="og:description"
          content="Tell us where and when. We'll hand you the file no one could close."
        />
        <meta property="og:image" content={`${SITE}/images/cold-case/plate-exhibit.webp`} />
        <meta property="og:url" content={`${SITE}/${PATH}/`} />
      </Helmet>
      <Header />
      <SignInPrompt isOpen={showSignInPrompt} onClose={() => setShowSignInPrompt(false)} />

      <main className={`flex-1 ${isAuthenticated ? "flex flex-col" : ""}`}>
        {/* ── Hero: house red band + brief box + parallax evidence collage ── */}
        <section
          ref={heroRef}
          className={`bg-primary text-primary-foreground overflow-hidden ${isAuthenticated ? "flex-1 flex items-center" : ""}`}
        >
          <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="font-display text-4xl md:text-5xl xl:text-6xl leading-[1.05] mb-5">
                Create your own cold case
              </h1>
              <p className={`${CASE_SERIF} italic text-2xl md:text-[1.7rem] mb-8 opacity-95`}>
                Tell us where and when. We'll hand you the file no one could close.
              </p>
              <div id="brief-box" className="mx-auto lg:mx-0">
                <ColdCaseBrief />
                {isAuthenticated && (
                  <p className="mt-4 text-sm opacity-85">
                    <RouterLink to="/dashboard" className="underline">
                      Your cases are in your dashboard →
                    </RouterLink>
                  </p>
                )}
              </div>
            </div>

            {/* Evidence collage — real case screenshots on three parallax rates (decorative
                layer only: outer divs own static placement, motion wrappers own scroll drift) */}
            <div className="relative h-[340px] md:h-[480px] select-none overflow-hidden" aria-hidden="false">
              <div className="absolute left-1/2 top-1/2 -translate-x-[62%] -translate-y-1/2 w-[62%] max-w-[340px] rotate-[-3deg]">
                <motion.img
                  style={{ y: yDoc }}
                  src="/images/cold-case/doc-postmortem.webp"
                  alt="Police report from a generated cold case — typewritten on aged paper"
                  loading="eager"
                  className="w-full rounded-sm shadow-2xl ring-1 ring-black/30"
                />
              </div>
              <div className="absolute left-1/2 top-[10%] translate-x-[4%] w-[36%] max-w-[200px] rotate-[4deg]">
                <motion.img
                  style={{ y: yPolaroid }}
                  src="/images/cold-case/polaroid-vosloo.webp"
                  alt="Suspect polaroid portrait with handwritten name"
                  loading="eager"
                  className="w-full shadow-2xl ring-1 ring-black/30"
                />
              </div>
              <div className="absolute left-1/2 bottom-[8%] translate-x-[8%] w-[42%] max-w-[240px] rotate-[2deg]">
                <motion.div style={{ y: yPlate }} className="shadow-2xl ring-1 ring-black/30 bg-[#111]">
                  <img
                    src="/images/cold-case/plate-dome.webp"
                    alt="Comparative evidence plate from a generated case"
                    loading="eager"
                    className="w-full h-[150px] object-cover object-top"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {!isAuthenticated && (
          <>
        {/* ── Social proof strip (homepage slot) — company-level Trustpilot rating ── */}
        <div className="border-b border-[#2b251f] bg-[#100d0b]">
          <div className="max-w-4xl mx-auto px-6">
            <TrustpilotBadge />
          </div>
        </div>

        {/* ── The demo slot: a playable TRIAL, gated behind sign-in (the signup starts
            the welcome-discount countdown; the case lands in their dashboard) ── */}
        <section className="border-b border-[#2b251f] bg-[#161210]">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl mb-3">Solve one for free</h2>
            <p className="text-[#b5ad9f] mb-8 max-w-2xl mx-auto">
              Try the trial version of a real case — playable up to the first objective. It's not
              the complete file, but it's the exact experience: the documents, the photographs,
              and the first answer you'll have to earn.
            </p>
            <motion.a
              {...reveal}
              href="/try-a-cold-case.html"
              target="_blank"
              rel="noopener"
              onClick={onSampleClick}
              className="group block rounded-md overflow-hidden ring-1 ring-[#2b251f] relative"
            >
              <img
                src="/images/cold-case/case-masthead.webp"
                alt="The trial case file, open at its masthead — click to play it in a new tab"
                loading="lazy"
                className="w-full opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-primary group-hover:bg-primary-hover text-primary-foreground font-bold text-lg px-8 py-4 rounded-md shadow-2xl transition-colors">
                  Play the free trial →
                </span>
              </span>
            </motion.a>
            <p className="text-xs text-[#8f887b] mt-3">
              Free with an account — the trial runs to the end of Objective 1.
            </p>
          </div>
        </section>

        {/* ── How it works — the party page's pinned horizontal-scroll cards ── */}
        <ColdCaseHowItWorks reduce={!!reduce} />

        {/* ── Inside the file — the party homepage's zigzag feature language (image one
            side, text the other, alternating), fed with real generated-case imagery ── */}
        <section className="border-t border-[#2b251f] py-16 sm:py-24 px-4 sm:px-6" style={{ backgroundColor: "#000000" }}>
          <div className="max-w-6xl mx-auto">
            <motion.h2
              {...reveal}
              className="font-display text-2xl sm:text-3xl md:text-5xl text-center mb-3"
            >
              INSIDE THE FILE
            </motion.h2>
            <p className="text-center text-[#b5ad9f] mb-10 sm:mb-16">
              Real pages from a real case. Yours will look like this — and be nothing like it.
            </p>
            <div className="space-y-12 sm:space-y-24">
              {[
                {
                  src: "/images/cold-case/polaroid-joubert.webp",
                  alt: "A suspect's polaroid portrait from a generated case, shown whole",
                  fit: "contain" as const,
                  title: "Yours to keep, replay, and share",
                  desc: "Your case arrives as one file that opens in any browser and never expires. Play it tonight, again next year, or hand it to a friend when you've cracked it and see if they name the same killer. No app, no account, no internet needed.",
                },
                {
                  src: "/images/cold-case/doc-scene.webp",
                  alt: "Typewritten witness statement on aged archive paper",
                  title: "25 period documents",
                  desc: "Police reports, the post-mortem, witness statements, private letters, the local newspaper. The answer is in there — someone's story doesn't hold up, and it's your job to find where.",
                },
                {
                  src: "/images/cold-case/plate-exhibit.webp",
                  alt: "Inquest photograph from a generated case: the scene as found, photographed in the snow",
                  title: "Evidence worth a second look",
                  desc: "Inquest photographs, evidence exhibits, portraits of everyone involved. The inquest saw all of it and still got the verdict wrong. You have one advantage they didn't: you know something's off.",
                },
              ].map(({ src, alt, title, desc, fit }, i) => (
                <div
                  key={src}
                  className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-6 sm:gap-12 items-center`}
                >
                  <motion.div
                    initial={reduce ? undefined : { opacity: 0, scale: 0.92 }}
                    whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="md:w-1/2 w-full"
                  >
                    <div className="h-56 sm:h-72 md:h-96 overflow-hidden rounded-2xl ring-1 ring-[rgba(245,240,232,0.1)] bg-[#181310]">
                      <img
                        src={src}
                        alt={alt}
                        loading="lazy"
                        className={fit === "contain" ? "w-full h-full object-contain p-6" : "w-full h-full object-cover object-top"}
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={reduce ? undefined : { opacity: 0, x: i % 2 === 1 ? -30 : 30 }}
                    whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                    className="md:w-1/2 text-center md:text-left"
                  >
                    <h3 className="font-display text-xl sm:text-2xl md:text-4xl mb-3 sm:mb-4">{title}</h3>
                    <p className="text-base sm:text-lg leading-relaxed text-[#b5ad9f]">{desc}</p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The format, called out — a mini headline band of its own ── */}
        <section className="border-t border-[#2b251f] bg-[#161210]">
          <div className="max-w-4xl mx-auto px-6 py-14 text-center">
            <motion.h2 {...reveal} className="font-display text-2xl sm:text-3xl md:text-4xl mb-3">
              ONE SELF-CONTAINED FILE
            </motion.h2>
            <p className={`${CASE_SERIF} italic text-lg md:text-xl text-[#c2a14a]`}>
              Documents, photographs, objectives — on any device, no internet needed. Yours forever.
            </p>
          </div>
        </section>

        {/* ── Testimonials — same cards + content as the party homepage for now (owner will
            swap in cold-case reviews once they exist) ── */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#161210] border-t border-[#2b251f]">
          <div className="max-w-7xl mx-auto">
            <motion.h2 {...reveal} className="font-display text-2xl sm:text-3xl md:text-5xl text-center mb-8 sm:mb-12">
              WHAT OTHERS ARE SAYING
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                { text: t("home.parallaxTestimonials.sophia.text"), author: t("home.parallaxTestimonials.sophia.author"), initial: "S" },
                { text: t("home.parallaxTestimonials.will.text"), author: t("home.parallaxTestimonials.will.author"), initial: "W" },
                { text: t("home.parallaxTestimonials.jed.text"), author: t("home.parallaxTestimonials.jed.author"), initial: "J" },
              ].map(({ text, author, initial }, i) => (
                <motion.div
                  key={initial}
                  {...reveal}
                  {...(!reduce && { transition: { duration: 0.5, ease: "easeOut" as const, delay: i * 0.1 } })}
                  className="rounded-xl p-5 sm:p-6"
                  style={{ backgroundColor: "#111111", border: "1px solid rgba(245,240,232,0.1)" }}
                >
                  <div className="flex items-center space-x-1 mb-4">
                    {Array.from({ length: 5 }, (_, star) => (
                      <svg key={star} className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mb-4 text-sm sm:text-base text-[#b5ad9f]">{text}</p>
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center mr-3 bg-primary">
                      <span className="text-xs font-semibold text-primary-foreground">{initial}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{author}</p>
                      <p className="text-xs mt-0.5 text-[#8f887b]">
                        <span style={{ color: "#1da66f" }}>★</span> {t("home.verifiedTrustpilotReview")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ: where the words live ── */}
        <section className="max-w-3xl mx-auto px-6 py-16 [&_*]:border-[#2b251f]">
          <Faq1
            heading="Questions, detective?"
            items={[
              {
                question: "What exactly am I paying for?",
                answer:
                  "One original cold case, written and built just for you, delivered as a single file that opens in any browser — no app, no account, no internet needed. Inside: 25 period documents (police reports, the post-mortem, witness statements, private letters, the local newspaper), real evidence photographs, a portrait of every person named in the file, and four objectives that end with you naming the killer. It's yours forever — play it as many times as you like, and when you've cracked it, send the file to friends and see if they do better.",
              },
              {
                question: "How much does it cost?",
                answer:
                  "$24.99, one time. No subscription, nothing extra to unlock. For the price of a couple of cinema tickets you get an evening-length mystery that has never existed before — and never will again.",
              },
              {
                question: "Can I really choose the setting?",
                answer:
                  "Yes — that's the whole point. Type anything into the box: \"a lighthouse off Cornwall, 1899\" or \"the 1972 chess championship.\" We build the murder around it. Leave it blank and we'll take you somewhere you've never been.",
              },
              {
                question: "Is my case really unique?",
                answer:
                  "Completely. Your case is written from scratch when you order it — new setting, new people, new solution. It has never existed before and will never be generated again. Nobody else will ever solve your case.",
              },
              {
                question: "When do I get it?",
                answer:
                  "Usually within the hour. Writing and quality-checking a case takes real time — we email you the moment it's ready, so go make a coffee. There's a status page if you'd rather watch.",
              },
              {
                question: "Is it actually solvable?",
                answer:
                  "Yes — provably. Before any case ships, an independent check has to solve it using only the documents. If it can't, you never see it. No outside knowledge, no guesswork, one real answer — and the obvious suspect never did it.",
              },
              {
                question: "How long does it take — and can I stop partway?",
                answer:
                  "About 90 minutes for most people — a proper evening — and the four objectives give you natural places to pause. One thing to know: the case file keeps no memory, so if you close it, it reopens fresh. Real detectives keep a notebook; keep yours on paper and you can pick the trail back up any time.",
              },
              {
                question: "Can I play with someone else?",
                answer:
                  "Yes. It's tuned for one or two detectives — with two, the arguing about who did it is half the fun. More can join in since everyone can have the file, but the experience is at its best with one or two.",
              },
            ]}
          />
        </section>

        {/* ── Closing CTA: house red band ── */}
        <section className="bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl mb-3">Your case doesn't exist yet.</h2>
            <p className={`${CASE_SERIF} italic text-xl mb-8 opacity-90`}>
              Read the file. Name the killer.
            </p>
            <Button
              onClick={scrollToBrief}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-lg px-10 py-6 font-bold"
            >
              Start your case <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
