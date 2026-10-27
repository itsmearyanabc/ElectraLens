"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Database,
  PlayCircle,
  CheckSquare,
  Send,
  FileText,
  Settings,
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";

const opsNav = [
  { href: "/ops", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ops/datasets", label: "Datasets", icon: Database },
  { href: "/ops/review", label: "Review Queue", icon: CheckSquare },
  { href: "/ops/publications", label: "Publications", icon: Send },
  { href: "/ops/audit-log", label: "Audit Log", icon: FileText },
  { href: "/ops/settings", label: "Settings", icon: Settings },
];

function OpsContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeRole, setActiveRole] = useState<
    "Analyst" | "Reviewer" | "Publisher" | "Data Steward" | "Auditor" | "Admin"
  >("Reviewer");

  if (pathname === "/ops/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F3F2EC] flex flex-col">
      {/* Top Warning Banner for Ops Demo Adapter */}
      <div className="bg-[#1E1F1D] text-[#F7F6F2] px-4 py-1.5 text-[11px] font-data flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-semibold text-accent">RESTRICTED OPS ENVIRONMENT</span>
          <span className="text-white/60 hidden sm:inline">• Demo Adapter Mode (Backend Auth Simulated)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 hidden md:inline">Active Role:</span>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as any)}
            className="bg-black/50 text-white text-[11px] border border-white/20 rounded px-2 py-0.5"
          >
            <option value="Data Steward">Data Steward</option>
            <option value="Analyst">Analyst</option>
            <option value="Reviewer">Reviewer</option>
            <option value="Publisher">Publisher</option>
            <option value="Auditor">Security Auditor</option>
            <option value="Admin">System Administrator</option>
          </select>
          <Link href="/" className="text-white/60 hover:text-white underline text-[11px]">
            Exit
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-60 bg-surface border-r border-border shrink-0 p-4 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="px-2">
              <Link href="/ops" className="flex items-center gap-2 font-bold text-foreground">
                <Image
                  src="/emblem.png"
                  alt="ElectraLens Emblem"
                  width={24}
                  height={24}
                  className="h-6 w-auto object-contain"
                />
                <span className="text-base tracking-tight font-serif">ElectraLens</span>
                <span className="text-[10px] bg-dark-surface text-dark-text px-1.5 py-0.5 rounded font-data">
                  OPS
                </span>
              </Link>
              <p className="text-[10px] text-muted font-data mt-1">INTERNAL AUDIT CONSOLE</p>
            </div>

            <nav className="space-y-1 text-xs">
              {opsNav.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded transition-colors font-medium ${
                      isActive
                        ? "bg-foreground text-surface"
                        : "text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-border px-2 text-[11px] space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <User className="w-3.5 h-3.5 text-accent" />
              <span>operator_demo@electralens</span>
            </div>
            <p className="text-[10px] text-muted">MFA Token Verified (Hardware)</p>
            <Link
              href="/ops/login"
              className="inline-flex items-center gap-1.5 text-critical hover:underline text-[11px] pt-1"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </Link>
          </div>
        </aside>

        {/* Main Ops Content */}
        <main className="flex-1 p-6 md:p-10 max-w-[1300px] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F3F2EC] p-8 text-xs text-muted font-data">Loading ops workspace...</div>}>
      <OpsContent>{children}</OpsContent>
    </Suspense>
  );
}
