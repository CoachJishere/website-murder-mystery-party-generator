
import { useEffect } from "react";
import Head from "@/components/Head";
import { Link } from "react-router-dom";

const FONTS = [
  {
    name: "Playfair Display",
    label: "Playfair Display (current)",
    src: null, // already loaded via Google Fonts
  },
  {
    name: "Abril Fatface",
    label: "Abril Fatface",
    src: "/fonts/Abril_Fatface/AbrilFatface-Regular.ttf",
  },
  {
    name: "Alfa Slab One",
    label: "Alfa Slab One",
    src: "/fonts/Alfa_Slab_One/AlfaSlabOne-Regular.ttf",
  },
  {
    name: "Bowlby One SC",
    label: "Bowlby One SC",
    src: "/fonts/Bowlby_One_SC/BowlbyOneSC-Regular.ttf",
  },
  {
    name: "Dela Gothic One",
    label: "Dela Gothic One",
    src: "/fonts/Dela_Gothic_One/DelaGothicOne-Regular.ttf",
  },
  {
    name: "Josefin Sans",
    label: "Josefin Sans",
    src: "/fonts/Josefin_Sans/JosefinSans-VariableFont_wght.ttf",
  },
  {
    name: "Jost",
    label: "Jost",
    src: "/fonts/Jost/Jost-VariableFont_wght.ttf",
  },
];

const CREAM = "#F5F0E8";
const RED = "#FF6B6B";
const BLACK = "#000000";

const FontPreview = () => {
  useEffect(() => {
    // Load all custom fonts via FontFace API
    FONTS.forEach((font) => {
      if (!font.src) return;
      const face = new FontFace(font.name, `url(${font.src})`);
      face.load().then((loaded) => {
        document.fonts.add(loaded);
      });
    });
  }, []);

  return (
    <div style={{ backgroundColor: BLACK, minHeight: "100vh", padding: "2rem" }}>
      <Head title="Font Preview" description="Compare heading fonts" />

      <div className="fixed bottom-4 right-4 z-[100]">
        <Link
          to="/dark-preview"
          className="px-4 py-2 rounded-full shadow-lg text-sm font-medium no-underline"
          style={{ backgroundColor: CREAM, color: BLACK }}
        >
          Back to Dark Preview &rarr;
        </Link>
      </div>

      <h1
        className="text-center mb-12 text-lg font-inter"
        style={{ color: CREAM }}
      >
        Font Comparison — Heading Fonts
      </h1>

      <div className="max-w-5xl mx-auto space-y-12">
        {FONTS.map((font) => (
          <div
            key={font.name}
            style={{
              borderBottom: `1px solid rgba(245,240,232,0.1)`,
              paddingBottom: "2.5rem",
            }}
          >
            {/* Font label */}
            <p
              className="text-sm font-inter mb-4"
              style={{ color: RED }}
            >
              {font.label}
            </p>

            {/* Hero headline */}
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 tracking-tight leading-tight"
              style={{ fontFamily: `"${font.name}", serif`, color: CREAM }}
            >
              Create Murder Mystery Parties in Minutes
            </h2>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl font-inter"
              style={{ color: "rgba(245,240,232,0.7)" }}
            >
              Design custom mysteries exactly how you want them - any theme, any characters, any setting.
            </p>

            {/* Smaller heading sample */}
            <h3
              className="text-2xl sm:text-3xl font-bold mt-6"
              style={{ fontFamily: `"${font.name}", serif`, color: CREAM }}
            >
              Everything You Need Included
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FontPreview;
