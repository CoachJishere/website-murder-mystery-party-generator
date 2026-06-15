import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Palette, Users, UserCog, Printer } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const CANONICAL = "https://www.mysterymaker.party/custom-murder-mystery-party/";
const OG_IMAGE =
  "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true";

// The two questions here are mirrored 1:1 into the FAQPage schema below so the
// visible copy and the structured data never drift.
const FAQ = [
  {
    q: "Can I make a custom murder mystery?",
    a: "Yes. Mystery Maker builds a fully custom murder mystery from scratch around whatever you describe — a theme, a setting, an inside joke, or a real occasion like a birthday or office party. You tell the generator what you want, and it writes the plot, the suspects, the clues, and every character script to match. Nothing is pulled from a fixed catalogue of pre-written kits, so two parties never play the same game.",
  },
  {
    q: "How many guests can play?",
    a: "Any number. You set the guest count and the generator scales the cast to fit — intimate games for 4 to 6 players, dinner parties for 8 to 12, or large events for 20 or more. Every guest gets their own character with motives, secrets, and round-by-round scripts, and you can host extra guests as detectives if your group grows after you've built the game.",
  },
];

const FEATURES = [
  {
    icon: Palette,
    title: "Any theme you can imagine",
    body: "1920s speakeasy, haunted manor, space station, royal wedding — describe it and the story is written to fit. No generic, off-the-shelf plots.",
  },
  {
    icon: Users,
    title: "Built for your guest count",
    body: "Set the number of players and the cast scales to match, from 4-person dinners to 20+ events. Everyone gets a real role.",
  },
  {
    icon: UserCog,
    title: "Custom characters",
    body: "Each guest receives a tailored character with motives, secrets, and per-round scripts that lock into the larger mystery.",
  },
  {
    icon: Printer,
    title: "Instant printable kit",
    body: "Host guide, character booklets, clues, and invitations generate in minutes — ready to print or share digitally, no prep required.",
  },
];

export default function CustomMurderMysteryParty() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Helmet>
        <title>Custom Murder Mystery Party &amp; Game — Built for Your Guests | Mystery Maker</title>
        <meta
          name="description"
          content="Build a fully customizable murder mystery party game for any guest count. Custom themes, characters, and an instantly printable kit. Start in minutes."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={CANONICAL} />
        <meta
          property="og:title"
          content="Custom Murder Mystery Party & Game — Built for Your Guests"
        />
        <meta
          property="og:description"
          content="Fully customizable murder mystery games — any theme, any guest count, custom characters, instant printable kit."
        />
        <meta property="og:image" content={OG_IMAGE} />
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
              Custom Murder Mystery Party
            </h1>
            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed mb-8">
              A murder mystery written from scratch around your theme, your guests, and
              your occasion — not a pre-packaged kit. Generate the full printable game in
              minutes.
            </p>
            <Button
              asChild
              className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors"
            >
              <Link to="/mystery/create">
                Create Your Custom Mystery
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Body / customization explainer */}
        <section className="px-4 pb-16">
          <div className="max-w-3xl mx-auto prose prose-lg max-w-none">
            <p className="text-foreground leading-relaxed">
              Most murder mystery products hand you a fixed box: a set theme, a set number
              of characters, and a script that thousands of other hosts have already played.
              Mystery Maker works the other way around. You describe the party you actually
              want to throw, and the generator writes a brand-new mystery to fit it — plot,
              suspects, motives, clues, and every character script included.
            </p>

            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mt-12 mb-4">
              Design a Custom Murder Mystery Game for Any Group
            </h2>
            <p className="text-foreground leading-relaxed">
              Customization starts with the <strong>theme</strong>. A 1920s speakeasy, a
              haunted Victorian manor, a luxury cruise, a corporate retreat gone wrong, or
              something built entirely around an inside joke — if you can describe it, the
              story bends to match. There is no catalogue to pick from, so your game is one
              of a kind.
            </p>
            <p className="text-foreground leading-relaxed">
              Next comes <strong>guest count</strong>. You tell the generator how many people
              are playing and the cast scales to fit — a tight game for 4 to 6 at a dinner
              table, a lively party for 8 to 12, or a full event for 20 or more. Every player
              gets a genuine role in the mystery rather than a walk-on part, and extra guests
              can join as detectives if your numbers grow.
            </p>
            <p className="text-foreground leading-relaxed">
              Each <strong>character</strong> is custom-built: a backstory, private motives,
              secrets to guard, and round-by-round scripts that interlock with everyone else's
              so the mystery actually holds together. The accusations, alibis, and reveals are
              written to your cast, not retrofitted from a template.
            </p>
            <p className="text-foreground leading-relaxed">
              When it's ready, you get a complete <strong>printable kit</strong> — a host
              guide that walks you through running the night, individual character booklets,
              physical clues and evidence, and matching invitations. Print it all or share it
              digitally. From first prompt to finished game takes minutes, not weeks of
              planning.
            </p>
          </div>

          {/* Feature cards */}
          <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Icon className="h-6 w-6 text-[#C81400]" />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mid-page CTA */}
          <div className="max-w-3xl mx-auto mt-12 text-center">
            <Button
              asChild
              className="bg-[#C81400] hover:bg-[#A01000] text-white py-6 px-8 text-lg font-medium transition-colors"
            >
              <Link to="/mystery/create">
                Start Building Your Mystery
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-20 bg-[#000000]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-[#C81400] mb-8 text-center">
              Custom Murder Mystery FAQ
            </h2>
            <div className="space-y-8">
              {FAQ.map((item) => (
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
