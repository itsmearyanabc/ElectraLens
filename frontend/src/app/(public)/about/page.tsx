import Link from "next/link";
import {
  ShieldAlert,
  Scale,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Users,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="kicker-tag">
            <span className="w-2 h-2 rounded-full bg-[#F07824] inline-block" />
            CIVIC MISSION · INDEPENDENT RESEARCH
          </div>
          <Badge variant="orange">PUBLIC ACCOUNTABILITY</Badge>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#172033] leading-[1.08] tracking-tight">
          Independent Civic Intelligence for <span className="text-[#2864DC]">Democratic Accountability</span>
        </h1>

        <p className="text-base sm:text-lg text-[#475467] font-sans font-medium max-w-[800px] leading-relaxed">
          ElectraLens is a public-interest research tool designed to illuminate changes between published electoral-roll versions,
          evaluate statistical outliers, and provide verifiable proof of public dataset integrity.
        </p>
      </div>

      {/* Prominent Independence Notice */}
      <div className="card-origin bg-[#FFF4EC] border-2 border-[#F07824]/40 p-6 sm:p-8 mb-10 space-y-3">
        <div className="flex items-center gap-2 text-[#F07824] font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-5 h-5 text-[#F07824]" />
          <span>Statement of Non-Affiliation</span>
        </div>
        <p className="text-base sm:text-lg font-bold text-[#172033] leading-snug">
          ElectraLens is an independent civic-tech project. It is not affiliated with, authorized by, sponsored by, or endorsed by the Election Commission of India (ECI) or any state Chief Electoral Officer.
        </p>
        <p className="text-xs sm:text-sm text-[#475467] leading-relaxed">
          ElectraLens does not conduct voter registration, process official election complaints, or replace statutory revision processes. For official voter registrations and administrative updates, consult the official portal at{" "}
          <a href="https://eci.gov.in" target="_blank" rel="noopener noreferrer" className="text-[#2864DC] font-bold underline">
            eci.gov.in
          </a>.
        </p>
      </div>

      {/* Mission & Purpose */}
      <div className="space-y-8 text-sm text-[#475467] leading-relaxed">
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#2864DC]" />
            Why ElectraLens Exists
          </h2>
          <p className="leading-relaxed">
            Electoral rolls represent the bedrock of representative democracy. In large democracies, hundreds of thousands of additions, deletions, and corrections occur during every revision cycle.
            Journalists and civic groups often lack the statistical infrastructure required to differentiate normal demographic changes from unusual anomalies.
          </p>
          <p className="leading-relaxed font-semibold text-[#172033]">
            ElectraLens bridges this gap by offering:
          </p>
          <ul className="space-y-2.5 text-xs sm:text-sm pl-2">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F07824] mt-2 shrink-0" />
              <span><strong className="text-[#172033]">Reproducible differential comparison:</strong> Ingest two versions of a roll and see exact additions, deletions, and shifts across all administrative levels.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2864DC] mt-2 shrink-0" />
              <span><strong className="text-[#172033]">Pre-registered statistical tests:</strong> Mathematical rules that control for multiple-testing false discovery rates using Benjamini-Hochberg q-values.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14663F] mt-2 shrink-0" />
              <span><strong className="text-[#172033]">Contextual humility:</strong> Mandatory presentation of alternative, non-malicious hypotheses ($H_1, H_2$) for every flagged anomaly.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#172033] mt-2 shrink-0" />
              <span><strong className="text-[#172033]">Cryptographic verifiability:</strong> SHA-256 commitments so public reports can be independently checked for tampering locally in the browser.</span>
            </li>
          </ul>
        </section>

        {/* The Principle of Statistical Humility */}
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-[#14663F]" />
            The Principle of Statistical Humility
          </h2>
          <p className="leading-relaxed">
            An anomaly is not proof of misconduct. Rapid growth in new voters may stem from college enrollments, residential handovers, or targeted registration drives.
            Unusually high deletion rates may reflect delayed updates following public health records or routine deduplication.
          </p>
          <p className="leading-relaxed">
            ElectraLens strictly prohibits sensationalism. The platform never declares an area "rigged" or "fraudulent." It presents public facts, mathematical models, and uncertainties so observers can conduct rigorous, ground-truth inquiries.
          </p>
        </section>

        {/* Hackathon Scope & Roadmap */}
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#2864DC]" />
            Hackathon Scope &amp; Open Architecture
          </h2>
          <p className="leading-relaxed">
            During this hackathon release, all roll data and polling stations shown are deterministic synthetic demonstration fixtures designed to validate user workflows, charting components, and cryptographic verifiers.
            The complete codebase is designed for modular integration with official open datasets and public research pipelines.
          </p>
        </section>

        {/* Action button */}
        <div className="pt-2 flex flex-wrap items-center gap-4">
          <Link href="/compare" className="btn-pill btn-orange text-sm flex items-center gap-2">
            <span>Explore the comparison tool</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/methodology" className="btn-pill btn-outline text-sm">
            Inspect methodology
          </Link>
        </div>
      </div>
    </div>
  );
}
