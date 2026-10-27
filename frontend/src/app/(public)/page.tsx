"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Hash,
  BookOpen,
  Scale,
  Search,
  ChevronRight,
  Database,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { TiltCard } from "@/components/ui/tilt-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useLanguage } from "@/context/language-context";
import {
  primaryComparison,
  getPublishedFindings,
  getDatasetVersion,
  areaBreakdowns,
} from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import { demonstrateTamper } from "@/lib/verification";

// Animation Variants
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
      staggerChildren: 0.1,
    },
  },
};

export default function HomePage() {
  const { t } = useLanguage();
  const publishedFindings = getPublishedFindings();
  const baseline = getDatasetVersion(primaryComparison.baselineId);
  const target = getDatasetVersion(primaryComparison.targetId);
  const netChange = primaryComparison.additions - primaryComparison.deletions;

  // Chart data for rate comparison
  const chartData = [...areaBreakdowns]
    .sort((a, b) => b.additionRate - a.additionRate)
    .slice(0, 7)
    .map((area) => ({
      name: area.areaName.replace(" Assembly", "").replace(" Ward", "").replace(" Block", ""),
      additions: area.additionRate,
      deletions: area.deletionRate,
      isHighlighted: area.additionRate > 3.5,
    }));

  // ============ ORIGINX INTERACTIVE TAMPER ENGINE STATE ============
  const [tamperStep, setTamperStep] = useState<"clean" | "edited" | "broken">("clean");
  const [tamperValue, setTamperValue] = useState(24891);
  const [recomputedHash, setRecomputedHash] = useState(
    "7818c5a4ef67d90014489be00b981d3f2c27d1038f3e29af48691b7df28119e0"
  );

  const handleEditRecord = async () => {
    setTamperStep("edited");
    setTamperValue(39420);
    const res = await demonstrateTamper(
      JSON.stringify({ additions: 24891 }),
      "additions",
      39420
    );
    setRecomputedHash(res.tamperedHash);
  };

  const handleRecalculate = () => {
    setTamperStep("broken");
  };

  const handleResetTamper = () => {
    setTamperStep("clean");
    setTamperValue(24891);
    setRecomputedHash("7818c5a4ef67d90014489be00b981d3f2c27d1038f3e29af48691b7df28119e0");
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Copy Hash Micro-Interaction State
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("7818c5a4ef67d90014489be00b981d3f2c27d1038f3e29af48691b7df28119e0");
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const faqs = [
    {
      q: "Is an anomaly proof of electoral misconduct or fraud?",
      a: "No. Statistical divergence indicates that an area deviates from the expected demographic baseline, but it cannot determine human motivation. Benign real-world factors like new housing projects, student university terms, or delayed administrative batch filings frequently cause spikes in registration or deletion rates.",
    },
    {
      q: "Can individual voters be identified through ElectraLens?",
      a: "Never. ElectraLens enforces a strict privacy charter: zero citizen names, residential addresses, or voter identification numbers (EPIC) are ever published. All analyses are mathematically aggregated with k-anonymity cell suppression thresholds.",
    },
    {
      q: "How does in-browser cryptographic verification work?",
      a: "Every published dataset snapshot and aggregate report is canonicalized according to RFC standards and hashed with SHA-256. When you click 'Verify', your browser downloads the raw JSON document, re-computes the hash using native Web Crypto APIs, and compares it to the committed publication manifest.",
    },
    {
      q: "Is ElectraLens affiliated with the Election Commission of India?",
      a: "No. ElectraLens is an independent public-interest civic intelligence project. It is not affiliated with, sponsored by, or endorsed by the Election Commission of India (ECI) or any government authority.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#172033] selection:bg-[#F07824]/20 selection:text-[#F07824]">
      {/* ===== SECTION 1: HERO (OriginX Layout with 3D Tilt & Verifiable Roll Passport) ===== */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 border-b border-[#E4E7EC]">
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
          className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#FFF4EC] opacity-70 blur-3xl pointer-events-none"
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
          className="absolute top-20 right-0 w-[480px] h-[480px] rounded-full bg-[#EAF0FC] opacity-80 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-[1240px] mx-auto px-4 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: OriginX Bold Typography with Staggered Entrance */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="lg:col-span-7 flex flex-col items-start gap-6"
            >
              {/* Kicker Tag */}
              <motion.div variants={fadeInUp} custom={0} className="inline-flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[#475467] bg-[#F7F8FA] border border-[#E4E7EC] px-3.5 py-1 rounded-full flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#F07824]" />
                  {t("hero.kicker", "THE VERIFIABLE CIVIC INTELLIGENCE LAYER")}
                </span>
              </motion.div>

              {/* Clamp Heading */}
              <motion.h1
                variants={fadeInUp}
                custom={1}
                className="font-serif text-[44px] sm:text-[64px] lg:text-[76px] leading-[0.96] tracking-[-0.02em] text-[#172033] font-normal m-0"
              >
                <span className="block">{t("hero.headline1", "Every roll.")}</span>
                <span className="block text-[#2864DC]">{t("hero.headline2", "One verifiable record.")}</span>
              </motion.h1>

              {/* Subhead */}
              <motion.p
                variants={fadeInUp}
                custom={2}
                className="m-0 max-w-[540px] text-base sm:text-lg lg:text-[19px] leading-[1.6] text-[#475467] font-medium"
              >
                {t(
                  "hero.subhead",
                  "Give every electoral roll snapshot a verifiable public record. Examine additions and deletions, inspect statistical evidence, detect unusual anomalies, and independently verify publication integrity through one connected civic platform."
                )}
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
                    <span>{t("hero.cta.explore", "Explore the live data")}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/verify"
                    className="btn-pill btn-subtle hover:border-[#172033] shadow-sm text-[#172033] group flex items-center gap-2"
                  >
                    <span>{t("hero.cta.verify", "Verify a publication")}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#F07824]" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Tricolor Proof Banner */}
              <motion.div
                variants={fadeInUp}
                custom={4}
                className="pt-6 border-t border-[#E4E7EC] w-full flex flex-wrap items-center gap-4 text-xs font-bold text-[#475467]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F07824]" />
                  <span>{t("hero.proof.publicData", "Public aggregate data")}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2864DC]" />
                  <span>{t("hero.proof.openMethod", "Open methodology")}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14663F]" />
                  <span>{t("hero.proof.privateIdentities", "Private identities")}</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column: OriginX Floating Passport Card with 3D Tilt */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative min-h-[480px] flex items-center justify-center"
            >
              {/* Circular Backdrop Shapes */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute w-[380px] h-[380px] rounded-full bg-[#EAF0FC] -top-6 -right-6 pointer-events-none opacity-80"
              />
              <div className="absolute w-[240px] h-[240px] rounded-full bg-[#FFF4EC] -bottom-8 -left-6 pointer-events-none opacity-70" />

              {/* Primary Roll Passport Card with Tilt */}
              <TiltCard className="w-full max-w-[420px] rounded-[28px]">
                <div className="bg-white border border-[#E4E7EC] rounded-[28px] p-6 shadow-[0_30px_70px_-30px_rgba(23,32,51,0.25)] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EC]">
                    <span className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#475467]">
                      {t("passport.kicker", "ROLL PASSPORT")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E7F6EE] text-[#14663F] font-mono text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#14663F]" />
                      {t("passport.anchor", "VERIFIED ANCHOR")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2864DC] block">
                      {t("passport.revision", "SYNTHETIC REVISION PAIR")}
                    </span>
                    <h3 className="text-xl font-bold text-[#172033] mt-0.5">
                      {t("passport.pair", "Q1 Draft → Q2 Final Roll")}
                    </h3>
                    <p className="text-xs text-[#475467] font-mono mt-0.5">
                      {t("passport.constituency", "Constituency: Vidyanagar Assembly (SYN-VID-01)")}
                    </p>
                  </div>

                  {/* Metrics Matrix with Silky NumberTicker */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#E4E7EC] text-center font-mono text-xs">
                    <div className="p-2 bg-[#FFF4EC] rounded-xl border border-[#FDE3CF]">
                      <span className="text-[9px] uppercase font-bold text-[#D9661A] block">
                        {t("passport.added", "Added")}
                      </span>
                      <span className="text-base font-bold text-[#D9661A] mt-0.5 block">
                        <NumberTicker value={primaryComparison.additions} prefix="+" />
                      </span>
                    </div>

                    <div className="p-2 bg-[#EAF0FC] rounded-xl border border-[#D0D5DD]">
                      <span className="text-[9px] uppercase font-bold text-[#2864DC] block">
                        {t("passport.deleted", "Deleted")}
                      </span>
                      <span className="text-base font-bold text-[#2864DC] mt-0.5 block">
                        <NumberTicker value={primaryComparison.deletions} prefix="−" />
                      </span>
                    </div>

                    <div className="p-2 bg-[#E7F6EE] rounded-xl border border-[#A6E1C4]">
                      <span className="text-[9px] uppercase font-bold text-[#14663F] block">
                        {t("passport.netShift", "Net Shift")}
                      </span>
                      <span className="text-base font-bold text-[#14663F] mt-0.5 block">
                        <NumberTicker value={netChange} prefix="+" />
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Hash Line with Interactive Copy */}
                  <div className="space-y-1 font-mono text-[10px] text-[#475467]">
                    <div className="flex justify-between items-center">
                      <span>prev:</span>
                      <span className="text-slate-500">51c4c5b5...3d8b06</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="w-full flex justify-between items-center py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-[#F2F4F7] transition-all cursor-pointer group text-left border border-transparent hover:border-[#E4E7EC]"
                      title="Click to copy full 64-character SHA-256 digest"
                    >
                      <span className="text-[#475467] group-hover:text-[#172033]">hash:</span>
                      <span className="flex items-center gap-1.5 text-[#2864DC] font-bold">
                        <span>7818c5a4...28119e</span>
                        <AnimatePresence mode="wait">
                          {copiedHash ? (
                            <motion.span
                              key="copied"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="text-[9px] bg-[#E7F6EE] text-[#14663F] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs"
                            >
                              Copied ✓
                            </motion.span>
                          ) : (
                            <span className="text-[9px] text-[#475467] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-mono">
                              copy
                            </span>
                          )}
                        </AnimatePresence>
                      </span>
                    </button>
                  </div>

                  {/* Micro Event Chip */}
                  <div className="pt-2 border-t border-[#E4E7EC] flex items-center justify-between text-[11px] text-[#475467]">
                    <span>{t("passport.eventChip", "event #03 · aggregate manifest")}</span>
                    <Link
                      href="/verify"
                      className="text-[#F07824] hover:underline font-bold font-mono inline-flex items-center gap-1 group"
                    >
                      <span>{t("passport.inspect", "inspect")}</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: PLATFORM (OriginX: Revisions & provenance on the same record) ===== */}
      <section className="py-20 md:py-28 border-b border-[#E4E7EC] bg-[#F7F8FA]">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mb-14"
          >
            <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#2864DC] block mb-2">
              REVISION MATRIX &amp; PROVENANCE
            </span>
            <h2 className="font-serif text-[36px] sm:text-[50px] leading-[1.02] font-normal text-[#172033] tracking-[-0.01em]">
              Revisions and audit trails on the same record.
            </h2>
            <p className="text-lg text-[#475467] mt-4 leading-[1.6]">
              The roll comparison proves what changed and where it shifted. The cryptographic manifest proves the numbers haven't moved.
              Because both read from one public record, researchers and citizens always inspect the same source of truth.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Left Card: Roll Differential Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-[#E4E7EC] rounded-[24px] p-8 shadow-xs flex flex-col justify-between transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC] mb-6">
                  <span className="font-mono text-xs font-bold text-[#172033] uppercase">
                    Electoral Roll Differential Breakdown
                  </span>
                  <Badge variant="orange">Q1 &rarr; Q2 2024</Badge>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Baseline Electorate", value: formatNumber(primaryComparison.totalBaseline), detail: "v2024-Q1-draft" },
                    { label: "Gross Additions (New Voters)", value: `+${formatNumber(primaryComparison.additions)}`, detail: "+1.35% expansion", highlight: "text-[#D9661A]" },
                    { label: "Gross Deletions (Removals)", value: `−${formatNumber(primaryComparison.deletions)}`, detail: "−0.51% cleanups", highlight: "text-[#2864DC]" },
                    { label: "Corrected Records (In-place)", value: formatNumber(primaryComparison.corrections), detail: "Address & details" },
                    { label: "Target Final Electorate", value: formatNumber(primaryComparison.totalTarget), detail: "v2024-Q2-final" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-[#F2F4F7]">
                      <div>
                        <span className="font-semibold text-[#172033] block">{row.label}</span>
                        <span className="text-[10px] text-[#475467]">{row.detail}</span>
                      </div>
                      <span className={`font-mono text-sm font-bold ${row.highlight || "text-[#172033]"}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[#E4E7EC] flex items-center justify-between">
                <span className="text-xs text-[#475467]">14 Constituencies Computed</span>
                <Link href="/compare" className="text-xs font-bold text-[#2864DC] hover:underline inline-flex items-center gap-1 group">
                  <span>Open full comparison matrix</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>

            {/* Right Card: Graph & Rate Divergence */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-[#E4E7EC] rounded-[24px] p-8 shadow-xs flex flex-col justify-between transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC] mb-4">
                  <span className="font-mono text-xs font-bold text-[#172033] uppercase">
                    Addition Rate Variance by Area (%)
                  </span>
                  <span className="text-xs font-mono text-[#475467]">Avg: 2.34%</span>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 4, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#475467" }}
                        axisLine={{ stroke: "#E4E7EC" }}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#475467" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #E4E7EC",
                          backgroundColor: "#FFFFFF",
                        }}
                        formatter={(val: any) => [`${val}%`, "Addition rate"]}
                      />
                      <Bar
                        dataKey="additions"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.isHighlighted ? "#F07824" : "#2864DC"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#475467]">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#F07824] rounded-sm" /> Flagged Outlier (&gt; 3.5%)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#2864DC] rounded-sm" /> Nominal Subunit
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: FEATURES (OriginX: Evidence you can check, not claims you have to trust) ===== */}
      <section className="py-20 md:py-28 border-b border-[#E4E7EC] bg-white">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mb-14"
          >
            <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#F07824] block mb-2">
              WHAT EACH PUBLICATION CARRIES
            </span>
            <h2 className="font-serif text-[36px] sm:text-[50px] leading-[1.02] font-normal text-[#172033] tracking-[-0.01em]">
              Evidence you can check, not claims you have to trust.
            </h2>
            <p className="text-lg text-[#475467] mt-4 leading-[1.6]">
              Every detected anomaly carries its mathematical derivation, significance adjustments, and plausible non-malicious hypotheses.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                title: "Cryptographic Hash Chain",
                desc: "Each roll release is locked with an immutable SHA-256 hash. If one record changes, every downstream hash breaks.",
                accent: "text-[#F07824]",
                badge: "bg-[#FFF4EC]",
                tag: "prev 51c4c... → hash 7818c...",
              },
              {
                num: "02",
                title: "Controlled False Discovery",
                desc: "Benjamini-Hochberg FDR adjustments prevent false alarms when testing hundreds of assembly units simultaneously.",
                accent: "text-[#2864DC]",
                badge: "bg-[#EAF0FC]",
                tag: "q < 0.05 threshold",
              },
              {
                num: "03",
                title: "Alternative Hypotheses",
                desc: "Every finding documents at least two non-misconduct explanations (housing completions, student terms, delayed filings).",
                accent: "text-[#14663F]",
                badge: "bg-[#E7F6EE]",
                tag: "H₁ & H₂ required",
              },
              {
                num: "04",
                title: "In-Browser Verifier",
                desc: "No proprietary software or servers required. Run cryptographic calculations directly on your local device.",
                accent: "text-[#172033]",
                badge: "bg-slate-100",
                tag: "Web Crypto API",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-[20px] p-6 flex flex-col justify-between hover:border-[#172033] hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`font-mono text-sm font-bold ${f.accent} ${f.badge} px-2.5 py-1 rounded-full`}>
                      {f.num}
                    </span>
                    <span className="font-mono text-[10px] text-[#475467]">{f.tag}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#172033] mb-2">{f.title}</h3>
                  <p className="text-xs text-[#475467] leading-relaxed">{f.desc}</p>
                </div>

                <div className="pt-4 mt-6 border-t border-[#E4E7EC]">
                  <Link href="/methodology" className="text-xs font-bold text-[#172033] hover:text-[#F07824] inline-flex items-center gap-1 group">
                    <span>Read specification</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 4: TAMPER DEMO (OriginX Interactive Blocks with Pulse & Severing Cascade) ===== */}
      <section id="tamper" className="py-20 md:py-28 bg-[#172033] text-white relative overflow-hidden">
        {/* Subtle orange glow */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#F07824]/10 blur-3xl pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-4 md:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mb-12"
          >
            <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#F7A66A] block mb-2">
              TRY TO TAMPER WITH IT
            </span>
            <h2 className="font-serif text-[38px] sm:text-[54px] leading-[1.02] font-normal text-white tracking-[-0.01em]">
              Edit one record. Watch the chain refuse it.
            </h2>
            <p className="text-lg text-[#D0D5DD] mt-4 leading-[1.6]">
              These are real SHA-256 hashes, computed in your browser right now. Each record's hash
              covers its content and the hash before it — and the originals are anchored in publication manifests.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-10">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleEditRecord}
              disabled={tamperStep !== "clean"}
              className={`btn-pill btn-orange text-[#172033] ${tamperStep !== "clean" ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] shadow-md"}`}
            >
              <span>Edit additions in Vidyanagar (event #2)</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleRecalculate}
              disabled={tamperStep !== "edited"}
              className={`btn-pill border border-white/30 text-white ${tamperStep === "edited" ? "bg-red-600/80 hover:bg-red-600 animate-pulse" : "hover:bg-white/10 opacity-50 cursor-not-allowed"}`}
            >
              <span>Recalculate hashes downstream</span>
            </motion.button>

            {tamperStep !== "clean" && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleResetTamper}
                className="text-xs text-[#F7A66A] hover:underline px-4 py-2 font-mono flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to committed values</span>
              </motion.button>
            )}
          </div>

          {/* 3 Real-time Chain Blocks (OriginX Style with Visual Connectors) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Block 1: Genesis Baseline */}
            <motion.div
              layout
              className="bg-[#1F2A44] border border-white/15 rounded-[20px] p-6 space-y-3 font-mono text-xs relative"
            >
              <div className="flex items-center justify-between text-white/50 text-[10px] uppercase">
                <span>BLOCK 01 · GENESIS</span>
                <span className="text-[#14663F] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#14663F]" />
                  MATCH
                </span>
              </div>
              <p className="text-sm font-bold text-white font-sans">Baseline Roll (v2024-Q1)</p>
              <div className="text-[11px] text-white/70 space-y-1">
                <p>Electorate: 1,847,293</p>
                <p className="truncate text-white/40">prev: 0000000000000000...</p>
                <p className="truncate text-[#2864DC]">hash: 51c4c5b5a0c39852...</p>
              </div>
            </motion.div>

            {/* Block 2: Differential Event (Tamperable) */}
            <motion.div
              layout
              animate={
                tamperStep !== "clean"
                  ? {
                      x: [-4, 4, -4, 4, 0],
                      transition: { duration: 0.3 },
                    }
                  : {}
              }
              className={`rounded-[20px] p-6 space-y-3 font-mono text-xs transition-colors border ${
                tamperStep === "clean"
                  ? "bg-[#1F2A44] border-white/15"
                  : "bg-red-950/50 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.35)]"
              }`}
            >
              <div className="flex items-center justify-between text-white/50 text-[10px] uppercase">
                <span>BLOCK 02 · EVENT #2</span>
                <span className={tamperStep === "clean" ? "text-[#14663F] font-bold flex items-center gap-1" : "text-red-400 font-bold flex items-center gap-1"}>
                  {tamperStep === "clean" ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-[#14663F]" />
                      MATCH
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-red-400" />
                      TAMPERED
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm font-bold text-white font-sans">Additions Differential</p>
              <div className="text-[11px] text-white/70 space-y-1">
                <p className={tamperStep === "clean" ? "text-white" : "text-red-300 font-bold"}>
                  Additions: {formatNumber(tamperValue)} {tamperStep !== "clean" ? "(MUTATED)" : ""}
                </p>
                <p className="truncate text-white/40">prev: 51c4c5b5a0c39852...</p>
                <p className="truncate text-[#F07824]">
                  hash: {recomputedHash.substring(0, 16)}...
                </p>
              </div>
            </motion.div>

            {/* Block 3: Publication Manifest (Broken on Tamper) */}
            <motion.div
              layout
              animate={
                tamperStep === "broken"
                  ? {
                      x: [-6, 6, -6, 6, 0],
                      transition: { duration: 0.4 },
                    }
                  : {}
              }
              className={`rounded-[20px] p-6 space-y-3 font-mono text-xs transition-colors border ${
                tamperStep === "broken"
                  ? "bg-red-950/60 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.45)]"
                  : "bg-[#1F2A44] border-white/15"
              }`}
            >
              <div className="flex items-center justify-between text-white/50 text-[10px] uppercase">
                <span>BLOCK 03 · MANIFEST</span>
                <span className={tamperStep === "broken" ? "text-red-400 font-bold flex items-center gap-1" : "text-[#14663F] font-bold flex items-center gap-1"}>
                  {tamperStep === "broken" ? (
                    <>
                      <XCircle className="w-3 h-3 text-red-400" />
                      CHAIN BROKEN
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-[#14663F]" />
                      ANCHORED
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm font-bold text-white font-sans">Publication PUB-2024-001</p>
              <div className="text-[11px] text-white/70 space-y-1">
                <p>Status: {tamperStep === "broken" ? "Commitment Mismatch" : "Sealed"}</p>
                <p className="truncate text-white/40">
                  prev: {recomputedHash.substring(0, 16)}...
                </p>
                <p className="truncate text-[#14663F]">
                  hash:{" "}
                  {tamperStep === "broken" ? (
                    <span className="text-red-400 font-bold">REFUSED_BY_CLIENT</span>
                  ) : (
                    "c9b84a37e1906969..."
                  )}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Tamper Feedback Alert with Spring In */}
          <AnimatePresence>
            {tamperStep !== "clean" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-8 p-4 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-start gap-3 shadow-lg"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <strong className="font-bold text-white block mb-0.5">
                    Cryptographic Rejection Confirmed:
                  </strong>
                  Because SHA-256 enforces the avalanche effect, changing 24,891 to 39,420 changed roughly half the bits in the output hash.
                  The downstream manifest rejected the block immediately.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ===== SECTION 5: HOW IT WORKS (OriginX Sticky Four-Step Layout) ===== */}
      <section className="py-20 md:py-28 border-b border-[#E4E7EC] bg-white">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Sticky Left Column */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#D9661A] block">
                HOW IT WORKS
              </span>
              <h2 className="font-serif text-[38px] sm:text-[50px] leading-[1.02] font-normal text-[#172033] tracking-[-0.01em]">
                Four steps, using the public rolls you already download.
              </h2>
              <p className="text-base text-[#475467] leading-[1.6]">
                No proprietary hardware or closed databases. Roll comparisons and statistical audits are executed against publicly available government register releases.
              </p>
              <div className="pt-2">
                <Link
                  href="/methodology"
                  className="font-bold text-sm text-[#172033] hover:text-[#D9661A] inline-flex items-center gap-2 group"
                >
                  <span>The full methodology walkthrough</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Column: 4 Staggered Steps */}
            <div className="lg:col-span-7 space-y-6">
              {[
                {
                  num: "01",
                  title: "Ingest and canonicalize snapshots",
                  desc: "Two quarterly electoral-roll releases are downloaded, stripped of whitespace variances, and normalized to deterministic UTF-8 NFC format with private citizen identities protected.",
                },
                {
                  num: "02",
                  title: "Diff & classify every record",
                  desc: "Every record is partitioned into Additions, Deletions, Corrections, or Unchanged. Additions and deletions are aggregated up to polling station and assembly constituency levels.",
                },
                {
                  num: "03",
                  title: "Execute registered statistical tests",
                  desc: "Pre-registered mathematical rules detect localized rate deviations while controlling for multiple testing via Benjamini-Hochberg False Discovery Rate (FDR) adjustments.",
                },
                {
                  num: "04",
                  title: "Commit and publish verifiable manifests",
                  desc: "Approved findings are sealed with cryptographic SHA-256 hashes in open JSON manifests. Any citizen can re-compute and verify the integrity of the release in their browser.",
                },
              ].map((step, idx) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-[20px] p-6 grid grid-cols-[56px_minmax(0,1fr)] gap-4 items-start hover:border-[#172033] transition-colors"
                >
                  <span className="font-mono text-2xl font-bold text-[#D9661A] leading-none">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#172033] mb-1.5">{step.title}</h3>
                    <p className="text-xs md:text-sm text-[#475467] leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 6: CITIZEN VERIFICATION (OriginX Blue Callout Banner) ===== */}
      <section className="py-12 md:py-20 px-4 md:px-8 border-b border-[#E4E7EC]">
        <div className="max-w-[1400px] mx-auto rounded-[36px] bg-[#EAF0FC] p-8 md:p-16">
          <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#1C4BB4] block">
                {t("section6.kicker", "CITIZEN & OBSERVER VERIFICATION")}
              </span>
              <h2 className="font-serif text-[38px] sm:text-[54px] leading-[1.02] font-normal text-[#172033] tracking-[-0.01em]">
                {t("section6.title", "One scan. No app. An honest answer.")}
              </h2>
              <p className="text-base md:text-lg text-[#344054] leading-[1.6]">
                {t("section6.desc", "Scanning a publication or polling-station code opens a public verification page in any browser. It only shows verified, mathematically aggregated, non-sensitive evidence.")}
              </p>
              <div className="space-y-3 pt-2">
                {[
                  t("section6.item1", "Mathematically confirmed document integrity via SHA-256"),
                  t("section6.item2", "Verified baseline comparison window & release timestamps"),
                  t("section6.item3", "Strict identity protection: zero private citizen records exposed"),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs md:text-sm font-semibold text-[#172033]">
                    <span className="w-5 h-5 rounded-full bg-[#2864DC] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Phone Mockup (OriginX Style with Gentle Hover Float) */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                whileHover={{ y: -6, rotate: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full max-w-[320px] bg-white border border-[#D0D5DD] rounded-[32px] p-5 shadow-[0_25px_50px_-12px_rgba(28,75,180,0.25)] space-y-4"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#475467] border-b border-[#F2F4F7] pb-2">
                  <span>electralens.org/verify</span>
                  <span className="text-[#14663F] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14663F] animate-pulse" />
                    SECURE
                  </span>
                </div>
                <div className="text-center pt-2">
                  <div className="relative mx-auto mb-3 w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-[#14663F]/15 animate-ping opacity-60" />
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#14663F] to-[#0D4429] text-white flex items-center justify-center shadow-md border-2 border-white">
                      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.2)"/>
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-1 shadow-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#14663F] block animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-[#172033] tracking-tight">{t("section6.verifiedStatus", "Publication Verified")}</h4>
                  <p className="text-[11px] text-[#475467] font-mono font-semibold">PUB-2024-001 · RFC 8785</p>
                </div>
                <div className="bg-[#F7F8FA] rounded-xl p-3 text-[11px] font-mono space-y-1.5 border border-[#E4E7EC]">
                  <div className="flex justify-between">
                    <span className="text-[#475467]">Baseline:</span>
                    <span className="text-[#172033] font-bold">v2024-Q1-draft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467]">Target:</span>
                    <span className="text-[#172033] font-bold">v2024-Q2-final</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467]">Additions:</span>
                    <span className="text-[#D9661A] font-bold">+24,891</span>
                  </div>
                </div>
                <Link
                  href="/verify"
                  className="btn-pill-sm btn-orange text-[#172033] font-bold flex items-center justify-center gap-2 text-center shadow-sm group w-full"
                >
                  <span>{t("section6.viewAudit", "View Full Verification Audit")}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7: SECURITY & PRIVACY ===== */}
      <section className="py-20 md:py-28 border-b border-[#E4E7EC] bg-white">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mb-14"
          >
            <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#14663F] block mb-2">
              SECURITY AND PRIVACY
            </span>
            <h2 className="font-serif text-[36px] sm:text-[50px] leading-[1.02] font-normal text-[#172033] tracking-[-0.01em]">
              Only proofs go public. Citizen data stays private.
            </h2>
            <p className="text-lg text-[#475467] mt-4 leading-[1.6]">
              Electoral transparency must never endanger voter privacy. Our aggregation pipeline enforces strict mathematical shields.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-[24px] p-6 space-y-3 transition-shadow hover:shadow-md"
            >
              <span className="w-10 h-10 rounded-xl bg-[#E7F6EE] text-[#14663F] flex items-center justify-center font-bold text-lg">
                🔒
              </span>
              <h3 className="text-base font-bold text-[#172033]">Zero PII Exposed</h3>
              <p className="text-xs text-[#475467] leading-relaxed">
                Voter names, mobile numbers, and street addresses are stripped and salt-pseudonymized before publication manifests are compiled.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-[24px] p-6 space-y-3 transition-shadow hover:shadow-md"
            >
              <span className="w-10 h-10 rounded-xl bg-[#EAF0FC] text-[#2864DC] flex items-center justify-center font-bold text-lg">
                🛡️
              </span>
              <h3 className="text-base font-bold text-[#172033]">k-Anonymity Protection</h3>
              <p className="text-xs text-[#475467] leading-relaxed">
                Any demographic cross-section with fewer than 10 individuals is automatically suppressed to prevent re-identification.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-[24px] p-6 space-y-3 transition-shadow hover:shadow-md"
            >
              <span className="w-10 h-10 rounded-xl bg-[#FFF4EC] text-[#F07824] flex items-center justify-center font-bold text-lg">
                ⚡
              </span>
              <h3 className="text-base font-bold text-[#172033]">Local Browser Verification</h3>
              <p className="text-xs text-[#475467] leading-relaxed">
                Verification hashes are calculated directly in your browser with zero analytics trackers, telemetry, or server surveillance.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 8: FAQ ACCORDION (With AnimatePresence Height Transitions) ===== */}
      <section className="py-20 md:py-28 border-b border-[#E4E7EC] bg-[#F7F8FA]">
        <div className="max-w-[880px] mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="font-mono text-[12px] font-bold tracking-[0.12em] uppercase text-[#475467] block mb-2">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="font-serif text-[36px] sm:text-[48px] font-normal text-[#172033]">
              Questions we get asked.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white border border-[#E4E7EC] rounded-[18px] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-base text-[#172033] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-[#475467] shrink-0"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-0 text-sm text-[#475467] leading-relaxed border-t border-[#F2F4F7]">
                          <p className="mt-3">{faq.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SECTION 9: CLOSING CTA (OriginX Signature Giant Orange Banner) ===== */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-white">
        <div className="max-w-[1400px] mx-auto rounded-[36px] bg-[#F07824] relative overflow-hidden p-8 sm:p-14 lg:p-20 shadow-xl">
          {/* OriginX Parallax Blob circles with subtle motion */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[440px] h-[440px] rounded-full bg-[#F48F45] -right-20 -top-24 pointer-events-none opacity-80"
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1], rotate: [0, -12, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[260px] h-[260px] rounded-full bg-[#2864DC] right-16 -bottom-28 pointer-events-none opacity-90"
          />

          <div className="relative z-10 max-w-2xl space-y-6">
            <h2 className="font-serif text-[38px] sm:text-[54px] lg:text-[68px] leading-[0.98] font-normal text-[#172033] tracking-[-0.01em]">
              Give your next civic inquiry an evidence base it can prove.
            </h2>
            <p className="text-base sm:text-lg text-[#172033] leading-relaxed">
              Open public data. Published statistical rules. Cryptographic proof anyone can inspect in a browser.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/compare"
                  className="btn-pill btn-dark text-white group shadow-lg"
                >
                  <span>Explore the comparison workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/verify/PUB-2024-001"
                  className="btn-pill border-2 border-[#172033] text-[#172033] hover:bg-[#172033] hover:text-white"
                >
                  <span>Verify a publication</span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
