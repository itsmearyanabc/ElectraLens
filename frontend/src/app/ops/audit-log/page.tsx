"use client";

import { useState } from "react";
import { FileText, ShieldCheck, Filter, Search, Lock, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const auditEvents = [
  {
    id: "EVT-2024-0091",
    timestamp: "2024-04-20 14:00:02 UTC",
    actor: "publisher_auth_2",
    action: "MANIFEST_SEALED",
    target: "PUB-2024-001 (Rev 1)",
    hash: "c9b84a37e19069695ea4c8853b0821ecdd61c9e83ec50f681a96574fbcda71eb",
    status: "CONFIRMED",
  },
  {
    id: "EVT-2024-0090",
    timestamp: "2024-04-18 11:20:15 UTC",
    actor: "analyst_reviewer_1",
    action: "FINDING_APPROVED",
    target: "FND-2024-001 (Vidyanagar)",
    hash: "a3f8c2d1e5b9a7f4c8d2e6b1a5f9c3d7e8b2a6f1c5d9e3b7a4f8c2d6e1b5a9",
    status: "CONFIRMED",
  },
  {
    id: "EVT-2024-0089",
    timestamp: "2024-04-18 10:45:00 UTC",
    actor: "analyst_reviewer_1",
    action: "FINDING_APPROVED",
    target: "FND-2024-002 (Lakshminagar)",
    hash: "b7d4e9a2f6c1b8d5e3a9f7c4b2d8e6a1f5c9b3d7e4a8f2c6b1d5e9a3f7c2b8",
    status: "CONFIRMED",
  },
  {
    id: "EVT-2024-0088",
    timestamp: "2024-04-15 10:48:42 UTC",
    actor: "pipeline_runner_cron",
    action: "PIPELINE_RUN_COMPLETED",
    target: "RUN-2024-04-15",
    hash: "7a1b9c3e5d2f8a4e6b0c2d8f4a6e8b2c4d6f8a0e2b4c6d8f0a2e4b6c8d0f2a4",
    status: "CONFIRMED",
  },
  {
    id: "EVT-2024-0087",
    timestamp: "2024-04-01 09:12:00 UTC",
    actor: "steward_ingest_1",
    action: "DATASET_CANONICALIZED",
    target: "v2024-Q2-final",
    hash: "b7d4e9a2f6c1b8d5e3a9f7c4b2d8e6a1f5c9b3d7e4a8f2c6b1d5e9a3f7c2b8",
    status: "CONFIRMED",
  },
];

export default function OpsAuditLogPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = auditEvents.filter(
    (e) =>
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default">Security Auditor Workspace</Badge>
          <span className="text-xs text-muted font-data">APPEND-ONLY AUDIT CHAIN</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Cryptographic Operations Audit Trail
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Every operator action, ingestion event, review decision, and publication commitment is signed and recorded.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Lock className="w-3.5 h-3.5 text-verified" />
            <span>Cryptographic Hash-Chained Verification Active</span>
          </div>
        </div>

        <div className="border border-border rounded overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border text-muted text-[10px] uppercase font-semibold">
                <th className="py-2.5 px-3 text-left">Event ID</th>
                <th className="py-2.5 px-3 text-left">Timestamp (UTC)</th>
                <th className="py-2.5 px-3 text-left">Operator Identity</th>
                <th className="py-2.5 px-3 text-left">Action Trigger</th>
                <th className="py-2.5 px-3 text-left">Target Entity</th>
                <th className="py-2.5 px-3 text-left">Cryptographic Signature</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-background/40">
                  <td className="py-2.5 px-3 font-data font-bold text-foreground">{log.id}</td>
                  <td className="py-2.5 px-3 text-muted text-[11px] whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2.5 px-3 font-data text-foreground">{log.actor}</td>
                  <td className="py-2.5 px-3 font-semibold text-accent">{log.action}</td>
                  <td className="py-2.5 px-3 text-foreground">{log.target}</td>
                  <td className="py-2.5 px-3 font-data text-muted text-[10px] max-w-[140px] truncate" title={log.hash}>
                    {log.hash.substring(0, 16)}...
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge variant="verified">VERIFIED</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
