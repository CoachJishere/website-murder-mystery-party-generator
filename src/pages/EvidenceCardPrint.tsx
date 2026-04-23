import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseEvidenceCards, type EvidenceCard } from "@/utils/evidenceCardUtils";

export default function EvidenceCardPrint() {
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get("packageId");
  const [cards, setCards] = useState<EvidenceCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageId) return;

    async function fetchData() {
      const { data, error } = await supabase
        .from("mystery_packages")
        .select("evidence_cards, evidence_card_images")
        .eq("id", packageId)
        .maybeSingle();

      if (error || !data) {
        console.error("Failed to load evidence cards:", error);
        setLoading(false);
        return;
      }

      const images = (data.evidence_card_images as any) || {};
      const markdown = typeof data.evidence_cards === "string" ? data.evidence_cards : "";
      setCards(parseEvidenceCards(markdown, images));
      setLoading(false);
    }

    fetchData();
  }, [packageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#2a2a3e] text-white">
        Loading evidence cards...
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#2a2a3e] text-white">
        No evidence card images found for this package.
      </div>
    );
  }

  return (
    <>
      {/* Screen UI */}
      <div className="no-print bg-[#1a1a2e] text-white p-6 text-center border-b border-white/10">
        <h1 className="text-2xl font-bold mb-2">Evidence Cards</h1>
        <p className="text-white/60 mb-4 text-sm">
          Each card prints on its own landscape A4 page.
        </p>
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-[#C81400] text-white rounded-lg font-medium hover:bg-[#A01000] transition-colors"
        >
          Print Evidence Cards
        </button>
      </div>

      {/* Cards */}
      <div className="ec-container">
        {cards.map((card, i) => (
          <div key={i} className="ec-page">
            <div className="ec-round">{card.round}</div>
            <div className="ec-image-frame">
              <img src={card.imageUrl} alt={card.round} className="ec-image" />
            </div>
            {card.description.split(/\n\n+/).map((para, pi) => (
              <p key={pi} className="ec-description">{para.replace(/\n/g, ' ').trim()}</p>
            ))}
            <div className="ec-footer">
              Card {i + 1} of {cards.length}
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
          color: #C81400;
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

        .ec-description {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          line-height: 1.55;
          color: #333;
          margin: 0 0 6px 0;
          flex-shrink: 0;
        }
        .ec-description:last-of-type {
          margin-bottom: 0;
        }

        .ec-footer {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 9px;
          color: #bbb;
          text-align: right;
          margin-top: 10px;
          flex-shrink: 0;
        }

        @media screen and (max-width: 768px) {
          .ec-container { padding: 16px 8px; gap: 24px; }
          .ec-page { width: 100%; height: auto; padding: 16px; }
          .ec-image-frame { aspect-ratio: 16 / 9; flex: none; }
          .ec-title { font-size: 18px; }
        }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .ec-container { display: block; padding: 0; background: white; }
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
          .ec-page:last-child { page-break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ec-round { color: #C81400 !important; }
          .ec-footer { color: #bbb !important; }
        }

        @page { size: A4 landscape; margin: 0; }
      `}</style>
    </>
  );
}
