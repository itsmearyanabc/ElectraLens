"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { evaluateClaim, type ClaimResult, type ClaimVerdict } from "@/lib/data";

const sampleClaims = [
  {
    title: "Consistent Claim",
    area: "Vidyanagar Assembly",
    metric: "Addition rate",
    period: "January 2024 — April 2024",
    claimedValue: "4.4",
    direction: "equal to",
    description: "Claim that addition rate was ~4.4% in Vidyanagar.",
  },
  {
    title: "Contradicted Claim",
    area: "Lakshminagar Assembly",
    metric: "Deletion rate",
    period: "January 2024 — April 2024",
    claimedValue: "8.5",
    direction: "equal to",
    description: "Claim that deletions exceeded 8% in Lakshminagar (actual was 2.3%).",
  },
  {
    title: "Fraud / Intent Claim",
    area: "Rajpur Ward",
    metric: "Addition rate",
    period: "January 2024 — April 2024",
    claimedValue: "deliberate rigging and fraud",
    direction: "greater than",
    description: "Claim alleging fraudulent intent or criminal conspiracy.",
  },
  {
    title: "Missing / Out of Scope Area",
    area: "Central Metropolis District",
    metric: "Addition rate",
    period: "January 2024 — April 2024",
    claimedValue: "3.2",
    direction: "equal to",
    description: "Area not present in the published synthetic demonstration roll.",
  },
];

