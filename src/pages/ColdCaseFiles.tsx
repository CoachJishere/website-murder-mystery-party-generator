import { useRef } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Faq1 } from "@/components/ui/faq1";

const SITE = "https://www.mysterymaker.party";
const PATH = "cold-case-files";

// English-only at launch (OfficeMurderMysteryParty precedent). House layout language
// (red hero band, Bowlby display headings, numbered steps, FAQ accordion) with the
// product's own evidence imagery doing the selling — screenshots of a REAL generated
// case, no asset repeated on the page. Copy leads with the brand promise: the buyer
// briefs the case (era/setting/details), THEN we generate. No party-product
// comparisons — they're different products and the site chrome already cross-links.
// CTA is driven by the Stripe Payment Link env; renders "Opening soon" until it exists.
const PAYMENT_LINK = import.meta.env.VITE_COLD_CASE_PAYMENT_LINK as string | undefined;

const CASE_SERIF = "[font-family:Georgia,'Times_New_Roman',serif]";

function BuyButton({ light = false }: { light?: boolean }) {
  if (!PAYMENT_LINK) {
    return (
      <Button size="lg" disabled variant="secondary" className="text-lg px-10 py-6 opacity-80">
        Opening soon
      </Button>
    );
  }
  return (
    <Button
      asChild
      size="lg"
      className={
        light
          ? "bg-white text-primary hover:bg-white/90 text-lg px-10 py-6 font-bold"
          : "bg-primary hover:bg-primary-hover text-primary-foreground text-lg px-10 py-6 font-bold"
      }
    >
      <a href={PAYMENT_LINK}>
        Create your case <ArrowRight className="ml-2 h-5 w-5" />
      </a>
    </Button>
  );
}

