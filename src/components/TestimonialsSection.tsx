import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface RealTestimonial {
  star_rating: number;
  testimonial: string | null;
  best_part: string | null;
  display_name: string | null;
}

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation();
  const [realTestimonials, setRealTestimonials] = useState<RealTestimonial[]>([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from("mystery_feedback" as any)
        .select("star_rating, testimonial, best_part, display_name")
        .eq("is_public", true)
        .gte("star_rating", 4)
        .order("created_at", { ascending: false })
        .limit(6);

      if (data && data.length > 0) {
        const withContent = (data as RealTestimonial[]).filter(
          (d) => d.testimonial || d.best_part
        );
        setRealTestimonials(withContent);
      }
    };

    fetchTestimonials();
  }, []);

  const hardcodedTestimonials = [1, 2, 3].map((i) => ({
    text: t(`testimonials.testimonial${i}.text`),
    author: t(`testimonials.testimonial${i}.author`),
    initial: ["J", "LB", "A"][i - 1],
    stars: 5,
  }));

  const displayList = (() => {
    if (realTestimonials.length >= 3) {
      return realTestimonials.slice(0, 6).map((r) => ({
        text: r.testimonial || r.best_part || "",
        author: r.display_name || "Mystery Maker Host",
        initial: (r.display_name || "M").charAt(0).toUpperCase(),
        stars: r.star_rating,
      }));
    }

    if (realTestimonials.length > 0) {
      const real = realTestimonials.map((r) => ({
        text: r.testimonial || r.best_part || "",
        author: r.display_name || "Mystery Maker Host",
        initial: (r.display_name || "M").charAt(0).toUpperCase(),
        stars: r.star_rating,
      }));
      const slotsToFill = 3 - real.length;
      return [...real, ...hardcodedTestimonials.slice(0, slotsToFill)];
    }

    return hardcodedTestimonials;
  })();

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl text-center mb-8 sm:mb-12"
          style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t("testimonials.title")}
        </h2>

        <div
          className={cn(
            "grid gap-4 sm:gap-6 lg:gap-8",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {displayList.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl p-4 sm:p-6"
              style={{
                backgroundColor: 'var(--color-charcoal)',
                border: '1px solid var(--color-cream-border)',
              }}
            >
              <div className="flex items-center space-x-1 mb-4">
                {Array.from({ length: 5 }, (_, star) => (
                  <svg
                    key={star}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: star < item.stars ? 'var(--color-red)' : 'var(--color-cream-faint)' }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mb-4 text-sm sm:text-base" style={{ color: 'var(--color-cream-muted)', fontFamily: 'var(--font-body)' }}>
                {item.text}
              </p>
              <div className="flex items-center">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: 'var(--color-red)' }}
                >
                  <span className="font-medium text-xs sm:text-sm" style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)' }}>
                    {item.initial}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)' }}>
                    {item.author}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
