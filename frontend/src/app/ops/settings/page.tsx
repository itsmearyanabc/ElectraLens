"use client";

import { useState } from "react";
import { Settings, Shield, Sliders, CheckCircle2, Lock, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OpsSettingsPage() {
  const [fdrThreshold, setFdrThreshold] = useState("0.05");
  const [rateRatioThreshold, setRateRatioThreshold] = useState("1.50");
  const [kAnonymityLimit, setKAnonymityLimit] = useState("10");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-[960px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default">System Administrator</Badge>
          <span className="text-xs text-muted font-data">PLATFORM CONFIGURATION</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Operations &amp; Algorithmic Parameters
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Configure analytical thresholds, role authorization requirements, and privacy suppression parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Statistical Thresholds */}
        <div className="bg-surface border border-border rounded-md p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            Statistical Detection Thresholds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-muted text-[10px] uppercase mb-1">
                FDR Significance Ceiling (q-value)
              </label>
              <input
                type="text"
                value={fdrThreshold}
                onChange={(e) => setFdrThreshold(e.target.value)}
                className="w-full bg-background border border-border rounded p-2 text-foreground font-data"
              />
              <p className="text-[10px] text-muted mt-1">
                Anomalies exceeding this threshold are categorized as weak signals.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-muted text-[10px] uppercase mb-1">
                Rate Ratio Multiplier Floor
              </label>
              <input
                type="text"
                value={rateRatioThreshold}
                onChange={(e) => setRateRatioThreshold(e.target.value)}
                className="w-full bg-background border border-border rounded p-2 text-foreground font-data"
              />
              <p className="text-[10px] text-muted mt-1">
                Minimum fold deviation from the baseline distribution required to flag an anomaly.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Parameters */}
        <div className="bg-surface border border-border rounded-md p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-verified" />
            Identity Protection &amp; Suppression
          </h2>

          <div>
            <label className="block font-semibold text-muted text-[10px] uppercase mb-1">
              Minimum Group Size for Public Aggregates (k-Anonymity)
            </label>
            <input
              type="text"
              value={kAnonymityLimit}
              onChange={(e) => setKAnonymityLimit(e.target.value)}
              className="w-full sm:w-48 bg-background border border-border rounded p-2 text-foreground font-data"
            />
            <p className="text-[10px] text-muted mt-1">
              Any demographic subdivision with fewer than this number of citizens is automatically suppressed.
            </p>
          </div>
        </div>

        {/* Role Matrix */}
        <div className="bg-surface border border-border rounded-md p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-foreground" />
            Role-Based Authorization Matrix
          </h2>

          <div className="border border-border rounded overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border text-muted text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-3 text-left">Role</th>
                  <th className="py-2.5 px-3 text-center">Dataset Ingest</th>
                  <th className="py-2.5 px-3 text-center">Execute Audit</th>
                  <th className="py-2.5 px-3 text-center">Review Finding</th>
                  <th className="py-2.5 px-3 text-center">Seal Publication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  { role: "Data Steward", ingest: "✓", run: "—", review: "—", publish: "—" },
                  { role: "Analyst", ingest: "—", run: "✓", review: "✓ (Primary)", publish: "—" },
                  { role: "Reviewer", ingest: "—", run: "—", review: "✓ (Secondary)", publish: "—" },
                  { role: "Publisher", ingest: "—", run: "—", review: "—", publish: "✓ (Countersign)" },
                  { role: "Security Auditor", ingest: "Read", run: "Read", review: "Read", publish: "Read" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-background/40">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{row.role}</td>
                    <td className="py-2.5 px-3 text-center font-data text-muted">{row.ingest}</td>
                    <td className="py-2.5 px-3 text-center font-data text-muted">{row.run}</td>
                    <td className="py-2.5 px-3 text-center font-data text-muted">{row.review}</td>
                    <td className="py-2.5 px-3 text-center font-data text-muted">{row.publish}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs text-verified font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Parameters saved &amp; logged to audit chain.
            </span>
          ) : (
            <span className="text-xs text-muted">All parameter changes require admin cryptographic approval.</span>
          )}

          <button
            type="submit"
            className="py-2 px-5 bg-foreground hover:bg-foreground/90 text-surface font-semibold rounded text-xs transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
