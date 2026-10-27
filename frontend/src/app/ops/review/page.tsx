"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  Send,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { findings, type Finding } from "@/lib/data";

export default function OpsReviewQueuePage() {
  const [selectedFinding, setSelectedFinding] = useState<Finding>(findings[0]);
  const [analystNotes, setAnalystNotes] = useState(
    "Verified against local residential construction registers. Substantial demographic growth in Ward 4 confirmed."
  );
  const [reviewStatus, setReviewStatus] = useState<string>(findings[0].reviewStatus);
  const [actionSuccess, setActionSuccess] = useState(false);

  const handleApprove = () => {
    setReviewStatus("reviewed");
    setActionSuccess(true);
    setTimeout(() => setActionSuccess(false), 3000);
  };

  const handleDispute = () => {
    setReviewStatus("disputed");
    setActionSuccess(true);
    setTimeout(() => setActionSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default">Reviewer &amp; Analyst Queue</Badge>
          <span className="text-xs text-muted font-data">STAGE: DUAL-ANALYST EVALUATION</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Statistical Finding Review Queue
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Evaluate flagged statistical anomalies, confirm non-malicious hypotheses, and authorize candidates for publication.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Finding List Selector (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-md p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground mb-3">
            Queue Candidates ({findings.length})
          </h2>

          <div className="space-y-2">
            {findings.map((f) => {
              const isSelected = selectedFinding.id === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFinding(f)}
                  className={`p-3.5 border rounded cursor-pointer transition-all text-xs ${
                    isSelected
                      ? "border-accent bg-accent/5"
                      : "border-border hover:bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-data font-bold text-foreground">{f.id}</span>
                    <Badge variant={f.signalStrength === "strong" ? "signal-strong" : "signal-moderate"}>
                      {f.signalStrength}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground">{f.ruleName}</p>
                  <p className="text-muted text-[11px] truncate mt-0.5">{f.area}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Review Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-md p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-data text-xs font-bold text-accent">
                {selectedFinding.id} · {selectedFinding.ruleId}
              </span>
              <Badge variant={`status-${reviewStatus}` as any}>
                Status: {reviewStatus}
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {selectedFinding.ruleName}
            </h2>
            <p className="text-xs text-muted mt-0.5">{selectedFinding.area}</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <p className="font-semibold text-muted text-[10px] uppercase mb-1">
                Observed vs. Baseline Aggregate
              </p>
              <div className="grid grid-cols-3 gap-3 p-3 bg-background border border-border rounded font-data">
                <div>
                  <span className="text-[10px] text-muted block">Observed Value</span>
                  <span className="text-sm font-bold text-foreground">{selectedFinding.observedValue}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Expected Baseline</span>
                  <span className="text-sm font-bold text-foreground">{selectedFinding.expectedBaseline}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Rate Ratio</span>
                  <span className="text-sm font-bold text-accent">{selectedFinding.rateRatio}×</span>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold text-muted text-[10px] uppercase mb-1">
                Neutral Summary
              </p>
              <p className="p-3 bg-background border border-border rounded text-foreground/80 leading-relaxed">
                {selectedFinding.explanation}
              </p>
            </div>

            <div>
              <p className="font-semibold text-muted text-[10px] uppercase mb-1">
                Plausible Alternative Explanations Verified
              </p>
              <ul className="list-disc list-inside p-3 bg-background border border-border rounded text-muted space-y-1">
                {selectedFinding.alternativeExplanations.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </div>

            {/* Analyst Review Form */}
            <div>
              <label className="block font-semibold text-muted text-[10px] uppercase mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Staff Review Notes &amp; Justification
              </label>
              <textarea
                rows={3}
                value={analystNotes}
                onChange={(e) => setAnalystNotes(e.target.value)}
                className="w-full bg-background border border-border rounded p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-muted">
                Requires: Primary Analyst Signoff + Peer Auditor Review
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDispute}
                  className="px-4 py-2 border border-critical/30 hover:bg-critical/10 text-critical font-semibold rounded text-xs transition-colors"
                >
                  Flag as Disputed
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-verified hover:bg-verified/90 text-surface font-semibold rounded text-xs transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Approve for Publication
                </button>
              </div>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-verified/10 border border-verified/20 rounded text-verified text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Review state recorded in immutable internal audit log.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
