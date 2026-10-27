import Link from "next/link";
import {
  Lock,
  EyeOff,
  ShieldCheck,
  Database,
  FileText,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="kicker-tag">
            <span className="w-2 h-2 rounded-full bg-[#14663F] inline-block" />
            SECURITY CHARTER · PRIVACY FIRST
          </div>
          <Badge variant="verified">STRICT K-ANONYMITY</Badge>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#172033] leading-[1.08] tracking-tight">
          Privacy Practices &amp; <span className="text-[#14663F]">Identity Protection</span>
        </h1>

        <p className="text-base sm:text-lg text-[#475467] font-sans font-medium max-w-[780px] leading-relaxed">
          How ElectraLens safeguards citizen privacy while delivering rigorous public electoral transparency.
        </p>
      </div>

      <div className="space-y-8 text-sm text-[#475467] leading-relaxed">
        {/* Core Principle Callout */}
        <div className="card-origin bg-[#FFF4EC] border-2 border-[#F07824]/30 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#F07824]">
            Core Founding Principle
          </p>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#172033] leading-snug">
            “Public Data. Public Methodology. Public Evidence. Private Identities.”
          </p>
          <p className="text-[#475467] pt-2 leading-relaxed">
            Electoral transparency must never come at the expense of voter safety or privacy.
            ElectraLens enforces mathematical aggregation to ensure individual citizens can never be singled out, doxed, or targeted.
          </p>
        </div>

        {/* Section 1: Non-Disclosure of PII */}
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <EyeOff className="w-5 h-5 text-[#F07824]" />
            1. Zero Personally Identifiable Information (PII)
          </h2>
          <p className="leading-relaxed">
            ElectraLens <strong className="text-[#172033]">never</strong> displays, distributes, or exposes individual citizen records on its public routes. Specifically excluded:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm pl-2">
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F07824] shrink-0" />
              <span>Citizen full names, family names, or aliases</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F07824] shrink-0" />
              <span>Parent, spouse, or guardian names</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F07824] shrink-0" />
              <span>House numbers, residential addresses, or street locations</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F07824] shrink-0" />
              <span>Elector Photo Identity Card (EPIC) numbers</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F07824] shrink-0" />
              <span>Individual dates of birth or mobile telephone numbers</span>
            </li>
          </ul>
        </section>

        {/* Section 2: Mathematical Aggregation */}
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#2864DC]" />
            2. Minimum Cell Counts &amp; Aggregation Thresholds
          </h2>
          <p className="leading-relaxed">
            All statistical findings and comparison workspaces are reported at the geographic level of assembly constituencies, municipal wards, or polling booth aggregates.
            To prevent re-identification through demographic intersection (k-anonymity violation), any statistical bucket with fewer than 10 individuals is suppressed or bundled.
          </p>
        </section>

        {/* Section 3: Web Analytics & Telemetry */}
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#14663F]" />
            3. No Tracking Cookies, Ads, or Third-Party Telemetry
          </h2>
          <p className="leading-relaxed">
            This website does not load external tracking scripts, behavioral advertising cookies, or cross-site fingerprinting beacons.
            Cryptographic verification executes locally inside your web browser using native Web Crypto APIs (<code className="font-mono text-xs bg-[#F7F8FA] border border-[#E4E7EC] px-1.5 py-0.5 rounded-full">crypto.subtle</code>), meaning your verification queries are never sent to a tracking database.
          </p>
        </section>

        {/* Section 4: Responsible Disclosure */}
        <section className="card-origin space-y-4">
          <h2 className="text-xl font-bold text-[#172033] flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#172033]" />
            4. Responsible Disclosure Policy
          </h2>
          <p className="leading-relaxed">
            If you identify any data leak, unintended exposure of personal information, or statistical vulnerability on this platform, please notify our security team immediately at <span className="font-mono text-xs font-bold text-[#2864DC] bg-[#EAF0FC] px-2.5 py-1 rounded-full">security@electralens.org</span>.
          </p>
        </section>

        {/* Footer CTAs */}
        <div className="pt-2 flex flex-wrap items-center gap-4">
          <Link href="/verify/PUB-2024-001" className="btn-pill btn-dark text-sm flex items-center gap-2">
            <span>Verify publication integrity</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/about" className="btn-pill btn-outline text-sm">
            Read civic mission
          </Link>
        </div>
      </div>
    </div>
  );
}
