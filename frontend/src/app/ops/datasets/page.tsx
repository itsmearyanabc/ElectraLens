"use client";

import { useState } from "react";
import { Database, Upload, CheckCircle2, ShieldCheck, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { datasetVersions } from "@/lib/data";
import { formatNumber, formatDate } from "@/lib/utils";

export default function OpsDatasetsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const simulateUpload = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default">Data Steward Workspace</Badge>
          <span className="text-xs text-muted font-data">INGESTION &amp; CANONICALIZATION</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Electoral Roll Ingestion &amp; Registry
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Upload raw electoral snapshots, trigger deterministic canonicalization, and compute immutable SHA-256 signatures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Upload Form (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-md p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" />
            Ingest New Roll Snapshot (Steward Only)
          </h2>

          <form onSubmit={simulateUpload} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-muted mb-1 text-[10px] uppercase">
                Snapshot Identifier
              </label>
              <input
                type="text"
                defaultValue="v2024-Q4-draft"
                className="w-full bg-background border border-border rounded p-2.5 font-data text-foreground"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1 text-[10px] uppercase">
                Release Date
              </label>
              <input
                type="date"
                defaultValue="2024-10-01"
                className="w-full bg-background border border-border rounded p-2.5 text-foreground"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1 text-[10px] uppercase">
                Raw Roll Archive (CSV / JSON Lines)
              </label>
              <div className="border-2 border-dashed border-border rounded p-6 text-center bg-background/50">
                <Upload className="w-6 h-6 text-muted mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-foreground text-xs">Drop synthetic electoral roll archive here</p>
                <p className="text-[10px] text-muted mt-0.5">Maximum archive size: 2.5 GB</p>
              </div>
            </div>

            <div className="p-3 bg-background border border-border rounded text-[11px] text-muted space-y-1">
              <p className="font-semibold text-foreground">Automated Ingestion Protocol:</p>
              <p>1. Normalizes text encoding to UTF-8 NFC</p>
              <p>2. Salting &amp; pseudonymization of private citizen identities</p>
              <p>3. Generates canonical Merkle leaf hashes</p>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 px-4 bg-foreground hover:bg-foreground/90 text-surface font-semibold rounded text-xs transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Canonicalizing &amp; Computing Signatures...</span>
                </>
              ) : (
                <span>Validate &amp; Ingest Snapshot</span>
              )}
            </button>
          </form>

          {uploadSuccess && (
            <div className="mt-4 p-3 bg-verified/10 border border-verified/20 rounded text-verified text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Snapshot ingested successfully and queued for differential audit run.</span>
            </div>
          )}
        </div>

        {/* Existing Datasets (7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-md p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-verified" />
            Verified Ingested Snapshots
          </h2>

          <div className="space-y-4">
            {datasetVersions.map((v) => (
              <div key={v.id} className="p-4 bg-background border border-border rounded text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-data font-bold text-foreground">{v.id}</span>
                    <Badge variant="verified">Canonicalized</Badge>
                  </div>
                  <span className="font-data font-bold text-foreground">
                    {formatNumber(v.totalRecords)} records
                  </span>
                </div>

                <p className="text-muted">{v.label} · Snapshot date: {formatDate(v.date)}</p>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-[10px] uppercase font-semibold text-muted block">
                    Cryptographic Root Hash (SHA-256)
                  </span>
                  <p className="font-data text-[11px] text-accent break-all select-all">
                    {v.hash}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
