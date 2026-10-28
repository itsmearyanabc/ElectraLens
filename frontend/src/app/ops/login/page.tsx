"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, ShieldCheck, KeyRound, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function OpsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("steward@electralens.internal");
  const [role, setRole] = useState("Reviewer");
  const [mfaCode, setMfaCode] = useState("892144");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/ops");
  };

  return (
    <div className="min-h-screen bg-[#1E1F1D] text-[#F7F6F2] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#252623] border border-white/10 rounded-md p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center mb-4">
            <Image
              src="/emblem.png"
              alt="ElectraLens Emblem"
              width={64}
              height={64}
              className="h-16 w-auto object-contain mb-2"
            />
            <div className="inline-flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white font-serif">Electra</span>
              <span className="text-xl font-bold tracking-tight text-[#C58B39] font-serif">Lens</span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-data text-white/80 ml-1">
                OPS
              </span>
            </div>
          </div>
          <h1 className="text-lg font-bold text-white">Internal Operations Authentication</h1>
          <p className="text-xs text-white/60 mt-1">
            Access restricted to verified data stewards, analysts, and reviewers.
          </p>
        </div>

        {/* Google SSO Authentication */}
        <div className="mb-6">
          <GoogleSignInButton callbackUrl="/ops" label="Sign in with Google Workspace" />
          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#252623] px-3 text-[10px] uppercase font-bold tracking-wider text-white/40 absolute">
              Or use simulated credentials
            </span>
          </div>
        </div>

        {/* Demo Adapter Notice */}
        <div className="p-3 bg-caution/10 border border-caution/30 rounded mb-6 text-xs text-caution flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Simulated Demo Gateway:</strong> Dual-factor authentication &amp; role credentials are pre-filled for hackathon evaluation.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-white/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Operator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded p-2.5 text-white focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Assigned Role Profile
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded p-2.5 text-white focus:outline-none focus:border-accent"
            >
              <option value="Data Steward">Data Steward (Ingestion &amp; Schema)</option>
              <option value="Analyst">Analyst (Pipeline Execution)</option>
              <option value="Reviewer">Reviewer (Finding Validation)</option>
              <option value="Publisher">Publisher (Manifest Signoff)</option>
              <option value="Auditor">Security Auditor (Cryptographic Audit)</option>
            </select>
          </div>

          <div>
            <label className="block text-white/70 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Hardware Security Key / MFA Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded p-2.5 font-data text-white focus:outline-none focus:border-accent"
                required
              />
              <KeyRound className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded text-xs transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <span>Authenticate Session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <Link href="/" className="text-xs text-white/50 hover:text-white underline">
            &larr; Return to public portal
          </Link>
        </div>
      </div>
    </div>
  );
}