export default function ClaimCheckerPage() {
  const { t } = useLanguage();
  const [area, setArea] = useState(sampleClaims[0].area);
  const [metric, setMetric] = useState(sampleClaims[0].metric);
  const [period, setPeriod] = useState(sampleClaims[0].period);
  const [claimedValue, setClaimedValue] = useState(sampleClaims[0].claimedValue);
  const [direction, setDirection] = useState(sampleClaims[0].direction);
  const [result, setResult] = useState<ClaimResult | null>(() =>
    evaluateClaim(sampleClaims[0].area, sampleClaims[0].metric, sampleClaims[0].period, sampleClaims[0].claimedValue, sampleClaims[0].direction)
  );

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = evaluateClaim(area, metric, period, claimedValue, direction);
    setResult(res);
  };

  const loadSample = (s: typeof sampleClaims[0]) => {
    setArea(s.area);
    setMetric(s.metric);
    setPeriod(s.period);
    setClaimedValue(s.claimedValue);
    setDirection(s.direction);
    setResult(evaluateClaim(s.area, s.metric, s.period, s.claimedValue, s.direction));
  };

  const getVerdictStyle = (verdict: ClaimVerdict) => {
    switch (verdict) {
      case "consistent":
        return {
          bg: "bg-[#E7F6EE]",
          border: "border-[#A6E1C4]",
          text: "text-[#14663F]",
          title: "Consistent with Published Aggregate Data",
          icon: CheckCircle2,
        };
      case "contradicted":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          title: "Contradicted by Published Aggregate Data",
          icon: XCircle,
        };
      case "cannot-establish":
        return {
          bg: "bg-[#FFF4EC]",
          border: "border-[#FDE3CF]",
          text: "text-[#D9661A]",
          title: "Cannot Be Established (Intent / Misconduct Allegation)",
          icon: ShieldAlert,
        };
      case "disputed":
        return {
          bg: "bg-[#FFF4EC]",
          border: "border-[#FDE3CF]",
          text: "text-[#D9661A]",
          title: "Disputed Methodology or Source Divergence",
          icon: AlertTriangle,
        };
      case "insufficient-data":
      default:
        return {
          bg: "bg-[#F7F8FA]",
          border: "border-[#E4E7EC]",
          text: "text-[#475467]",
          title: "Insufficient Data in Active Fixture",
          icon: HelpCircle,
        };
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-12 md:py-20">
      {/* Page Header (OriginX Signature Typography) */}
      <div className="mb-12">
        <div className="kicker-tag mb-4 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#2864DC]" />
          <span>{t("claims.kicker", "INDEPENDENT FACT CHECKING")}</span>
        </div>
        <h1 className="font-serif text-[38px] sm:text-[54px] lg:text-[62px] leading-[1.0] text-[#172033] tracking-[-0.01em] font-normal mb-4">
          {t("claims.title", "Check a claim.")}
        </h1>
        <p className="text-base sm:text-lg text-[#475467] max-w-[760px] leading-[1.6]">
          {t("claims.subhead", "Evaluate public assertions against mathematical aggregate deltas between published electoral roll versions. The engine strictly distinguishes verified numerical discrepancies from unverifiable allegations of intent or malice.")}
        </p>
      </div>

      {/* Pre-fill Sample Presets (OriginX Cards) */}
      <div className="mb-10">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#172033] mb-3">
          Or test with pre-configured claim scenarios:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleClaims.map((s, idx) => (
            <button
              key={idx}
              onClick={() => loadSample(s)}
              className="text-left p-5 card-origin hover:border-[#172033] transition-all cursor-pointer text-xs"
            >
              <span className="font-bold text-sm text-[#172033] block mb-1">{s.title}</span>
              <span className="text-[#475467] font-medium text-xs leading-relaxed line-clamp-2">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Inputs (5 cols - OriginX Card) */}
        <div className="lg:col-span-5 card-origin space-y-4">
          <h2 className="text-lg font-bold text-[#172033] mb-2">
            Structured Claim Parameters
          </h2>
          <form onSubmit={handleEvaluate} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block font-mono font-bold text-[#475467] mb-1.5 uppercase tracking-wide text-[10px]">
                Administrative Unit / Area
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Vidyanagar Assembly"
                required
                className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-sm text-[#172033] font-semibold focus:outline-none focus:border-[#172033]"
              />
            </div>

            <div>
              <label className="block font-mono font-bold text-[#475467] mb-1.5 uppercase tracking-wide text-[10px]">
                Reported Metric
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-sm text-[#172033] font-semibold focus:outline-none focus:border-[#172033] cursor-pointer"
              >
                <option value="Addition rate">Addition rate (%)</option>
                <option value="Deletion rate">Deletion rate (%)</option>
                <option value="Total records">Total electorate count</option>
              </select>
            </div>

            <div>
              <label className="block font-mono font-bold text-[#475467] mb-1.5 uppercase tracking-wide text-[10px]">
                Revision Period
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. January 2024 — April 2024"
                className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-sm text-[#172033] font-semibold focus:outline-none focus:border-[#172033]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono font-bold text-[#475467] mb-1.5 uppercase tracking-wide text-[10px]">
                  Comparison Mode
                </label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-xs text-[#172033] font-semibold focus:outline-none focus:border-[#172033] cursor-pointer"
                >
                  <option value="equal to">Approximately equal to</option>
                  <option value="greater than">Greater than</option>
                  <option value="less than">Less than</option>
                </select>
              </div>

              <div>
                <label className="block font-mono font-bold text-[#475467] mb-1.5 uppercase tracking-wide text-[10px]">
                  Claimed Value
                </label>
                <input
                  type="text"
                  value={claimedValue}
                  onChange={(e) => setClaimedValue(e.target.value)}
                  placeholder="e.g. 4.4"
                  required
                  className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-xl p-3 text-xs text-[#172033] font-semibold focus:outline-none focus:border-[#172033]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-pill btn-orange w-full shadow-md"
              >
                <span>Evaluate Claim Against Public Data</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Results Output (7 cols - OriginX Card) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={`${result.verdict}-${area}-${claimedValue}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="card-origin p-0 overflow-hidden shadow-md"
              >
                {/* Verdict Header Banner */}
                {(() => {
                  const style = getVerdictStyle(result.verdict);
                  const IconComponent = style.icon;
                  return (
                    <div className={`p-6 ${style.bg} border-b ${style.border}`}>
                      <div className="flex items-center gap-2 mb-2 font-mono">
                        <IconComponent className={`w-5 h-5 ${style.text}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                          VERDICT: {result.verdict.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl font-normal text-[#172033]">
                        {style.title}
                      </h3>
                      <p className="text-xs md:text-sm text-[#344054] font-medium mt-2 leading-relaxed">
                        {result.reasoning}
                      </p>
                    </div>
                  );
                })()}

                {/* Parsed Claim vs Published Reality */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl">
                      <span className="font-mono text-[10px] font-bold text-[#475467] uppercase tracking-wider block mb-1">
                        Reported / Claimed Assertion
                      </span>
                      <p className="font-bold text-sm text-[#172033]">
                        {result.parsedClaim.area}
                      </p>
                      <p className="text-xs text-[#475467] mt-1">
                        {result.parsedClaim.metric}: <span className="font-mono font-bold text-[#172033]">{String(result.parsedClaim.claimedValue)}</span> ({result.parsedClaim.direction})
                      </p>
                    </div>

                    <div className="p-4 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl">
                      <span className="font-mono text-[10px] font-bold text-[#475467] uppercase tracking-wider block mb-1">
                        Official Published Aggregate
                      </span>
                      {Object.keys(result.publishedValues).length > 0 ? (
                        Object.entries(result.publishedValues).map(([k, v]) => (
                          <div key={k}>
                            <p className="font-bold text-sm text-[#172033]">{k}</p>
                            <p className="font-mono font-bold text-base text-[#14663F] mt-0.5">
                              {typeof v === "number" ? v.toLocaleString() : String(v)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#475467] italic">No numeric data applicable</p>
                      )}
                    </div>
                  </div>

                  {/* Evaluation Method */}
                  <div>
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#172033] mb-1">
                      Evaluation Method
                    </h4>
                    <p className="text-xs text-[#475467] leading-relaxed">
                      {result.method}
                    </p>
                  </div>

                  {/* Sources */}
                  <div>
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#172033] mb-1">
                      Referenced Public Sources
                    </h4>
                    <ul className="list-disc list-inside text-xs text-[#475467] space-y-1">
                      {result.sources.map((src, i) => (
                        <li key={i}>{src}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Limitations */}
                  <div className="p-4 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl text-xs space-y-1.5">
                    <p className="font-bold text-[#172033] flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#D9661A]" /> Caveats &amp; Limitations:
                    </p>
                    <ul className="list-disc list-inside text-[#475467] font-medium space-y-0.5">
                      {result.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
