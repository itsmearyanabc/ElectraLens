import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ExternalLink,
  ShieldAlert,
  ArrowLeft,
  Building,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/ui/print-button";
import { getBooth, syntheticBooths } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return syntheticBooths.map((b) => ({ code: b.code }));
}

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function BoothDetailPage({ params }: PageProps) {
  const { code } = await params;
  const booth = getBooth(code);

  if (!booth) {
    notFound();
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-10 md:py-16">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="btn-pill-sm btn-subtle flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#2864DC]" />
          <span>Back to homepage</span>
        </Link>

        <PrintButton />
      </div>

      {/* Main Booth Card */}
      <div className="card-origin space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4E7EC] pb-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="kicker-tag">
                <span className="w-2 h-2 rounded-full bg-[#2864DC] inline-block" />
                POLLING STATION {booth.code}
              </div>
              <Badge variant="synthetic">Synthetic Demonstration Fixture</Badge>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#172033] leading-snug">
              {booth.name}
            </h1>
          </div>
          <div className="text-right text-xs text-[#475467] font-mono shrink-0">
            Last verified: {formatDate(booth.lastVerified)}
          </div>
        </div>

        {/* Location & Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#475467] mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#F07824]" />
                Physical Address (Synthetic)
              </p>
              <p className="text-sm text-[#172033] font-semibold leading-relaxed">
                {booth.address}
              </p>
            </div>

            <div className="p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#475467] mb-2 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#2864DC]" />
                Electoral Roll Sections &amp; Parts Served
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {booth.partsServed.map((part) => (
                  <span
                    key={part}
                    className="font-mono text-xs font-bold bg-white border border-[#E4E7EC] px-3 py-1 rounded-full text-[#172033] shadow-xs"
                  >
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#475467] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#14663F]" />
                Accessibility Assessment
              </p>
              <p className="text-sm text-[#172033] leading-relaxed font-medium">
                {booth.accessibilityNotes}
              </p>
            </div>

            <div className="p-5 bg-[#FFF4EC] border border-[#F07824]/30 rounded-2xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#F07824] mb-1">
                Data Provenance Notice
              </p>
              <p className="text-xs text-[#475467] leading-relaxed">
                {booth.source}. This is a synthetic mock record created solely for testing polling-station lookup routing and accessibility rendering.
              </p>
            </div>
          </div>
        </div>

        {/* Official Links & Notice */}
        <div className="pt-6 border-t border-[#E4E7EC] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <p className="text-[#475467] leading-relaxed max-w-[540px]">
            To find your actual official polling station, visit the Election Commission of India's National Voter Services Portal.
          </p>
          <a
            href="https://electoralsearch.eci.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill-sm btn-dark flex items-center gap-1.5 shrink-0"
          >
            <span>Official ECI Search</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
