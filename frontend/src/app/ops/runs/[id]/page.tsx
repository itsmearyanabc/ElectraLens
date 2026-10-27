import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function generateStaticParams() {
  return [{ id: "RUN-2024-04-15" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OpsRunDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/ops"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to operations console
        </Link>
      </div>

      {/* Header */}
      <div className="bg-surface border border-border rounded-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-data text-sm font-bold bg-background px-2.5 py-1 border border-border rounded">
              {id}
            </span>
            <Badge variant="verified">COMPLETED SUCCESSFULLY</Badge>
          </div>
          <span className="text-xs text-muted font-data">Execution Time: 18m 42s</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          Differential Audit Pipeline Execution
        </h1>
        <p className="text-xs text-muted font-data">
          Target: v2024-Q1-draft → v2024-Q2-final · Initiated by automated cron dispatcher
        </p>
      </div>

      {/* Stage Progression */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { step: "Stage 1", name: "Record Ingestion", status: "Done (1.86M rows)", time: "3m 12s" },
          { step: "Stage 2", name: "Differential Diffing", status: "Done (+24.8K, -9.3K)", time: "6m 40s" },
          { step: "Stage 3", name: "Rule Evaluation", status: "Done (14 tests)", time: "5m 18s" },
          { step: "Stage 4", name: "FDR Q-Value Compute", status: "Done (5 anomalies)", time: "3m 32s" },
        ].map((stage, idx) => (
          <div key={idx} className="bg-surface border border-border rounded p-4 text-xs">
            <div className="flex items-center justify-between text-muted text-[10px] uppercase font-semibold mb-1">
              <span>{stage.step}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-verified" />
            </div>
            <p className="font-bold text-foreground text-sm">{stage.name}</p>
            <p className="text-muted text-[11px] mt-1">{stage.status}</p>
            <p className="font-data text-[10px] text-muted/60 mt-0.5">Elapsed: {stage.time}</p>
          </div>
        ))}
      </div>

      {/* Execution Console Logs */}
      <div className="bg-surface border border-border rounded-md p-6">
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          Pipeline Execution Logs (Standard Output)
        </h2>

        <div className="bg-[#151614] text-[#E4E4DC] rounded-md p-4 font-data text-xs overflow-x-auto max-h-[400px] leading-relaxed">
          <p className="text-white/40">[2024-04-15 10:30:00 UTC] INFO: Initializing differential pipeline engine v1.0.0...</p>
          <p className="text-white/40">[2024-04-15 10:30:02 UTC] INFO: Loading baseline roll snapshot v2024-Q1-draft (1,847,293 records)...</p>
          <p className="text-white/40">[2024-04-15 10:31:45 UTC] INFO: Loading target roll snapshot v2024-Q2-final (1,862,847 records)...</p>
          <p className="text-white/40">[2024-04-15 10:33:12 UTC] INFO: Performing deterministic identifier join across 14 assembly constituencies...</p>
          <p className="text-verified">[2024-04-15 10:39:52 UTC] SUCCESS: Differential matrix computed: 24,891 additions, 9,337 deletions, 3,842 corrections.</p>
          <p className="text-white/40">[2024-04-15 10:40:01 UTC] INFO: Executing RULE-ADD-01 (Unusual Addition Rate) across 14 geographic subunits...</p>
          <p className="text-caution">[2024-04-15 10:41:20 UTC] WARN: Subunit SYN-VID-01 addition rate (4.38%) exceeds 1.5x baseline average (2.34%).</p>
          <p className="text-caution">[2024-04-15 10:41:21 UTC] WARN: Subunit SYN-SHA-01 addition rate (4.03%) exceeds 1.5x baseline average (2.34%).</p>
          <p className="text-white/40">[2024-04-15 10:42:00 UTC] INFO: Executing RULE-DEL-01 (Unusual Deletion Rate)...</p>
          <p className="text-caution">[2024-04-15 10:42:45 UTC] WARN: Subunit SYN-LAK-01 deletion rate (2.30%) exceeds 1.5x baseline average (1.06%).</p>
          <p className="text-white/40">[2024-04-15 10:44:10 UTC] INFO: Executing Benjamini-Hochberg False Discovery Rate correction (m=14)...</p>
          <p className="text-verified">[2024-04-15 10:48:42 UTC] SUCCESS: 5 findings generated. Writing to review queue with status: PENDING_REVIEW.</p>
        </div>
      </div>
    </div>
  );
}
