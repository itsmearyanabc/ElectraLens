"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  SlidersHorizontal,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { findings, type Finding } from "@/lib/data";

export default function FindingsDirectoryPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [signalFilter, setSignalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesSearch =
        f.id.toLowerCase().includes(search.toLowerCase()) ||
        f.ruleName.toLowerCase().includes(search.toLowerCase()) ||
        f.area.toLowerCase().includes(search.toLowerCase()) ||
        f.explanation.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || f.category === categoryFilter;

      const matchesSignal =
        signalFilter === "all" || f.signalStrength === signalFilter;

      const matchesStatus =
        statusFilter === "all" || f.reviewStatus === statusFilter;

      return matchesSearch && matchesCategory && matchesSignal && matchesStatus;
    });
  }, [search, categoryFilter, signalFilter, statusFilter]);

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-12 md:py-20">
      {/* Header (OriginX Signature Typography) */}
      <div className="mb-12">
        <div className="kicker-tag mb-4 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#F07824]" />
          <span>{t("findings.kicker", "STATISTICAL EVIDENCE REPOSITORY")}</span>
        </div>
        <h1 className="font-serif text-[38px] sm:text-[54px] lg:text-[62px] leading-[1.0] text-[#172033] tracking-[-0.01em] font-normal mb-4">
          {t("findings.title", "Evidence directory.")}
        </h1>
        <p className="text-base sm:text-lg text-[#475467] max-w-[760px] leading-[1.6]">
          {t("findings.subhead", "Searchable register of statistical anomalies detected across electoral roll revisions. Each finding documents its mathematical detection criteria, multiple-testing false discovery rate (FDR) adjustments, and mandatory alternative explanations.")}
        </p>
      </div>

      {/* Filter and Search Bar (OriginX Card) */}
      <div className="card-origin mb-10 space-y-5">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475467]" />
            <input
              type="text"
              placeholder={t("findings.searchPlaceholder", "Search by area, rule ID, keyword...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-full pl-10 pr-4 py-2.5 text-xs font-semibold text-[#172033] placeholder:text-[#475467] focus:outline-none focus:border-[#172033]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-full px-4 py-2 text-xs font-bold text-[#172033] focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="addition-rate">Addition Rates</option>
              <option value="deletion-rate">Deletion Rates</option>
              <option value="duplicate-detection">Duplicate Clusters</option>
              <option value="age-distribution">Age Distributions</option>
            </select>

            {/* Signal Select */}
            <select
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value)}
              className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-full px-4 py-2 text-xs font-bold text-[#172033] focus:outline-none cursor-pointer"
            >
              <option value="all">All Signal Strengths</option>
              <option value="strong">Strong Signal (q &lt; 0.01)</option>
              <option value="moderate">Moderate Signal (q &lt; 0.05)</option>
              <option value="weak">Weak Signal (q &ge; 0.05)</option>
            </select>

            {/* Review Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-full px-4 py-2 text-xs font-bold text-[#172033] focus:outline-none cursor-pointer"
            >
              <option value="all">All Review Statuses</option>
              <option value="published">Published</option>
              <option value="reviewed">Reviewed</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
        </div>

        {/* Counter and Active Filter Pill Tags */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E4E7EC] text-xs text-[#475467]">
          <span>
            Displaying <strong className="text-[#172033] font-bold">{filteredFindings.length}</strong> of {findings.length} findings
          </span>
          {(categoryFilter !== "all" || signalFilter !== "all" || statusFilter !== "all" || search) && (
            <button
              onClick={() => {
                setCategoryFilter("all");
                setSignalFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}
              className="text-[#F07824] font-bold hover:underline text-xs"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Findings List (OriginX Cards) */}
      <div className="space-y-6">
        {filteredFindings.length === 0 ? (
          <div className="card-origin p-12 text-center">
            <HelpCircle className="w-10 h-10 text-[#475467] mx-auto mb-3 opacity-50" />
            <p className="text-lg font-bold text-[#172033]">No findings match query</p>
            <p className="text-xs text-[#475467] mt-1 max-w-sm mx-auto">
              Try adjusting your search terms or relaxing category and signal strength filters.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <Link
              key={finding.id}
              href={`/findings/${finding.id}`}
              className="block group"
            >
              <div className="card-origin hover:border-[#172033] hover:shadow-lg transition-all">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Metadata */}
                  <div className="lg:w-64 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-[#172033]">
                        {finding.id}
                      </span>
                      <span className="font-mono text-[11px] text-[#475467]">
                        v{finding.ruleVersion}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-[#172033] mb-3 group-hover:text-[#F07824] transition-colors">
                      {finding.ruleName}
                    </h2>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge
                        variant={
                          finding.signalStrength === "strong"
                            ? "signal-strong"
                            : finding.signalStrength === "moderate"
                              ? "signal-moderate"
                              : "signal-weak"
                        }
                      >
                        {finding.signalStrength} signal
                      </Badge>
                      <Badge
                        variant={`status-${finding.reviewStatus}` as "status-published" | "status-pending" | "status-reviewed" | "status-disputed"}
                      >
                        {finding.reviewStatus}
                      </Badge>
                    </div>
                    <p className="font-mono text-[11px] text-[#475467]">
                      Snapshot: {finding.baselineVersion} → {finding.targetVersion}
                    </p>
                  </div>

                  {/* Center Column: Area and Neutral Explanation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-bold text-[#2864DC] uppercase tracking-wide">
                        {finding.area}
                      </p>
                      <span className="text-[11px] font-mono text-[#475467]">
                        ({finding.areaCode})
                      </span>
                    </div>

                    <p className="text-sm font-medium text-[#344054] leading-relaxed mb-4">
                      {finding.explanation}
                    </p>

                    <div className="bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl p-4 text-xs space-y-1.5">
                      <p className="font-bold text-[#172033]">
                        Plausible Non-Anomalous Factors:
                      </p>
                      <ul className="list-disc list-inside text-[#475467] font-medium space-y-1">
                        {finding.alternativeExplanations.map((alt, idx) => (
                          <li key={idx} className="line-clamp-1">{alt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Statistical Rigor Box */}
                  <div className="lg:w-56 shrink-0 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl p-5 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#475467] block">
                          Effect Size / Rate Ratio
                        </span>
                        <span className="font-mono text-2xl font-bold text-[#D9661A]">
                          {finding.rateRatio.toFixed(2)}× baseline
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#E4E7EC]">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#475467] block">
                          Adjusted q-value (FDR)
                        </span>
                        <span className="font-mono text-sm font-bold text-[#172033]">
                          q = {finding.adjustedQValue < 0.001 ? "< 0.001" : finding.adjustedQValue.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs font-bold text-[#172033] group-hover:text-[#F07824]">
                      <span>Inspect evidence</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
