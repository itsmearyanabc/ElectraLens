"use client";

import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Database,
  CheckSquare,
  Send,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { findings, datasetVersions, publicationManifests } from "@/lib/data";

export default function OpsDashboardPage() {
  const pendingReview = findings.filter((f) => f.reviewStatus === "pending");
  const reviewed = findings.filter((f) => f.reviewStatus === "reviewed");
  const published = findings.filter((f) => f.reviewStatus === "published");

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default">Audit Operations Center</Badge>
          <span className="text-xs text-muted font-data">CLUSTER: PROD-SYNTHETIC</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Operations Executive Dashboard
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Monitoring pipeline executions, reviewer backlogs, dual-custody publications, and ledger sync.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span>Pending Review</span>
            <AlertTriangle className="w-4 h-4 text-caution" />
          </div>
          <p className="font-data text-2xl font-bold text-caution">{pendingReview.length}</p>
          <p className="text-[10px] text-muted mt-1">Requires dual-signoff</p>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span>Reviewed Awaiting Publish</span>
            <CheckSquare className="w-4 h-4 text-accent" />
          </div>
          <p className="font-data text-2xl font-bold text-accent">{reviewed.length}</p>
          <p className="text-[10px] text-muted mt-1">Ready for manifest seal</p>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span>Active Datasets</span>
            <Database className="w-4 h-4 text-verified" />
          </div>
          <p className="font-data text-2xl font-bold text-foreground">{datasetVersions.length}</p>
          <p className="text-[10px] text-muted mt-1">Hashed &amp; canonicalized</p>
        </div>

        <div className="bg-surface border border-border rounded-md p-4">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span>Published Manifests</span>
            <Send className="w-4 h-4 text-foreground" />
          </div>
          <p className="font-data text-2xl font-bold text-foreground">{publicationManifests.length}</p>
          <p className="text-[10px] text-muted mt-1">SHA-256 anchored</p>
        </div>
      </div>

      {/* Pipeline Runs Table */}
      <div className="bg-surface border border-border rounded-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Recent Pipeline Audit Runs
          </h2>
          <Link
            href="/ops/runs/RUN-2024-04-15"
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            <span>View execution logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="border border-border rounded overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border text-muted text-[10px] uppercase font-semibold">
                <th className="py-2.5 px-3 text-left">Run ID</th>
                <th className="py-2.5 px-3 text-left">Snapshot Comparison</th>
                <th className="py-2.5 px-3 text-left">Started At</th>
                <th className="py-2.5 px-3 text-right">Records Evaluated</th>
                <th className="py-2.5 px-3 text-right">Anomalies Detected</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr className="hover:bg-background/40">
                <td className="py-2.5 px-3 font-data font-bold text-foreground">
                  <Link href="/ops/runs/RUN-2024-04-15" className="text-accent hover:underline">
                    RUN-2024-04-15
                  </Link>
                </td>
                <td className="py-2.5 px-3 font-data text-muted">v2024-Q1-draft → v2024-Q2-final</td>
                <td className="py-2.5 px-3 text-muted">2024-04-15 10:30 UTC</td>
                <td className="py-2.5 px-3 text-right font-data">1,862,847</td>
                <td className="py-2.5 px-3 text-right font-data font-bold text-caution">5</td>
                <td className="py-2.5 px-3 text-right">
                  <Badge variant="verified">COMPLETED</Badge>
                </td>
              </tr>
              <tr className="hover:bg-background/40">
                <td className="py-2.5 px-3 font-data font-bold text-foreground">
                  <span className="text-muted">RUN-2024-01-18</span>
                </td>
                <td className="py-2.5 px-3 font-data text-muted">v2023-Q4-final → v2024-Q1-draft</td>
                <td className="py-2.5 px-3 text-muted">2024-01-18 14:15 UTC</td>
                <td className="py-2.5 px-3 text-right font-data">1,847,293</td>
                <td className="py-2.5 px-3 text-right font-data font-bold text-muted">2</td>
                <td className="py-2.5 px-3 text-right">
                  <Badge variant="default">ARCHIVED</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Dual-Custody Action Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-md p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-caution" />
            Urgent Review Items
          </h3>
          <p className="text-xs text-muted">
            Findings flagged with strong statistical signal requiring analyst review and alternative hypothesis confirmation.
          </p>
          <div className="space-y-2 pt-1">
            {pendingReview.concat(reviewed).slice(0, 3).map((f) => (
              <div
                key={f.id}
                className="p-3 bg-background border border-border rounded flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-data font-bold text-foreground">{f.id}</span>
                  <p className="text-muted text-[11px]">{f.area}</p>
                </div>
                <Link
                  href="/ops/review"
                  className="px-2.5 py-1 bg-surface border border-border rounded text-[11px] font-semibold hover:bg-border/30 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-accent" />
            Two-Person Publication Rule Status
          </h3>
          <p className="text-xs text-muted">
            In accordance with security requirements, no finding or manifest can be published without independent signoff by both an Analyst and a Publisher.
          </p>
          <div className="p-3 bg-background border border-border rounded text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">Primary Analyst Review:</span>
              <span className="font-bold text-verified">✓ Signed (analyst_1)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Secondary Publisher Countersign:</span>
              <span className="font-bold text-caution">⏳ Pending Seal</span>
            </div>
          </div>
          <Link
            href="/ops/publications"
            className="block text-center py-2 px-3 bg-foreground text-surface rounded text-xs font-semibold hover:bg-foreground/90 transition-colors"
          >
            Open Publication Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
