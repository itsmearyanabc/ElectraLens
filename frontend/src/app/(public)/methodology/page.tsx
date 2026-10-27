"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Scale,
  BookOpen,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Database,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { statisticalRules } from "@/lib/data";

export default function MethodologyPage() {
  const { t } = useLanguage();
  const [expandedRule, setExpandedRule] = useState<string | null>("RULE-ADD-01");

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-12 md:py-20">
      {/* Page Title (OriginX Signature Typography) */}
      <div className="mb-12">
        <div className="kicker-tag mb-4 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#14663F]" />
          <span>{t("methodology.kicker", "STATISTICAL SPECIFICATION v1.0.0")}</span>
        </div>
        <h1 className="font-serif text-[38px] sm:text-[54px] lg:text-[62px] leading-[1.0] text-[#172033] tracking-[-0.01em] font-normal mb-4">
          {t("methodology.title", "Public methodology.")}
        </h1>
        <p className="text-base sm:text-lg text-[#475467] max-w-[800px] leading-[1.6]">
          {t("methodology.subhead", "ElectraLens is committed to radical analytical transparency. This document details the mathematical models, canonicalization standards, false discovery controls, and known limitations governing all published roll analytics.")}
        </p>
      </div>

      {/* Nav Anchor Links (OriginX Chunky Pills) */}
      <div className="flex flex-wrap gap-2.5 p-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded-full mb-14 text-xs font-bold">
        <a href="#canonicalization" className="px-4 py-2 bg-white hover:bg-[#172033] hover:text-white rounded-full text-[#172033] transition-all shadow-2xs">
          1. Schema &amp; Canonicalization
        </a>
        <a href="#comparison" className="px-4 py-2 bg-white hover:bg-[#172033] hover:text-white rounded-full text-[#172033] transition-all shadow-2xs">
          2. Differential Comparison Rules
        </a>
        <a href="#fdr" className="px-4 py-2 bg-white hover:bg-[#172033] hover:text-white rounded-full text-[#172033] transition-all shadow-2xs">
          3. Multiple-Testing Correction
        </a>
        <a href="#rules-table" className="px-4 py-2 bg-white hover:bg-[#172033] hover:text-white rounded-full text-[#172033] transition-all shadow-2xs">
          4. Registered Detection Rules
        </a>
        <a href="#limitations" className="px-4 py-2 bg-white hover:bg-[#172033] hover:text-white rounded-full text-[#172033] transition-all shadow-2xs">
          5. Uncertainty &amp; Limitations
        </a>
      </div>

      <div className="space-y-16">
        {/* SECTION 1: Schema & Canonicalization */}
        <section id="canonicalization" className="scroll-mt-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-[#F07824] font-bold">SECTION 01</span>
            <span className="text-xs text-[#475467] uppercase tracking-wider font-bold">Data Engineering</span>
          </div>
          <h2 className="font-serif text-[28px] sm:text-[38px] leading-[1.05] font-normal text-[#172033] mb-4">
            Dataset Schema &amp; Deterministic Canonicalization
          </h2>
          <p className="text-base text-[#475467] leading-[1.6] mb-8 max-w-3xl">
            Electoral registers from disparate sources frequently arrive in heterogeneous encodings, unsorted records, and differing whitespace styles.
            To guarantee that hashes are reproducible on any operating system, ElectraLens enforces a strict canonicalization standard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="card-origin">
              <h3 className="text-base font-bold text-[#172033] mb-3 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#F07824]" />
                <span>Canonicalization Rules</span>
              </h3>
              <ul className="space-y-3 text-xs md:text-sm text-[#475467] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#172033] font-bold">1. Key Sorting:</span> All dictionary and JSON object keys are strictly sorted in lexicographical ASCII order prior to serialization.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#172033] font-bold">2. Whitespace Elimination:</span> All extraneous line breaks, tabs, and spaces outside quotation delimiters are stripped.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#172033] font-bold">3. UTF-8 NFC Normalization:</span> Text values are normalized using Unicode Standard Annex #15 (NFC) to ensure consistent composite characters.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#172033] font-bold">4. Identity Scrubbing:</span> Voter names, addresses, and ID numbers are removed or salt-hashed prior to generating public aggregate records.
                </li>
              </ul>
            </div>

            <div className="bg-[#172033] text-[#F7F8FA] rounded-3xl p-6 font-mono text-xs overflow-x-auto shadow-md">
              <p className="text-white/50 text-[10px] font-bold tracking-wider uppercase mb-3">Canonicalization Algorithm Representation</p>
              <pre className="text-white/85 leading-relaxed font-mono text-[11px]">
{`function canonicalise(obj) {
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalise).join(",") + "]";
  }
  if (typeof obj === "object" && obj !== null) {
    const keys = Object.keys(obj).sort();
    return "{" + keys.map(k => 
      JSON.stringify(k) + ":" + canonicalise(obj[k])
    ).join(",") + "}";
  }
  return JSON.stringify(obj);
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* SECTION 2: Differential Comparison Rules */}
        <section id="comparison" className="scroll-mt-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-[#2864DC] font-bold">SECTION 02</span>
            <span className="text-xs text-[#475467] uppercase tracking-wider font-bold">Differential Auditing</span>
          </div>
          <h2 className="font-serif text-[28px] sm:text-[38px] leading-[1.05] font-normal text-[#172033] mb-4">
            Version Comparison &amp; Change Classification
          </h2>
          <p className="text-base text-[#475467] leading-[1.6] mb-8 max-w-3xl">
            When comparing baseline roll revision <code className="font-mono text-xs bg-[#F7F8FA] px-2 py-0.5 rounded-md border border-[#E4E7EC]">T₀</code> and target roll revision <code className="font-mono text-xs bg-[#F7F8FA] px-2 py-0.5 rounded-md border border-[#E4E7EC]">T₁</code>, each record is partitioned into exactly one of four mutually exclusive sets:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="card-origin p-6">
              <p className="font-mono text-xs font-bold text-[#14663F] uppercase tracking-wider mb-2">Additions (A)</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                Records present in T₁ whose unique voter identifier did not exist in T₀. Calculated as new registrations.
              </p>
            </div>
            <div className="card-origin p-6">
              <p className="font-mono text-xs font-bold text-[#DC2626] uppercase tracking-wider mb-2">Deletions (D)</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                Records present in T₀ that do not appear in T₁. Includes deceased removals, interstate migrations, and administrative de-duplication.
              </p>
            </div>
            <div className="card-origin p-6">
              <p className="font-mono text-xs font-bold text-[#D9661A] uppercase tracking-wider mb-2">Corrections (C)</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                Records present in both T₀ and T₁ under identical identifiers where demographic, address, or polling-station attributes were modified.
              </p>
            </div>
            <div className="card-origin p-6">
              <p className="font-mono text-xs font-bold text-[#172033] uppercase tracking-wider mb-2">Unchanged (U)</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                Records with identical cryptographic hashes across both T₀ and T₁.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: Multiple Testing & FDR */}
        <section id="fdr" className="scroll-mt-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-[#14663F] font-bold">SECTION 03</span>
            <span className="text-xs text-[#475467] uppercase tracking-wider font-bold">Statistical Discipline</span>
          </div>
          <h2 className="font-serif text-[28px] sm:text-[38px] leading-[1.05] font-normal text-[#172033] mb-4">
            Multiple-Testing Correction &amp; False Discovery Rate (FDR)
          </h2>
          <div className="card-origin space-y-5">
            <p className="text-base text-[#344054] leading-[1.6]">
              When screening thousands of polling stations or hundreds of assembly constituencies simultaneously, standard unadjusted significance thresholds (such as <em>p &lt; 0.05</em>) will inevitably produce dozens of false positives simply by random chance.
            </p>
            <p className="text-base text-[#344054] leading-[1.6]">
              ElectraLens enforces the <strong>Benjamini-Hochberg procedure</strong> across all simultaneous hypothesis tests to control the False Discovery Rate (FDR). An anomaly is only published when its adjusted <em>q-value</em> meets our pre-registered thresholds:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
              <div className="border border-[#E4E7EC] rounded-2xl p-5 bg-[#F7F8FA]">
                <span className="font-mono text-xs font-bold text-[#DC2626] uppercase tracking-wider">Strong Signal</span>
                <p className="font-mono text-xl font-bold text-[#172033] mt-1.5">q &lt; 0.01</p>
                <p className="text-xs text-[#475467] mt-1.5 leading-relaxed">Less than 1% expected false discovery rate. Significant deviation from baseline.</p>
              </div>

              <div className="border border-[#E4E7EC] rounded-2xl p-5 bg-[#F7F8FA]">
                <span className="font-mono text-xs font-bold text-[#D9661A] uppercase tracking-wider">Moderate Signal</span>
                <p className="font-mono text-xl font-bold text-[#172033] mt-1.5">0.01 &le; q &lt; 0.05</p>
                <p className="text-xs text-[#475467] mt-1.5 leading-relaxed">Substantial deviation requiring context review. Flagged for analyst inspection.</p>
              </div>

              <div className="border border-[#E4E7EC] rounded-2xl p-5 bg-[#F7F8FA]">
                <span className="font-mono text-xs font-bold text-[#475467] uppercase tracking-wider">Weak / Non-Significant</span>
                <p className="font-mono text-xl font-bold text-[#172033] mt-1.5">q &ge; 0.05</p>
                <p className="text-xs text-[#475467] mt-1.5 leading-relaxed">Fails multiple-testing significance test. Withheld from primary published findings.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Registered Rules Table */}
        <section id="rules-table" className="scroll-mt-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-[#F07824] font-bold">SECTION 04</span>
            <span className="text-xs text-[#475467] uppercase tracking-wider font-bold">Catalog</span>
          </div>
          <h2 className="font-serif text-[28px] sm:text-[38px] leading-[1.05] font-normal text-[#172033] mb-4">
            Published Detection Rules Specification
          </h2>
          <p className="text-base text-[#475467] mb-8 leading-[1.6] max-w-3xl">
            All rule parameters are deterministic and publicly auditable. Expand any rule to inspect its formal test formulation, thresholds, and known limitations.
          </p>

          <div className="space-y-4">
            {statisticalRules.map((rule) => {
              const isExpanded = expandedRule === rule.id;
              return (
                <div key={rule.id} className="card-origin p-0 overflow-hidden">
                  <div
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-[#F7F8FA] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="font-mono text-xs font-bold text-[#F07824] bg-[#FFF4EC] border border-[#FDE3CF] px-3 py-1 rounded-full">
                        {rule.id}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-[#172033]">{rule.name}</h3>
                        <p className="text-xs text-[#475467]">{rule.category} · v{rule.version}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#475467] hidden md:inline-block">
                        Benchmark: {rule.benchmarkPrecision}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#172033]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#172033]" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-[#E4E7EC] bg-[#F7F8FA]/50 text-xs space-y-4">
                      <p className="text-sm font-medium text-[#344054] leading-relaxed">{rule.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 space-y-2">
                          <p className="font-mono font-bold text-[#172033] uppercase tracking-wider text-[10px]">
                            Detection Model &amp; Threshold
                          </p>
                          <p><strong className="text-[#475467]">Test:</strong> {rule.statisticalTest}</p>
                          <p><strong className="text-[#475467]">Criterion:</strong> <span className="font-mono font-bold text-[#172033]">{rule.detectionCriterion}</span></p>
                          <p><strong className="text-[#475467]">Nominal Threshold:</strong> {rule.threshold}</p>
                        </div>

                        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 space-y-1.5">
                          <p className="font-mono font-bold text-[#D9661A] uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Methodological Limitations
                          </p>
                          <ul className="list-disc list-inside text-[#475467] font-medium space-y-1">
                            {rule.limitations.map((lim, idx) => (
                              <li key={idx}>{lim}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 5: Limitations & Scientific Uncertainty */}
        <section id="limitations" className="scroll-mt-24">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-[#DC2626] font-bold">SECTION 05</span>
            <span className="text-xs text-[#475467] uppercase tracking-wider font-bold">Civic Integrity</span>
          </div>
          <h2 className="font-serif text-[28px] sm:text-[38px] leading-[1.05] font-normal text-[#172033] mb-4">
            Uncertainty, Nuance &amp; Non-Misconduct Standards
          </h2>
          <div className="card-origin space-y-4 text-base text-[#344054] leading-relaxed">
            <p>
              Statistical analysis reveals divergence from expectations; it cannot discern human motivation.
              In civic data science, false accusations damage public confidence as severely as undetected irregularities.
            </p>
            <div className="p-5 bg-[#FFF4EC] border border-[#FDE3CF] rounded-2xl text-xs md:text-sm text-[#D9661A] leading-relaxed">
              <strong className="text-[#172033]">Mandatory Reporting Guideline:</strong> ElectraLens findings must never be characterized as "proof of illegal voters" or "electoral manipulation." They represent aggregate statistical signals requiring field investigation by accredited journalists and independent observers.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
