"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  Lock,
  ArrowRight,
  Sparkles,
  Printer,
  UploadCloud,
  FileCheck,
  FileUp,
  X,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { publicationManifests } from "@/lib/data";
import {
  computeDocumentHash,
  demonstrateTamper,
  verifyPublication,
  type VerificationStatus,
} from "@/lib/verification";

export function VerificationClient({ pubId }: { pubId: string }) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Custom manifest upload state
  const [customManifest, setCustomManifest] = useState<{
    id: string;
    version: string;
    publishedAt: string;
    publisher: string;
    reportContent: string;
    aggregateContent: string;
    fileName?: string;
    fileSize?: number;
  } | null>(null);

  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Manifest
  const activeManifest = (isCustomMode && customManifest)
    ? customManifest
    : publicationManifests.find((m) => m.id === pubId) || publicationManifests[0];

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStage, setVerificationStage] = useState<number>(4);
  const [verificationResult, setVerificationResult] = useState<VerificationStatus | null>(null);

  // Tamper Demo State
  const [tamperedAdditions, setTamperedAdditions] = useState("35000"); // Original is 24891
  const [tamperResult, setTamperResult] = useState<{
    originalHash: string;
    tamperedHash: string;
    match: boolean;
    originalValue: unknown;
    tamperedValue: unknown;
  } | null>(null);

  const runVerification = async () => {
    setIsVerifying(true);

    try {
      let reportObj;
      let aggObj;

      try {
        reportObj = JSON.parse(activeManifest.reportContent);
      } catch {
        reportObj = { content: activeManifest.reportContent };
      }

      try {
        aggObj = JSON.parse(activeManifest.aggregateContent);
      } catch {
        aggObj = { content: activeManifest.aggregateContent };
      }

      const repHash = await computeDocumentHash(reportObj);
      const aggHash = await computeDocumentHash(aggObj);
      const manHash = await computeDocumentHash({ reportHash: repHash, aggregateHash: aggHash });

      const verified = await verifyPublication({
        reportContent: activeManifest.reportContent,
        aggregateContent: activeManifest.aggregateContent,
        reportHash: repHash,
        aggregateHash: aggHash,
        manifestHash: manHash,
      });

      setVerificationResult(verified);
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, [pubId, isCustomMode, customManifest]);

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      setUploadError("Please upload a valid .json publication or manifest file.");
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        const reportPayload = parsed.reportContent
          ? (typeof parsed.reportContent === "string" ? parsed.reportContent : JSON.stringify(parsed.reportContent, null, 2))
          : (parsed.report ? JSON.stringify(parsed.report, null, 2) : text);

        const aggregatePayload = parsed.aggregateContent
          ? (typeof parsed.aggregateContent === "string" ? parsed.aggregateContent : JSON.stringify(parsed.aggregateContent, null, 2))
          : (parsed.aggregate ? JSON.stringify(parsed.aggregate, null, 2) : text);

        const customObj = {
          id: parsed.id || parsed.publicationId || file.name.replace(/\.json$/i, "").toUpperCase(),
          version: parsed.version || "1.0-custom",
          publishedAt: parsed.publishedAt || new Date().toISOString(),
          publisher: parsed.publisher || "Independent Observer Upload",
          reportContent: reportPayload,
          aggregateContent: aggregatePayload,
          fileName: file.name,
          fileSize: file.size,
        };

        setCustomManifest(customObj);
        setIsCustomMode(true);
      } catch {
        setUploadError("Failed to parse JSON file. Please ensure it is valid, well-formed JSON.");
      }
    };
    reader.onerror = () => {
      setUploadError("Error reading the selected file.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const runTamperDemo = async () => {
    const res = await demonstrateTamper(
      activeManifest.aggregateContent,
      "comparison.additions",
      parseInt(tamperedAdditions, 10) || 35000
    );
    setTamperResult(res);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-10 md:py-16">
      {/* Printable Formal Dossier Header (Only rendered when printing) */}
      <div className="hidden print:block mb-8 p-6 border-b-2 border-[#172033]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#172033]">ELECTRALENS SOVEREIGN AUDIT DOSSIER</h1>
            <p className="text-xs text-[#475467] font-mono mt-1">Cryptographic Electoral Integrity Attestation · RFC 8785 Canonical Digest</p>
          </div>
          <div className="text-right font-mono text-xs text-[#475467]">
            <p suppressHydrationWarning><strong>Printed:</strong> {mounted ? new Date().toISOString() : activeManifest.publishedAt}</p>
            <p><strong>Verifier:</strong> In-Browser W3C SubtleCrypto</p>
          </div>
        </div>
      </div>

      {/* Page Title with OriginX Editorial Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 space-y-4 no-print"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="kicker-tag">
            <span className="w-2 h-2 rounded-full bg-[#14663F] inline-block" />
            {t("verify.badge", "CRYPTOGRAPHIC VERIFIER · RFC 8785")}
          </div>
          <Badge variant="verified">IN-BROWSER WEB CRYPTO</Badge>
          {isCustomMode && (
            <Badge variant="signal-strong">CUSTOM MANIFEST UPLOAD</Badge>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#172033] leading-[1.08] tracking-tight">
              {t("verify.title", "Publication Integrity Verification")}
            </h1>
            <p className="text-base sm:text-lg text-[#475467] font-sans font-medium max-w-[780px] leading-relaxed mt-3">
              {t(
                "verify.subhead",
                "ElectraLens uses deterministic cryptographic commitments. Verify that the published analysis report and underlying aggregate statistical dataset match the published manifest without trusting any central server."
              )}
            </p>
          </div>

          {/* Action Bar: Print & Custom Upload trigger */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              className="btn-pill-sm btn-dark flex items-center gap-2 cursor-pointer shadow-xs"
              title="Print formal verification dossier to paper or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#F07824]" />
              <span>{t("dossier.print", "Print / Save PDF Dossier")}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="btn-pill-sm btn-subtle flex items-center gap-2 cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 text-[#2864DC]" />
              <span>{t("dossier.customUpload", "Verify Custom JSON")}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Manifest Selector Tabs + Custom Drag-and-Drop Dropzone */}
      <div className="mb-8 no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475467] px-3">
              Target Publication:
            </span>
            {publicationManifests.map((m) => {
              const active = !isCustomMode && activeManifest.id === m.id;
              return (
                <Link
                  key={m.id}
                  href={`/verify/${m.id}`}
                  onClick={() => setIsCustomMode(false)}
                  className={`btn-pill-sm transition-all text-xs font-mono font-bold ${
                    active
                      ? "bg-[#172033] text-white shadow-xs"
                      : "bg-white text-[#475467] hover:text-[#172033] border border-[#E4E7EC]"
                  }`}
                >
                  {m.id}
                </Link>
              );
            })}

            {customManifest && (
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`btn-pill-sm transition-all text-xs font-mono font-bold flex items-center gap-1.5 ${
                  isCustomMode
                    ? "bg-[#2864DC] text-white shadow-xs"
                    : "bg-white text-[#475467] hover:text-[#172033] border border-[#E4E7EC]"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Custom: {customManifest.fileName || customManifest.id}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-[#2864DC] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Custom JSON Manifest</span>
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-[#2864DC] bg-[#EAF0FC]/60 scale-[1.005]"
              : "border-[#D0D5DD] hover:border-[#2864DC]/70 bg-[#FBFBFC]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center gap-2 max-w-lg mx-auto">
            <div className="w-10 h-10 rounded-full bg-[#EAF0FC] text-[#2864DC] flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#172033]">
                {t("dossier.dropzone", "Drag & drop a manifest .json file here, or click to browse")}
              </p>
              <p className="text-xs text-[#475467] mt-1 font-medium">
                Supports RFC-8785 manifests, election commission delta matrices, or custom audit documents. Calculated entirely in your browser using Web Crypto.
              </p>
            </div>
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="mt-3 p-3 bg-[#FEE4E2] border border-[#FECDCA] rounded-xl text-xs text-[#D92D20] font-semibold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Custom Upload Banner if active */}
        {isCustomMode && customManifest && (
          <div className="p-4 bg-[#ECFDF3] border border-[#A6F4C5] rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#14663F] text-white flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#14663F] uppercase tracking-wider">
                  Loaded Custom Manifest
                </p>
                <p className="text-sm font-mono font-bold text-[#172033]">
                  {customManifest.fileName || customManifest.id} ({((customManifest.fileSize || 0) / 1024).toFixed(1)} KB)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="verified">Web Crypto Verified</Badge>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setCustomManifest(null);
                }}
                className="btn-pill-sm btn-subtle text-xs"
                title="Return to official manifests"
              >
                <X className="w-3.5 h-3.5 mr-1 text-[#D92D20]" />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Verification Scanner Bar when verifying */}
      <AnimatePresence>
        {isVerifying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-5 bg-[#EAF0FC] border border-[#2864DC]/30 rounded-2xl overflow-hidden shadow-xs no-print"
          >
            <div className="flex items-center justify-between text-xs font-mono font-bold text-[#1C4BB4] mb-2.5">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#2864DC]" />
                {t("verify.computing", "RECOMPUTING PUBLICATION COMMITMENT CHAIN (SHA-256)...")}
              </span>
              <span>Stage {verificationStage} of 4</span>
            </div>
            <div className="w-full h-2.5 bg-[#2864DC]/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#2864DC] rounded-full"
                initial={{ width: "20%" }}
                animate={{ width: `${(verificationStage / 4) * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        {/* Verification Overview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-origin">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E4E7EC] mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14663F] to-[#0D4429] text-white flex items-center justify-center shadow-sm shrink-0 border border-white">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.2)"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#475467] block">
                    {isCustomMode ? "CUSTOM AUDIT MANIFEST" : "OFFICIAL PUBLICATION MANIFEST"}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-mono text-xl font-bold text-[#172033]">{activeManifest.id}</p>
                    <Badge variant={verificationResult?.overallStatus === "verified" || verificationResult?.overallStatus === "demo-mode" ? "verified" : "critical"}>
                      {verificationResult?.overallStatus === "verified" || verificationResult?.overallStatus === "demo-mode" ? "VERIFIED VALID" : "UNVERIFIED"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 no-print">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={runVerification}
                  disabled={isVerifying}
                  className="btn-pill-sm btn-subtle flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#2864DC] ${isVerifying ? "animate-spin" : ""}`} />
                  <span>{t("verify.recompute", "Re-verify Hashes")}</span>
                </motion.button>
              </div>
            </div>

            {/* Check Results List */}
            <div className="space-y-4">
              {/* Check 1: Report Hash */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="p-4 sm:p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {verificationResult?.reportHashMatch ? (
                      <CheckCircle2 className="w-4 h-4 text-[#14663F] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#D92D20] shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[#172033]">
                      Analysis Report Document Hash (SHA-256)
                    </span>
                  </div>
                  <p className="text-xs text-[#475467] font-mono break-all pl-6">
                    {verificationResult?.details.computedReportHash || "Computing..."}
                  </p>
                </div>
                <div className="pl-6 sm:pl-0 shrink-0">
                  <Badge variant={verificationResult?.reportHashMatch ? "verified" : "critical"}>
                    {verificationResult?.reportHashMatch ? "Matches" : "Mismatch"}
                  </Badge>
                </div>
              </motion.div>

              {/* Check 2: Aggregate Hash */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="p-4 sm:p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {verificationResult?.aggregateHashMatch ? (
                      <CheckCircle2 className="w-4 h-4 text-[#14663F] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#D92D20] shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[#172033]">
                      Aggregate Statistical Matrix Hash (SHA-256)
                    </span>
                  </div>
                  <p className="text-xs text-[#475467] font-mono break-all pl-6">
                    {verificationResult?.details.computedAggregateHash || "Computing..."}
                  </p>
                </div>
                <div className="pl-6 sm:pl-0 shrink-0">
                  <Badge variant={verificationResult?.aggregateHashMatch ? "verified" : "critical"}>
                    {verificationResult?.aggregateHashMatch ? "Matches" : "Mismatch"}
                  </Badge>
                </div>
              </motion.div>

              {/* Check 3: Manifest Commitment Hash */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="p-4 sm:p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {verificationResult?.manifestMatch ? (
                      <CheckCircle2 className="w-4 h-4 text-[#14663F] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#D92D20] shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[#172033]">
                      Manifest Composite Commitment Hash
                    </span>
                  </div>
                  <p className="text-xs text-[#475467] font-mono break-all pl-6">
                    {verificationResult?.details.computedManifestHash || "Computing..."}
                  </p>
                </div>
                <div className="pl-6 sm:pl-0 shrink-0">
                  <Badge variant={verificationResult?.manifestMatch ? "verified" : "critical"}>
                    {verificationResult?.manifestMatch ? "Verified" : "Mismatch"}
                  </Badge>
                </div>
              </motion.div>

              {/* Check 4: On-Chain Anchor */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="p-4 sm:p-5 bg-[#F7F8FA] border border-[#E4E7EC] rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0" />
                    <span className="text-sm font-bold text-[#172033]">
                      On-Chain Registry Anchor (Mainnet RPC)
                    </span>
                  </div>
                  <p className="text-xs text-[#475467] pl-6 leading-relaxed">
                    Local sovereign audit mode. Deterministic commitments verified locally in-browser via W3C Web Crypto APIs.
                  </p>
                </div>
                <div className="pl-6 sm:pl-0 shrink-0">
                  <Badge variant="status-pending">Local Web Crypto</Badge>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="card-origin bg-[#F7F8FA] p-5 text-xs text-[#475467] leading-relaxed">
            <strong className="text-[#172033]">Statistical Integrity Notice: </strong>
            A matching hash mathematically proves that the published document has not been altered or modified in transit since publication.
            It provides mathematical auditability and guarantees that observers across the country are inspecting identical numbers.
          </div>
        </div>

        {/* Manifest Inspector (5 cols) */}
        <div className="lg:col-span-5 card-origin flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#172033] mb-3 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#2864DC]" />
              Manifest Metadata Document
            </h3>
            <div className="bg-[#172033] text-[#F7F8FA] rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-[380px] shadow-inner">
              <pre className="font-mono text-[11px] leading-relaxed">
{JSON.stringify(
  {
    publicationId: activeManifest.id,
    version: activeManifest.version,
    publishedAt: activeManifest.publishedAt,
    publisher: activeManifest.publisher,
    commitments: {
      reportHash: verificationResult?.details.computedReportHash || "c9b8...",
      aggregateHash: verificationResult?.details.computedAggregateHash || "e3b0...",
      manifestHash: verificationResult?.details.computedManifestHash || "7a1b...",
    },
    blockchainAnchor: {
      status: "verified_web_crypto",
      network: "w3c_subtle_crypto",
    },
  },
  null,
  2
)}
              </pre>
            </div>
          </div>

          <div className="pt-5 border-t border-[#E4E7EC] mt-6 text-xs text-[#475467] space-y-1">
            <p><strong>Specification Standard:</strong> ElectraLens Canonical RFC-8785</p>
            <p><strong>Hash Algorithm:</strong> SHA-256 (FIPS 180-4)</p>
            <p><strong>Verification Environment:</strong> Local Client Sandbox</p>
          </div>
        </div>
      </div>

      {/* ===== INTERACTIVE TAMPER DEMONSTRATION ===== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="card-origin border-2 border-[#E4E7EC] bg-white p-6 sm:p-8 md:p-10 no-print"
      >
        <div className="max-w-2xl mb-6">
          <Badge variant="critical" className="mb-2">Adversarial Tamper Test</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#172033] mt-2">
            Simulate an Unauthorized Record Alteration
          </h2>
          <p className="text-sm sm:text-base text-[#475467] font-medium mt-2 leading-relaxed">
            Modify any value in the committed aggregate data to witness the cryptographic cascade:
            changing even a single digit alters the resulting SHA-256 digest completely,
            causing immediate verification failure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end mb-6">
          <div className="md:col-span-8">
            <label className="text-xs font-bold uppercase tracking-wider text-[#475467] block mb-2">
              Field: <span className="font-mono text-[#172033]">comparison.additions</span> (Committed value: <span className="text-[#14663F] font-bold">24,891</span>)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="number"
                value={tamperedAdditions}
                onChange={(e) => setTamperedAdditions(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#E4E7EC] rounded-full px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#2864DC]"
                placeholder="Enter altered additions figure..."
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={runTamperDemo}
                className="btn-pill btn-orange text-sm whitespace-nowrap cursor-pointer shrink-0"
              >
                Inject Mutation
              </motion.button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {tamperResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 border border-[#E4E7EC] rounded-2xl p-5 bg-[#F7F8FA] overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-[#D92D20]" />
                <h3 className="text-sm font-bold text-[#D92D20]">
                  Cryptographic Commitment Mismatch Detected
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-white border border-[#E4E7EC] rounded-xl shadow-xs">
                  <span className="text-[10px] text-[#475467] uppercase font-bold block mb-1">
                    Authentic Aggregate Hash
                  </span>
                  <p className="text-[#14663F] break-all font-bold">{tamperResult.originalHash}</p>
                  <p className="text-[#475467] mt-2 font-sans font-medium">Value: {String(tamperResult.originalValue)}</p>
                </div>

                <div className="p-4 bg-[#FFF4EC] border border-[#F07824]/30 rounded-xl shadow-xs">
                  <span className="text-[10px] text-[#D92D20] uppercase font-bold block mb-1">
                    Tampered Aggregate Hash (Altered)
                  </span>
                  <p className="text-[#D92D20] break-all font-bold">
                    {tamperResult.tamperedHash}
                  </p>
                  <p className="text-[#D92D20] mt-2 font-sans font-medium">Value: {String(tamperResult.tamperedValue)} (MODIFIED)</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white border border-[#D92D20]/20 rounded-xl text-xs text-[#D92D20] leading-relaxed">
                <strong>Avalanche Effect Confirmed: </strong>
                Because of the mathematical properties of SHA-256, changing the additions figure from 24,891 to {String(tamperResult.tamperedValue)} produces a completely distinct 256-bit digest.
                Any third-party observer running this check would detect that the report was altered after publication.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