export default function ColdCaseFiles() {
  // Evidence-board parallax (same framer-motion pattern as the homepage's MysteryRoomHero).
  // Research-constrained (NN/g parallax usability + JUX 2015): decorative layers ONLY —
  // headline/CTA never move; transform/opacity only; prefers-reduced-motion disables all.
  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yDoc = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "16%"]);
  const yPolaroid = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "42%"]);
  const yPlate = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "68%"]);
  // Scroll-reveal preset for below-the-fold imagery/steps (once, gentle rise)
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 26 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.55, ease: "easeOut" as const },
      };

  return (
    <div className="min-h-screen flex flex-col bg-[#100d0b] text-[#f2ede6]">
      <Helmet>
        <title>Create Your Own Cold Case — An Original Unsolved Murder | Mystery Maker</title>
        <meta
          name="description"
          content="You pick the era and the place — we build an original unsolved murder around it. 25 period documents, photographs, a real twist, one self-contained file. Read the evidence and name the killer."
        />
        <link rel="canonical" href={`${SITE}/${PATH}/`} />
        <meta property="og:title" content="Create your own cold case — then solve it" />
        <meta
          property="og:description"
          content="Pick the era and the place. We'll hide the killer. An original unsolved murder, built to your brief."
        />
        <meta property="og:image" content={`${SITE}/images/cold-case/plate-dome.webp`} />
        <meta property="og:url" content={`${SITE}/${PATH}/`} />
      </Helmet>
      <Header />

      <main className="flex-1">
        {/* ── Hero: house red band + parallax evidence collage ── */}
        <section ref={heroRef} className="bg-primary text-primary-foreground overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <p className="font-mono text-xs tracking-[0.3em] uppercase opacity-80 mb-5">
                Case file · Eyes only
              </p>
              <h1 className="font-display text-4xl md:text-5xl xl:text-6xl leading-[1.05] mb-5">
                Create your own cold case
              </h1>
              <p className={`${CASE_SERIF} italic text-2xl md:text-[1.7rem] mb-8 opacity-95`}>
                You pick the era and the place. We hide the killer.
              </p>
              <BuyButton light />
              <p className="mt-4 text-sm opacity-75">
                One-of-one · ~90 min to solve · yours forever, offline
              </p>
            </div>

            {/* Evidence collage — real case screenshots on three parallax rates (decorative
                layer only: the outer divs own the static placement, the motion wrappers own
                scroll drift, so the two transform systems never fight) */}
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

        {/* ── How it works — brief first, that's the product ── */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="font-display text-3xl md:text-4xl text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-10 text-center">
            {[
              {
                n: "1",
                title: "Brief us",
                line: "An era, a place, a detail you want woven in — a 1920s ocean liner, a Cold War observatory, your call. Or say \"surprise me.\"",
              },
              {
                n: "2",
                title: "We build your murder",
                line: "An original case that has never existed before, tested to be genuinely solvable. We email you when it's ready — usually within the hour.",
              },
              {
                n: "3",
                title: "Solve it",
                line: "Four objectives stand between you and the killer's name.",
              },
            ].map(({ n, title, line }, i) => (
              <motion.div
                key={n}
                {...reveal}
                {...(!reduce && { transition: { duration: 0.55, ease: "easeOut" as const, delay: i * 0.12 } })}
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display text-xl flex items-center justify-center mx-auto mb-4">
                  {n}
                </div>
                <h3 className="font-display text-xl mb-2">{title}</h3>
                <p className="text-sm text-[#b5ad9f] leading-relaxed">{line}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Inside the file: the product sells itself ── */}
        <section className="border-t border-[#2b251f] bg-[#161210]">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-display text-3xl md:text-4xl text-center mb-3">Inside the file</h2>
            <p className="text-center text-[#b5ad9f] mb-12">
              From a real case file. Yours will look like this — and be nothing like it.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  src: "/images/cold-case/plate-exhibit.webp",
                  alt: "Inquest plate from a generated case: the scene as found, photographed in the snow",
                  caption: "The photograph the whole case turns on.",
                },
                {
                  src: "/images/cold-case/doc-scene.webp",
                  alt: "Typewritten witness statement on aged archive paper",
                  caption: "25 period documents, each in its own voice.",
                },
                {
                  src: "/images/cold-case/polaroid-joubert.webp",
                  alt: "A suspect's polaroid portrait with a handwritten name",
                  caption: "The people. One of them did it.",
                },
              ].map(({ src, alt, caption }, i) => (
                <motion.figure
                  key={src}
                  className="group"
                  {...reveal}
                  {...(!reduce && { transition: { duration: 0.55, ease: "easeOut" as const, delay: i * 0.12 } })}
                >
                  <div className="h-[340px] overflow-hidden rounded-md ring-1 ring-[#2b251f] bg-[#181310]">
                    <img
                      src={src}
                      alt={alt}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className={`${CASE_SERIF} italic text-[#c2a14a] text-center mt-3`}>
                    {caption}
                  </figcaption>
                </motion.figure>
              ))}
            </div>
            {/* What you open — desktop only; at phone width a wide UI shot reads as noise */}
            <motion.div {...reveal} className="mt-6 rounded-md overflow-hidden ring-1 ring-[#2b251f] hidden md:block">
              <img
                src="/images/cold-case/case-masthead.webp"
                alt="A case file opened in the browser: the case masthead, the reopening premise, and its 25 documents across 3 sealed envelopes"
                loading="lazy"
                className="w-full"
              />
            </motion.div>
            <p className="text-center text-sm text-[#8f887b] mt-6 md:mt-3">
              One self-contained file — documents, photographs, objectives — on any device, no internet needed.
            </p>
          </div>
        </section>

        {/* ── FAQ: where the words live ── */}
        <section className="max-w-3xl mx-auto px-6 py-16 [&_*]:border-[#2b251f]">
          <Faq1
            heading="Questions, detective?"
            items={[
              {
                question: "Can I really choose the setting?",
                answer:
                  "Yes — that's the point. Tell us the era, the place, and anything you want woven in (a lighthouse, a chess tournament, your grandmother's village in 1962), and the case is built around your brief. Prefer to be ambushed? Leave it blank and we'll invent somewhere you've never been.",
              },
              {
                question: "What exactly do I get?",
                answer:
                  "One self-contained file — an original cold case with 25 period documents (police reports, a post-mortem, witness statements, registers, letters, a newspaper), photographs and evidence plates, and four objectives that unlock envelope by envelope until you can name the killer. It opens in any browser, works offline, and is yours to keep forever.",
              },
              {
                question: "Is my case really unique?",
                answer:
                  "Genuinely one-of-one. Your case is written from scratch when you order it — its people, its documents, and its solution have never existed before and will never be repeated. No two cases we've ever made share a setting, a cast, or a killer.",
              },
              {
                question: "When do I get it?",
                answer:
                  "Your case is written and checked after you order. You'll get an email when it's ready — usually within the hour. There's a status page you can watch, but the email will find you.",
              },
              {
                question: "Is it actually solvable?",
                answer:
                  "Every case is independently tested before it ships: if the killer can't be identified from the documents alone, it never reaches you. No outside knowledge, no guessing, no trick answers — and a real twist. The obvious suspect never did it.",
              },
              {
                question: "How long does it take to solve?",
                answer:
                  "Most detectives close their case in about 90 minutes — one long evening, or two shorter sittings. The four objectives give you natural break points, and hints are there if you're stuck.",
              },
              {
                question: "Can I play with someone else?",
                answer:
                  "It's built for one and excellent for two — one person reads aloud while the other works the objectives. The contradictions are easier to catch when you talk them through.",
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
            <BuyButton light />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
