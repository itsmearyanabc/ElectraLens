import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Calendar,
  Layers,
  FileText,
  Hash,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/ui/print-button";
import { getFinding, findings } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

// Generate static params for synthetic demonstration findings
export function generateStaticParams() {
  return findings.map((f) => ({ id: f.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FindingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const finding = getFinding(id);

  if (!finding) {
    notFound();
  }

  const observedRate = (finding.observedValue / finding.denominator) * 100;
  const expectedRate = (finding.expectedBaseline / finding.denominator) * 100;

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-12 md:py-20">
      {/* Back Link & Dossier Actions */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/findings"
          className="btn-pill-sm btn-subtle"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to findings directory</span>
        </Link>

        <PrintButton label="Export Dossier (PDF)" />
      </div>

      {/* Header Banner (OriginX Card) */}
      <div className="card-origin mb-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E7EC]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold bg-[#F7F8FA] px-3 py-1 border border-[#E4E7EC] rounded-full text-[#172033]">
              {finding.id}
            </span>
            <Badge
              variant={
                finding.signalStrength === "strong"
                  ? "signal-strong"
                  : finding.signalStrength === "moderate"
                    ? "signal-moderate"
                    : "signal-weak"
              }
            >
              {finding.signalStrength} statistical signal
            </Badge>
            <Badge
              variant={`status-${finding.reviewStatus}` as "status-published" | "status-pending" | "status-reviewed" | "status-disputed"}
            >
              Status: {finding.reviewStatus}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold text-[#475467]">
            <span>Methodology v{finding.methodologyVersion}</span>
            <span>•</span>
            <Link
              href="/verify/PUB-2024-001"
              className="text-[#F07824] hover:underline inline-flex items-center gap-1"
            >
              <span>Verify manifest</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div>
          <h1 className="font-serif text-[34px] sm:text-[46px] lg:text-[52px] leading-[1.02] font-normal text-[#172033] tracking-[-0.01em] mb-2">
            {finding.ruleName}
          </h1>
          <p className="text-base text-[#2864DC] font-bold uppercase tracking-wider mb-4">
            {finding.area} <span className="text-[#475467] font-normal font-mono">({finding.areaCode})</span>
          </p>

          <p className="text-base sm:text-lg text-[#344054] leading-[1.6] max-w-[840px]">
            {finding.explanation}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quantitative Evidence & Rules (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section: Statistical Metrics */}
          <div className="card-origin">
            <h2 className="text-lg font-bold text-[#172033] mb-4 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#F07824]" />
              <span>Observed Count vs. Expected Baseline</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl mb-6">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#475467] mb-0.5">
                  Observed Count
                </p>
                <p className="font-mono text-2xl font-bold text-[#172033]">
                  {formatNumber(finding.observedValue)}
                </p>
                <p className="text-xs text-[#475467] font-medium">
                  {observedRate.toFixed(2)}% of subunit
                </p>
              </div>

              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#475467] mb-0.5">
                  Expected Baseline
                </p>
                <p className="font-mono text-2xl font-bold text-[#475467]">
                  {formatNumber(finding.expectedBaseline)}
                </p>
                <p className="text-xs text-[#475467] font-medium">
                  {expectedRate.toFixed(2)}% of subunit
                </p>
              </div>

              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#475467] mb-0.5">
                  Denominator (Eligible)
                </p>
                <p className="font-mono text-2xl font-bold text-[#172033]">
                  {formatNumber(finding.denominator)}
                </p>
                <p className="text-xs text-[#475467] font-medium">Subunit population</p>
              </div>

              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#475467] mb-0.5">
                  Rate Ratio / Effect Size
                </p>
                <p className="font-mono text-2xl font-bold text-[#D9661A]">
                  {finding.rateRatio.toFixed(2)}×
                </p>
                <p className="text-xs text-[#475467] font-medium">Δ = +{finding.effectSize.toFixed(2)}</p>
              </div>
            </div>

            {/* Evidence Breakdown Table */}
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#172033] mb-3">
              Statistical Test Rigor &amp; Assumptions
            </h3>
            <div className="border border-[#E4E7EC] rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E4E7EC]">
                  <tr className="bg-[#F7F8FA]">
                    <td className="py-3 px-4 font-bold text-[#475467] w-1/3">Statistical Test Model</td>
                    <td className="py-3 px-4 font-semibold text-[#172033]">{finding.statisticalTest}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-[#475467]">Raw p-value</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#172033]">{finding.pValue}</td>
                  </tr>
                  <tr className="bg-[#F7F8FA]">
                    <td className="py-3 px-4 font-bold text-[#475467]">95% Confidence Interval</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                      [{finding.confidenceInterval[0].toFixed(2)}, {finding.confidenceInterval[1].toFixed(2)}]
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-[#475467]">Multiple Testing Adjustment</td>
                    <td className="py-3 px-4 font-semibold text-[#172033]">Benjamini-Hochberg False Discovery Rate (FDR)</td>
                  </tr>
                  <tr className="bg-[#F7F8FA]">
                    <td className="py-3 px-4 font-bold text-[#475467]">Adjusted q-value</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                      {finding.adjustedQValue < 0.001 ? "< 0.001" : finding.adjustedQValue.toFixed(4)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-[#475467]">Simultaneous Tests Run</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#172033]">{finding.testsPerformed} assembly subunits</td>
                  </tr>
                  <tr className="bg-[#F7F8FA]">
                    <td className="py-3 px-4 font-bold text-[#475467]">Formal Detection Criterion</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#D9661A]">{finding.detectionCriterion}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Plausible Alternative Explanations */}
          <div className="card-origin">
            <h2 className="text-lg font-bold text-[#172033] mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#D9661A]" />
              <span>Plausible Alternative Explanations (Non-Misconduct)</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#475467] font-medium mb-6 leading-relaxed">
              Every statistical pattern must be evaluated against innocent contextual explanations before any inference is made.
              The presence of an anomaly does not establish fraudulent intent or misconduct.
            </p>

            <div className="space-y-4">
              {finding.alternativeExplanations.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl flex items-start gap-3.5"
                >
                  <span className="font-mono text-xs text-[#F07824] font-bold mt-0.5 bg-[#FFF4EC] px-2 py-0.5 rounded-md border border-[#FDE3CF]">
                    H_{idx + 1}:
                  </span>
                  <p className="text-xs md:text-sm text-[#344054] font-medium leading-relaxed">
                    {alt}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Known Limitations */}
          <div className="card-origin">
            <h2 className="text-lg font-bold text-[#172033] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#475467]" />
              <span>Analytical Limitations &amp; Uncertainty</span>
            </h2>
            <ul className="space-y-2.5 text-xs md:text-sm text-[#475467] font-medium">
              {finding.limitations.map((lim, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#F07824] font-bold">•</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Provenance, Audit History & Cryptography (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="card-origin p-6 text-xs space-y-4">
            <h3 className="font-mono text-xs font-bold tracking-[0.12em] uppercase text-[#172033] border-b border-[#E4E7EC] pb-3">
              Provenance &amp; Versioning
            </h3>

            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-[#475467]">Rule Identifier</p>
              <p className="font-mono font-bold text-sm text-[#172033] mt-0.5">{finding.ruleId} (v{finding.ruleVersion})</p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-[#475467]">Baseline Dataset</p>
              <p className="font-mono text-xs text-[#172033] mt-0.5">{finding.baselineVersion}</p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-[#475467]">Target Dataset</p>
              <p className="font-mono text-xs text-[#172033] mt-0.5">{finding.targetVersion}</p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-[#475467]">Category</p>
              <p className="text-xs font-bold text-[#172033] mt-0.5 capitalize">{finding.category.replace("-", " ")}</p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase font-bold text-[#475467]">Publication Manifest</p>
              <Link href="/verify/PUB-2024-001" className="font-mono font-bold text-xs text-[#F07824] hover:underline mt-0.5 block">
                PUB-2024-001 (Rev 1)
              </Link>
            </div>
          </div>

          {/* Audit & Review History */}
          <div className="card-origin p-6 text-xs">
            <h3 className="font-mono text-xs font-bold tracking-[0.12em] uppercase text-[#172033] border-b border-[#E4E7EC] pb-3 mb-4">
              Public Review Log
            </h3>
            <div className="space-y-4 font-mono text-[11px]">
              <div className="border-l-2 border-[#14663F] pl-3.5">
                <p className="font-bold text-[#172033]">Publication Approved</p>
                <p className="text-[#475467] text-[10px]">2024-04-20 14:00 UTC</p>
                <p className="text-[#475467] mt-0.5 font-sans font-medium">Approved under dual-analyst protocol</p>
              </div>

              <div className="border-l-2 border-[#F07824] pl-3.5">
                <p className="font-bold text-[#172033]">Statistical Peer Review</p>
                <p className="text-[#475467] text-[10px]">2024-04-18 11:20 UTC</p>
                <p className="text-[#475467] mt-0.5 font-sans font-medium">Alternative demographic hypotheses verified</p>
              </div>

              <div className="border-l-2 border-[#475467] pl-3.5">
                <p className="font-bold text-[#172033]">Algorithmic Detection</p>
                <p className="text-[#475467] text-[10px]">2024-04-15 10:30 UTC</p>
                <p className="text-[#475467] mt-0.5 font-sans font-medium">Batch execution against v2024-Q2-final</p>
              </div>
            </div>
          </div>

          {/* Integrity Assurance Callout (OriginX Dark Card) */}
          <div className="bg-[#172033] text-white rounded-3xl p-6 text-xs space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-2 h-2 rounded-full bg-[#2CD178] shadow-[0_0_6px_#2CD178]" />
              <span>Independent Verification</span>
            </div>
            <p className="text-[#D0D5DD] leading-relaxed text-[11px]">
              The evidence parameters for this finding are hashed in publication manifest PUB-2024-001. You can independently verify the SHA-256 digest in your browser.
            </p>
            <div className="pt-2">
              <Link
                href="/verify/PUB-2024-001"
                className="btn-pill-sm btn-orange w-full text-center"
              >
                Verify this record &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
