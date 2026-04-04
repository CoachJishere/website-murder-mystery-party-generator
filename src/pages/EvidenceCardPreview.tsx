import React from "react";

/**
 * Preview page for evidence card print layout.
 * Visit /evidence-card-preview to see the A4 composition.
 * Big image, title, description only — implications stay in the host guide.
 */

const sampleCards = [
  {
    round: "Evidence — Round 2",
    title: "Threatening Letters Found in Lord Aldric's Safe",
    description:
      "Correspondence with each member of his inner circle reveals Lord Aldric's systematic manipulation and control. The letters show he had been threatening, blackmailing, and controlling everyone around him. One particularly ominous letter to Morgana reads: 'I know what you're planning. It won't work.' Multiple people had strong reasons to want Lord Aldric dead.",
    imageUrl: "https://placehold.co/1200x800/1a1a2e/e8dcc8?text=Evidence+Photo+%E2%80%94+Round+2&font=playfair-display",
  },
  {
    round: "Evidence — Round 3",
    title: "Shattered Crystal Vial Fragments from the Fireplace",
    description:
      "Analyzed to contain traces of both Nightshade Essence and Basilisk Venom, with residual magical energy suggesting memory magic was used. This deadly combination required both advanced knowledge of rare poisons and sophisticated memory magic to bypass Lord Aldric's paranoid defenses.",
    imageUrl: "https://placehold.co/1200x800/1a1a2e/e8dcc8?text=Evidence+Photo+%E2%80%94+Round+3&font=playfair-display",
  },
  {
    round: "Evidence — Round 4",
    title: "Sebastian Silverquill's Personal Journal Entry",
    description:
      "Discovered hidden in the manor's library, the journal details Sebastian's final conversation with Lord Aldric about 'the moral weight of what we document.' The entry proves Sebastian was in the manor that night and had a private meeting with Lord Aldric shortly before the murder.",
    imageUrl: "https://placehold.co/1200x800/1a1a2e/e8dcc8?text=Evidence+Photo+%E2%80%94+Round+4&font=playfair-display",
  },
];

export default function EvidenceCardPreview() {
  return (
    <>
      {/* Screen UI */}
      <div className="no-print bg-[#1a1a2e] text-white p-6 text-center border-b border-white/10">
        <h1 className="text-2xl font-bold mb-2">Evidence Card Print Preview</h1>
        <p className="text-white/60 mb-4 text-sm">
          Each card prints on its own A4 page. Image dominant, text minimal.
        </p>
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-[#8B1538] text-white rounded-lg font-medium hover:bg-[#a01d45] transition-colors"
        >
          Print Evidence Cards
        </button>
      </div>

      {/* Cards */}
      <div className="ec-container">
        {sampleCards.map((card, i) => (
          <div key={i} className="ec-page">
            {/* Round label — top of card */}
            <div className="ec-round">{card.round}</div>

            {/* Image — takes up most of the card */}
            <div className="ec-image-frame">
              <img src={card.imageUrl} alt={card.title} className="ec-image" />
            </div>

            {/* Title */}
            <h2 className="ec-title">{card.title}</h2>

            {/* Description */}
            <p className="ec-description">{card.description}</p>

            {/* Minimal footer */}
            <div className="ec-footer">
              Card {i + 1} of {sampleCards.length}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .ec-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          padding: 40px 20px;
          background: #2a2a3e;
          min-height: 100vh;
        }

        .ec-page {
          width: 297mm;
          height: 210mm;
          max-width: 100%;
          background: #fff;
          padding: 10mm 14mm 8mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }

        .ec-round {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #8B1538;
          margin-bottom: 10px;
        }

        .ec-image-frame {
          width: 100%;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          border-radius: 4px;
          background: #f0ece4;
          margin-bottom: 12px;
        }

        .ec-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .ec-title {
          font-family: 'Playfair Display', 'Georgia', serif;
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
          line-height: 1.25;
          flex-shrink: 0;
        }

        .ec-description {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          line-height: 1.55;
          color: #333;
          margin: 0;
          flex-shrink: 0;
        }

        .ec-footer {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 9px;
          color: #bbb;
          text-align: right;
          margin-top: 10px;
          flex-shrink: 0;
        }

        /* ── Mobile ── */
        @media screen and (max-width: 768px) {
          .ec-container {
            padding: 16px 8px;
            gap: 24px;
          }
          .ec-page {
            width: 100%;
            height: auto;
            padding: 16px;
          }
          .ec-image-frame {
            aspect-ratio: 3 / 2;
            flex: none;
          }
          .ec-title {
            font-size: 18px;
          }
        }

        /* ── Print ── */
        @media print {
          .no-print { display: none !important; }

          body { margin: 0; padding: 0; background: white; }

          .ec-container {
            display: block;
            padding: 0;
            background: white;
          }

          .ec-page {
            width: 100%;
            height: 210mm;
            max-height: 210mm;
            padding: 8mm 12mm 6mm;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
            overflow: hidden;
          }

          .ec-page:last-child {
            page-break-after: auto;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .ec-round { color: #8B1538 !important; }
          .ec-footer { color: #bbb !important; }
        }

        @page {
          size: A4 landscape;
          margin: 0;
        }
      `}</style>
    </>
  );
}
