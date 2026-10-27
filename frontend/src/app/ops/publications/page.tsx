"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  FileCode2,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { publicationManifests } from "@/lib/data";

export default function OpsPublicationsPage() {
  const [publisherSignature, setPublisherSignature] = useState("");
  const [isSealed, setIsSealed] = useState(false);

  const handleSeal = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSealed(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default">Publisher Workspace</Badge>
          <span className="text-xs text-muted font-data">TWO-PERSON CUSTODY ENFORCEMENT</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Publication Manifest Authorization &amp; Sealing
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Cryptographically sign, seal, and publish validated aggregate electoral analytics manifests.
        </p>
      </div>

      {/* Two-Person Protocol Explanation */}
      <div className="p-4 bg-surface border border-border rounded-md text-xs space-y-2">
        <p className="font-bold text-foreground flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4 text-accent" />
          Mandatory Dual-Custody Publication Protocol
        </p>
        <p className="text-muted leading-relaxed">
          No finding or aggregate report can be released to the public portal without independent verification by two distinct cryptographic identities:
          a Primary Review Analyst and an Authorized Publisher.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Release Candidate (7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted">Draft Manifest</span>
              <p className="font-data font-bold text-foreground text-sm">CANDIDATE-PUB-2024-002</p>
            </div>
            <Badge variant="status-pending">Awaiting Publisher Countersign</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-background border border-border rounded">
              <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                Included Findings
              </span>
              <p className="font-semibold text-foreground">4 Approved Findings (Vidyanagar, Lakshminagar, Rajpur, Shantinagar)</p>
              <p className="text-muted text-[11px] mt-0.5">Dual-analyst verification completed on 2024-04-18</p>
            </div>

            <div className="p-3 bg-background border border-border rounded space-y-1 font-data text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Primary Analyst Signature:</span>
                <span className="text-verified font-bold">0x8f2a...c4b1 (VERIFIED)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Publisher Countersignature:</span>
                <span className={isSealed ? "text-verified font-bold" : "text-caution font-bold"}>
                  {isSealed ? "0x3e17...99df (SEALED)" : "PENDING AUTHORIZATION"}
                </span>
              </div>
            </div>

            {/* Countersign Form */}
            {!isSealed ? (
              <form onSubmit={handleSeal} className="pt-2 space-y-3">
                <div>
                  <label className="block font-semibold text-muted text-[10px] uppercase mb-1">
                    Publisher Hardware Token / Key Phrase
                  </label>
                  <input
                    type="password"
                    placeholder="Enter publisher authorization token"
                    defaultValue="publisher_hardware_key_secp256k1"
                    className="w-full bg-background border border-border rounded p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-foreground hover:bg-foreground/90 text-surface font-semibold rounded text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-accent" />
                  <span>Countersign &amp; Publish Manifest</span>
                </button>
              </form>
            ) : (
              <div className="p-4 bg-verified/10 border border-verified/30 rounded text-verified text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Manifest Successfully Sealed &amp; Published</p>
                  <p className="text-[11px] mt-0.5">Commitment hash broadcast to cryptographic ledger queue.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Published Manifests (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-md p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-verified" />
            Live Manifests
          </h2>

          <div className="space-y-3">
            {publicationManifests.map((m) => (
              <div key={m.id} className="p-3 bg-background border border-border rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-data font-bold text-foreground">{m.id}</span>
                  <Badge variant="verified">Live</Badge>
                </div>
                <p className="text-muted text-[11px]">Publisher: {m.publisher}</p>
                <p className="font-data text-[10px] text-muted truncate">
                  Manifest SHA: c9b84a37e19069695ea4c8853b08...
                </p>
                <div className="pt-2">
                  <Link
                    href={`/verify/${m.id}`}
                    className="text-accent hover:underline text-[11px] font-semibold"
                  >
                    View in public verifier &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
