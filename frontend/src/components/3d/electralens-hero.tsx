"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useHeroPointerTracking } from "./use-hero-pointer-tracking";
import { HeroFallback } from "./hero-fallback";
import { TiltCard } from "@/components/ui/tilt-card";
import { primaryComparison } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

// Dynamic client-only import of Three.js / R3F Canvas
const DynamicLionCapitalScene = dynamic(
  () => import("./lion-capital-scene").then((mod) => mod.LionCapitalScene),
  {
    ssr: false,
    loading: () => <HeroFallback reason="loading" />,
  }
);

// Framer Motion Variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
    },
  }),
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export function ElectraLensHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const trackingRef = useHeroPointerTracking(heroRef);
  const netChange = primaryComparison.additions - primaryComparison.deletions;

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 border-b border-[#E4E7EC]"
    >
      {/* OriginX Ambient Circular Background Blobs with Gentle Breathing Float */}
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          x: [0, 15, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-40 -left-40 w-[540px] h-[540px] rounded-full bg-[#FFF4EC] opacity-70 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          x: [0, -12, 0],
          y: [0, 15, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-20 right-0 w-[520px] h-[520px] rounded-full bg-[#EAF0FC] opacity-80 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN (lg:col-span-5 xl:col-span-4): Text & CTAs   */}
          {/* ======================================================== */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="lg:col-span-5 xl:col-span-4 flex flex-col items-start gap-6"
          >
            {/* Kicker Tag */}
            <motion.div variants={fadeInUp} custom={0} className="inline-flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[#475467] bg-[#F7F8FA] border border-[#E4E7EC] px-3.5 py-1 rounded-full flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#F07824]" />
                THE VERIFIABLE CIVIC INTELLIGENCE LAYER
              </span>
            </motion.div>

            {/* Caprasimo Display Heading */}
            <motion.h1
              variants={fadeInUp}
              custom={1}
              className="font-serif text-[40px] sm:text-[54px] lg:text-[60px] xl:text-[68px] leading-[0.98] tracking-[-0.02em] text-[#172033] font-normal m-0"
            >
              <span className="block">Every roll.</span>
              <span className="block text-[#2864DC]">One verifiable record.</span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              variants={fadeInUp}
              custom={2}
              className="m-0 max-w-[480px] text-base sm:text-lg leading-[1.6] text-[#475467] font-medium"
            >
              Give every electoral roll snapshot a verifiable public record. Examine additions
              and deletions, inspect statistical evidence, detect unusual anomalies, and
              independently verify publication integrity through one connected civic platform.
            </motion.p>

            {/* Action Buttons (OriginX Pills with Lift Physics) */}
            <motion.div
              variants={fadeInUp}
              custom={3}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/compare"
                  className="btn-pill btn-orange shadow-sm text-[#172033] group flex items-center gap-2"
                >
                  <span>Explore the live data</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/verify/PUB-2024-001"
                  className="btn-pill btn-outline hover:bg-[#172033] hover:text-white flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#14663F]" />
                  <span>Verify a publication</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Tricolor Proof Banner */}
            <motion.div
              variants={fadeInUp}
              custom={4}
              className="pt-6 border-t border-[#E4E7EC] w-full flex flex-wrap items-center gap-3 text-xs font-bold text-[#475467]"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F07824]" />
                <span>Public aggregate data</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2864DC]" />
                <span>Open methodology</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#14663F]" />
                <span>Private identities</span>
              </div>
            </motion.div>
          </motion.div>

          {/* ======================================================== */}
          {/* CENTER COLUMN (lg:col-span-3 xl:col-span-4): Freestanding */}
          {/* 3D Four-Lion Capital Sculpture (No outer box!)           */}
          {/* ======================================================== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-3 xl:col-span-4 relative flex flex-col items-center justify-center my-4 lg:my-0"
          >
            {/* Ambient Circular Aura Behind Freestanding Sculpture */}
            <div
              className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full bg-gradient-to-tr from-[#FFF4EC] via-[#EAF0FC] to-[#E7F6EE] opacity-75 blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            {/* Pure 3D Canvas without an enclosing box */}
            <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[520px] flex items-center justify-center">
              <DynamicLionCapitalScene trackingRef={trackingRef} />
            </div>
          </motion.div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN (lg:col-span-4 xl:col-span-4): Original Box */}
          {/* Roll Passport Card with Tilt Physics exactly like before */}
          {/* ======================================================== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 xl:col-span-4 relative min-h-[440px] flex items-center justify-center"
          >
            {/* Background Decorative Rings */}
            <div className="absolute w-[340px] h-[340px] rounded-full bg-[#EAF0FC] -top-6 -right-6 pointer-events-none opacity-80" />
            <div className="absolute w-[220px] h-[220px] rounded-full bg-[#FFF4EC] -bottom-8 -left-6 pointer-events-none opacity-70" />

            {/* Primary Roll Passport Card with 3D Tilt */}
            <TiltCard className="w-full max-w-[420px] rounded-[28px]">
              <div className="bg-white border border-[#E4E7EC] rounded-[28px] p-6 shadow-[0_30px_70px_-30px_rgba(23,32,51,0.25)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC]">
                  <span className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#475467]">
                    ROLL PASSPORT
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E7F6EE] text-[#14663F] font-mono text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14663F]" />
                    VERIFIED ANCHOR
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2864DC] block">
                    SYNTHETIC REVISION PAIR
                  </span>
                  <h3 className="text-xl font-bold text-[#172033] mt-0.5">
                    Q1 Draft &rarr; Q2 Final Roll
                  </h3>
                  <p className="text-xs text-[#475467] font-mono mt-0.5">
                    Constituency: Vidyanagar Assembly (SYN-VID-01)
                  </p>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#E4E7EC] text-center font-mono text-xs">
                  <div className="p-2 bg-[#FFF4EC] rounded-xl border border-[#FDE3CF]">
                    <span className="text-[9px] uppercase font-bold text-[#D9661A] block">Added</span>
                    <span className="text-base font-bold text-[#D9661A] mt-0.5 block">
                      +{formatNumber(primaryComparison.additions)}
                    </span>
                  </div>

                  <div className="p-2 bg-[#EAF0FC] rounded-xl border border-[#D0D5DD]">
                    <span className="text-[9px] uppercase font-bold text-[#2864DC] block">Deleted</span>
                    <span className="text-base font-bold text-[#2864DC] mt-0.5 block">
                      −{formatNumber(primaryComparison.deletions)}
                    </span>
                  </div>

                  <div className="p-2 bg-[#E7F6EE] rounded-xl border border-[#A6E1C4]">
                    <span className="text-[9px] uppercase font-bold text-[#14663F] block">Net Shift</span>
                    <span className="text-base font-bold text-[#14663F] mt-0.5 block">
                      +{formatNumber(netChange)}
                    </span>
                  </div>
                </div>

                {/* Cryptographic Hash Line */}
                <div className="space-y-1 font-mono text-[10px] text-[#475467]">
                  <div className="flex justify-between">
                    <span>prev:</span>
                    <span className="text-slate-500">51c4c5b5...3d8b06</span>
                  </div>
                  <div className="flex justify-between">
                    <span>hash:</span>
                    <span className="text-[#2864DC] font-bold">
                      7818c5a4...28119e
                    </span>
                  </div>
                </div>

                {/* Micro Event Chip */}
                <div className="pt-2 border-t border-[#E4E7EC] flex items-center justify-between text-[11px] text-[#475467]">
                  <span>event #03 · aggregate manifest</span>
                  <Link
                    href="/verify/PUB-2024-001"
                    className="text-[#F07824] hover:underline font-bold font-mono inline-flex items-center gap-1 group"
                  >
                    <span>inspect</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </TiltCard>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
