import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Murder Mystery Parallax Hero — Party Silhouettes v3
 *
 * Layers:
 * 0. Rich gradient sky
 * 1. Stars + moon
 * 2. Mansion silhouette with glowing windows
 * 3. Fog layer + chandelier
 * 4. Back-row party guests (detailed silhouettes)
 * 5. Foreground guests (large, partial, closest)
 * + Drifting fog wisps
 */

export default function MysteryRoomHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const layer1Y = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const layer2Y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const layer3Y = useTransform(scrollYProgress, [0, 1], ["0%", "45%"]);
  const layer4Y = useTransform(scrollYProgress, [0, 1], ["0%", "65%"]);
  const layer5Y = useTransform(scrollYProgress, [0, 1], ["0%", "85%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section ref={ref} className="relative h-[150vh] overflow-hidden">
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* Layer 0: Rich gradient sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1035] via-[#5a1a3a] via-[50%] to-[#c4623a]" />

        {/* Layer 1: Stars + moon */}
        <motion.div style={{ y: layer1Y }} className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2.5 + 0.5,
                height: Math.random() * 2.5 + 0.5,
                top: `${Math.random() * 45}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.1,
              }}
            />
          ))}
          <div className="absolute top-[10%] right-[18%] w-16 h-16 rounded-full bg-[#e8dcc8] opacity-25 shadow-[0_0_80px_30px_rgba(232,220,200,0.15)]" />
        </motion.div>

        {/* Layer 2: Mansion silhouette */}
        <motion.div style={{ y: layer2Y }} className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 500" className="w-full" preserveAspectRatio="none">
            <path
              d={`
                M0,500 L0,320
                L60,320 L60,280 L100,280 L100,250 L120,250 L120,220 L140,220 L140,250 L160,250 L160,280 L200,280 L200,320
                L280,320 L280,260 L300,260 L300,200 L310,200 L310,180 L340,150 L370,180 L380,180 L380,200 L390,200 L390,260 L410,260 L410,320
                L520,320 L520,240 L540,240 L540,180 L560,180 L560,140 L600,100 L640,140 L640,180 L660,180 L660,240 L680,240 L680,320
                L720,320 L720,160 L740,160 L740,120 L760,120 L760,80 L780,60 L800,80 L820,80 L820,120 L840,120 L840,160 L860,160 L860,320
                L960,320 L960,240 L980,240 L980,200 L1010,200 L1010,170 L1040,170 L1040,200 L1060,200 L1060,240 L1080,240 L1080,320
                L1160,320 L1160,280 L1200,280 L1200,230 L1220,230 L1220,200 L1250,180 L1280,200 L1280,230 L1300,230 L1300,280 L1340,280 L1340,320
                L1440,320 L1440,500 Z
              `}
              fill="#1a0e1e"
            />
            {/* Warm window glows */}
            {[
              [90, 290], [150, 290],
              [310, 230], [370, 230], [310, 270], [370, 270],
              [560, 200], [620, 200], [560, 260], [620, 260],
              [760, 130], [820, 130], [760, 180], [820, 180], [760, 240], [820, 240],
              [1000, 220], [1050, 220],
              [1220, 250], [1270, 250],
            ].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width={20} height={22} rx="1" fill="#d4a44a" opacity={0.08 + (i % 3) * 0.03} />
            ))}

            {/* Mysterious figure visible in one window */}
            <g transform="translate(760, 125)">
              {/* Head */}
              <ellipse cx="10" cy="5" rx="5" ry="6" fill="#1a0e1e" />
              {/* Shoulders */}
              <path d="M3,12 Q10,10 17,12 L17,22 L3,22 Z" fill="#1a0e1e" />
            </g>
          </svg>
        </motion.div>

        {/* Layer 3: Fog + chandelier */}
        <motion.div style={{ y: layer3Y, scale }} className="absolute bottom-0 left-0 right-0 top-0">
          <svg viewBox="0 0 1440 900" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Chandelier */}
            <g transform="translate(720, 40)">
              <line x1="0" y1="0" x2="0" y2="25" stroke="#1a0e1e" strokeWidth="2" />
              <path d="M-50,35 Q-30,25 0,25 Q30,25 50,35" fill="none" stroke="#1a0e1e" strokeWidth="2.5" />
              <line x1="-50" y1="35" x2="-50" y2="50" stroke="#1a0e1e" strokeWidth="1.5" />
              <line x1="-25" y1="28" x2="-25" y2="45" stroke="#1a0e1e" strokeWidth="1.5" />
              <line x1="25" y1="28" x2="25" y2="45" stroke="#1a0e1e" strokeWidth="1.5" />
              <line x1="50" y1="35" x2="50" y2="50" stroke="#1a0e1e" strokeWidth="1.5" />
              <line x1="0" y1="25" x2="0" y2="42" stroke="#1a0e1e" strokeWidth="1.5" />
              {/* Flames */}
              {[-50, -25, 0, 25, 50].map((cx, i) => (
                <g key={i}>
                  <ellipse cx={cx} cy={i === 2 ? 38 : (Math.abs(cx) === 50 ? 46 : 41)} rx="3" ry="5" fill="#d4a44a" opacity="0.2">
                    <animate attributeName="opacity" values="0.12;0.25;0.1;0.2;0.12" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                  </ellipse>
                </g>
              ))}
              <circle cx="0" cy="40" r="70" fill="#d4a44a" opacity="0.015" />
            </g>
          </svg>

          {/* Fog wisps — CSS animated */}
          <div className="absolute bottom-[30%] left-0 right-0 h-[25%] overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(232,220,200,0.4) 20%, rgba(232,220,200,0.6) 50%, rgba(232,220,200,0.4) 80%, transparent 100%)",
                animation: "fogDrift 12s ease-in-out infinite",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                background: "linear-gradient(90deg, transparent 10%, rgba(232,220,200,0.3) 30%, rgba(232,220,200,0.5) 60%, rgba(232,220,200,0.3) 90%, transparent 100%)",
                animation: "fogDrift2 16s ease-in-out infinite",
                animationDelay: "3s",
              }}
            />
          </div>
        </motion.div>

        {/* Layer 4: Party guests — back row (proper human silhouettes) */}
        <motion.div style={{ y: layer4Y, scale }} className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 380" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10081a" stopOpacity="0" />
                <stop offset="100%" stopColor="#10081a" />
              </linearGradient>
            </defs>

            {/* --- Group left: Woman in dress + man in suit talking --- */}
            <g transform="translate(180, 30)" fill="#150a1a">
              {/* Woman in elegant dress — updo hairstyle */}
              <path d="M0,-5 Q-2,-22 3,-28 Q8,-34 14,-32 Q20,-30 22,-22 Q24,-14 20,-8 Q16,-2 10,0 Q4,2 0,-5 Z" />
              {/* Updo bun */}
              <circle cx="12" cy="-34" r="6" />
              {/* Neck */}
              <path d="M6,0 L6,8 L14,8 L14,0" />
              {/* Dress — fitted top, flowing skirt */}
              <path d="M-4,8 Q0,6 6,8 L14,8 Q20,6 24,8 L22,50 Q24,80 40,180 L-20,180 Q-4,80 -2,50 Z" />
              {/* Arm holding clutch */}
              <path d="M22,20 Q30,25 32,35 L34,35 Q36,34 34,32 Q32,24 24,18" />

              {/* Man in suit — 40px to her right */}
              <g transform="translate(60, 5)">
                {/* Head — short hair, slightly angular */}
                <path d="M0,-2 Q-2,-18 2,-24 Q6,-30 12,-28 Q18,-26 20,-18 Q22,-10 18,-4 Q14,2 8,2 Q2,2 0,-2 Z" />
                {/* Neck + broad shoulders */}
                <path d="M6,2 L6,10 L14,10 L14,2" />
                <path d="M-12,14 Q0,8 10,10 L10,10 Q20,8 32,14 L30,50 L28,170 L-8,170 L-10,50 Z" />
                {/* Arm — holding wine glass */}
                <path d="M30,30 Q38,22 42,16 L42,12 Q42,8 44,8 L46,8 L46,12 Q44,14 44,16 Q38,24 32,32" />
                {/* Wine glass */}
                <ellipse cx="45" cy="6" rx="6" ry="2.5" fill="none" stroke="#150a1a" strokeWidth="1.5" />
              </g>
            </g>

            {/* --- Center: Mysterious woman with magnifying glass --- */}
            <g transform="translate(660, 45)" fill="#150a1a">
              {/* Head — wavy hair falling to shoulders */}
              <path d="M0,0 Q-3,-16 2,-24 Q7,-32 15,-30 Q23,-28 25,-18 Q27,-8 22,0 Q18,6 10,6 Q2,6 0,0 Z" />
              {/* Hair flowing down */}
              <path d="M-2,-10 Q-6,-4 -6,6 Q-6,16 -4,22 L0,8 Q-2,-2 0,-10" />
              <path d="M25,-10 Q28,-2 28,8 Q28,18 26,22 L22,8 Q24,-2 25,-10" />
              {/* Body — fitted jacket */}
              <path d="M-2,10 Q4,6 12,6 Q20,6 26,10 L24,40 L22,150 L2,150 L0,40 Z" />
              {/* Arm holding magnifying glass up */}
              <path d="M26,22 Q34,12 40,0 Q42,-4 44,-4" />
              {/* Magnifying glass */}
              <circle cx="48" cy="-10" r="10" fill="none" stroke="#150a1a" strokeWidth="2.5" />
              <line x1="42" y1="-2" x2="38" y2="4" stroke="#150a1a" strokeWidth="2.5" />
              {/* Glass lens glint */}
              <circle cx="48" cy="-10" r="8" fill="#d4a44a" opacity="0.04" />
            </g>

            {/* --- Right: Man looking over shoulder suspiciously + knife behind back --- */}
            <g transform="translate(1050, 35)" fill="#150a1a">
              {/* Head — turned slightly, hat/fedora */}
              <path d="M0,0 Q-2,-14 3,-22 Q8,-28 14,-26 Q20,-24 22,-16 Q24,-8 20,-2 Q16,4 10,4 Q4,4 0,0 Z" />
              {/* Fedora hat */}
              <path d="M-8,-18 Q-4,-28 6,-32 Q16,-36 24,-30 Q30,-24 28,-18 L-8,-18 Z" />
              <path d="M-12,-18 L32,-18 L30,-14 L-10,-14 Z" />
              {/* Body — trenchcoat */}
              <path d="M-4,8 Q4,4 12,4 Q20,4 26,8 L28,50 Q30,90 34,160 L-12,160 Q-8,90 -6,50 Z" />
              {/* Coat collar */}
              <path d="M2,8 L10,16 L18,8" fill="none" stroke="#150a1a" strokeWidth="2" />
              {/* Arm behind back — holding knife (sinister!) */}
              <path d="M-4,30 Q-12,35 -14,45 L-14,48" />
              {/* Knife */}
              <path d="M-16,48 L-14,48 L-12,70 L-15,70 Z" fill="#150a1a" />
              <path d="M-14.5,70 L-14.5,82 L-13,82 L-13,70" fill="#150a1a" />
            </g>

            {/* --- Far right: Couple whispering --- */}
            <g transform="translate(1260, 50)" fill="#150a1a">
              {/* Person leaning in */}
              <path d="M0,0 Q-2,-14 2,-20 Q6,-26 12,-24 Q18,-22 20,-14 Q22,-6 18,0 Q14,4 8,4 Q2,4 0,0 Z" />
              <path d="M-2,8 Q6,4 20,8 L18,140 L0,140 Z" />
              {/* Second person */}
              <g transform="translate(35, -5)">
                <path d="M0,0 Q-3,-16 2,-22 Q7,-28 14,-26 Q20,-24 22,-16 Q24,-6 18,2 Q12,6 6,6 Q0,4 0,0 Z" />
                {/* Hair bun */}
                <circle cx="14" cy="-28" r="5" />
                <path d="M0,10 Q8,6 22,10 L20,150 L-2,150 Z" />
                {/* Hand to mouth (whispering) */}
                <path d="M0,6 Q-6,4 -10,2" stroke="#150a1a" strokeWidth="2" fill="none" />
              </g>
            </g>

            {/* Solo figure in back — standing still, watching */}
            <g transform="translate(500, 75)" fill="#150a1a">
              <path d="M0,0 Q-2,-14 2,-20 Q6,-26 12,-24 Q18,-22 20,-14 Q22,-6 18,0 Q14,4 8,4 Q2,4 0,0 Z" />
              <path d="M-2,8 Q6,4 20,8 L18,120 L0,120 Z" />
              {/* Arms crossed */}
              <path d="M-2,25 Q4,32 18,25" fill="none" stroke="#150a1a" strokeWidth="3" />
            </g>

            {/* Ground plane */}
            <rect x="0" y="210" width="1440" height="170" fill="url(#floorFade)" />
          </svg>
        </motion.div>

        {/* Layer 5: Foreground guests (large, cropped at edges) */}
        <motion.div style={{ y: layer5Y, scale }} className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 450" className="w-full" preserveAspectRatio="none">
            {/* Left foreground — woman in evening gown, seen from behind */}
            <g transform="translate(-30, 10)" fill="#0e0614">
              {/* Head — elegant updo */}
              <path d="M60,30 Q55,8 62,0 Q70,-8 80,-6 Q90,-4 93,8 Q96,20 90,30 Q84,38 75,38 Q66,38 60,30 Z" />
              <circle cx="78" cy="-8" r="8" />
              {/* Neck + bare shoulders (evening gown) */}
              <path d="M68,38 L68,52 L82,52 L82,38" />
              <path d="M40,60 Q55,48 68,52 L82,52 Q95,48 110,60 L108,120 Q112,220 130,450 L20,450 Q38,220 42,120 Z" />
              {/* Arm at side holding wine glass */}
              <path d="M108,80 Q115,90 118,110 L120,115" />
              {/* Wine glass */}
              <ellipse cx="122" cy="118" rx="8" ry="3" fill="none" stroke="#0e0614" strokeWidth="2" />
              <line x1="122" y1="121" x2="122" y2="135" stroke="#0e0614" strokeWidth="1.5" />
            </g>

            {/* Right foreground — man in tuxedo, partial view */}
            <g transform="translate(1300, 0)" fill="#0e0614">
              {/* Head — slicked back hair */}
              <path d="M60,25 Q58,6 64,-2 Q70,-10 80,-8 Q90,-6 94,6 Q98,18 92,28 Q86,36 76,38 Q66,38 60,25 Z" />
              {/* Tuxedo body */}
              <path d="M40,48 Q58,38 76,38 Q94,38 112,48 L108,120 Q114,260 130,450 L22,450 Q38,260 44,120 Z" />
              {/* Lapel detail */}
              <path d="M65,48 L76,68 L87,48" fill="none" stroke="#0e0614" strokeWidth="2.5" />
              {/* Bow tie hint */}
              <path d="M70,50 L76,54 L82,50 L76,46 Z" />
            </g>

            {/* Ground */}
            <rect x="0" y="380" width="1440" height="70" fill="#0e0614" />
          </svg>
        </motion.div>

        {/* Red accent — single blood drop/drip on the floor between layers */}
        <motion.div style={{ y: layer4Y }} className="absolute bottom-[22%] left-[52%] z-[5]">
          <div className="w-3 h-3 rounded-full bg-[#8B1538] opacity-30 shadow-[0_0_12px_4px_rgba(139,21,56,0.2)]" />
          <div className="w-1.5 h-6 bg-[#8B1538] opacity-20 rounded-b-full mx-auto -mt-1" />
        </motion.div>

        {/* Text overlay */}
        <motion.div
          style={{ y: textY, opacity }}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="text-center px-6">
            <h1 className="text-5xl md:text-8xl font-bold text-white mb-6 drop-shadow-2xl font-display">
              Create Murder Mystery
              <br />
              Parties in Minutes
            </h1>
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto drop-shadow-lg font-inter">
              Design custom mysteries exactly how you want them —
              any theme, any characters, any setting.
            </p>
            <div className="mt-12 animate-bounce text-white/30 text-sm tracking-widest uppercase">
              scroll to explore
            </div>
          </div>
        </motion.div>

      </div>

      <style>{`
        @keyframes fogDrift {
          0%, 100% { transform: translateX(-5%); }
          50% { transform: translateX(5%); }
        }
        @keyframes fogDrift2 {
          0%, 100% { transform: translateX(8%); }
          50% { transform: translateX(-8%); }
        }
      `}</style>
    </section>
  );
}
