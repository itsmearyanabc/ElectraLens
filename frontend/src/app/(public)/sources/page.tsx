"use client";

import Link from "next/link";
import {
  Database,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  FileCode2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { datasetVersions, publicationManifests } from "@/lib/data";
import { formatNumber, formatDate } from "@/lib/utils";

export default function SourcesPage() {
  const { t } = useLanguage();
  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-10 md:py-16">
      {/* Header */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="kicker-tag">
            <span className="w-2 h-2 rounded-full bg-[#2864DC] inline-block" />
            {t("sources.kicker", "PROVENANCE & HISTORY")}
          </div>
          <Badge variant="blue">AUDIT TRAIL</Badge>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#172033] leading-[1.08] tracking-tight">
          {t("sources.title", "Data Sources & Publication Manifests")}
        </h1>

        <p className="text-base sm:text-lg text-[#475467] font-sans font-medium max-w-[760px] leading-relaxed">
          {t("sources.subhead", "ElectraLens maintains a cryptographic registry of every electoral roll release ingested, standardized, and audited. Trace dataset versions, SHA-256 signatures, and publication manifests.")}
        </p>
      </div>

      {/* Synthetic Notice */}
      <div className="card-origin bg-[#FFF4EC] border-[#F07824]/30 p-6 mb-10 flex items-start gap-3.5 text-xs text-[#B54708] leading-relaxed">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[#F07824] mt-0.5" />
        <div>
          <strong className="font-bold text-[#172033] block mb-1">Hackathon Demonstration Notice: </strong>
          The datasets listed below are deterministic synthetic fixtures engineered to test differential analysis algorithms,
          outlier detection models, and cryptographic verifiers. No personal data from living citizens is processed.
        </div>
      </div>

      {/* Dataset Version Table */}
      <div className="card-origin mb-10">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC] mb-6">
          <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2864DC]" />
            Ingested Electoral Roll Releases
          </h2>
          <span className="font-mono text-xs text-[#475467]">
            {datasetVersions.length} Recorded Releases
          </span>
        </div>

        <div className="border border-[#E4E7EC] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F7F8FA] border-b border-[#E4E7EC] text-[#475467] uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3.5 px-4 text-left">Version ID</th>
                  <th className="py-3.5 px-4 text-left">Snapshot Label</th>
                  <th className="py-3.5 px-4 text-left">Publication Date</th>
                  <th className="py-3.5 px-4 text-right">Electorate Count</th>
                  <th className="py-3.5 px-4 text-left">SHA-256 Digest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E7EC]">
                {datasetVersions.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#172033]">{v.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#172033]">{v.label}</td>
                    <td className="py-3.5 px-4 text-[#475467] font-mono">{formatDate(v.date)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#172033]">
                      {formatNumber(v.totalRecords)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#475467] text-[11px] max-w-[200px] truncate" title={v.hash}>
                      {v.hash.substring(0, 16)}...{v.hash.substring(v.hash.length - 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Publication Manifests Register */}
      <div className="card-origin mb-10">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC] mb-6">
          <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#14663F]" />
            Public Aggregate Publication Manifests
          </h2>
          <span className="font-mono text-xs text-[#475467]">
            Cryptographically Anchored
          </span>
        </div>

        <div className="space-y-4">
          {publicationManifests.map((manifest) => (
            <div
              key={manifest.id}
              className="p-5 border border-[#E4E7EC] rounded-2xl bg-[#F7F8FA] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-xs"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono font-bold text-[#172033] text-sm">{manifest.id}</span>
                  <Badge variant="status-published">Revision {manifest.version}</Badge>
                  <span className="text-[#475467]">• {manifest.publisher}</span>
                </div>
                <p className="text-[#475467] font-mono text-[11px]">
                  Committed at {new Date(manifest.publishedAt).toLocaleString()}
                </p>
              </div>

              <Link
                href={`/verify/${manifest.id}`}
                className="btn-pill-sm btn-dark flex items-center gap-1.5 shrink-0"
              >
                <span>Inspect &amp; Verify Manifest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* External Official Portals */}
      <div className="card-origin">
        <h2 className="text-lg font-bold text-[#172033] mb-2">
          Official Government Electoral Portals
        </h2>
        <p className="text-xs text-[#475467] mb-6 leading-relaxed">
          ElectraLens operates independently and does not replace official electoral services.
          Consult the official portals below for statutory notices, voter registration (Form 6), and electoral roll downloads.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://eci.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 border border-[#E4E7EC] rounded-2xl bg-[#F7F8FA] hover:border-[#2864DC]/40 hover:bg-white transition-all block text-xs group shadow-xs"
          >
            <div className="flex items-center justify-between font-bold text-[#172033] mb-1.5 text-sm">
              <span>Election Commission of India (ECI)</span>
              <ExternalLink className="w-4 h-4 text-[#475467] group-hover:text-[#2864DC] transition-colors" />
            </div>
            <p className="text-[#475467] text-xs">eci.gov.in — National electoral management body</p>
          </a>

          <a
            href="https://voters.eci.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 border border-[#E4E7EC] rounded-2xl bg-[#F7F8FA] hover:border-[#2864DC]/40 hover:bg-white transition-all block text-xs group shadow-xs"
          >
            <div className="flex items-center justify-between font-bold text-[#172033] mb-1.5 text-sm">
              <span>National Voters' Services Portal (NVSP)</span>
              <ExternalLink className="w-4 h-4 text-[#475467] group-hover:text-[#2864DC] transition-colors" />
            </div>
            <p className="text-[#475467] text-xs">voters.eci.gov.in — Citizen voter services, registration, and forms</p>
          </a>
        </div>
      </div>
    </div>
  );
}
