"use client";

import React from "react";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function PrintButton({
  label = "Print / Export Dossier",
  className = "",
  size = "sm",
}: PrintButtonProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`btn-pill-sm btn-subtle inline-flex items-center gap-2 cursor-pointer no-print ${className}`}
      title="Generate formal PDF dossier via browser print dialog"
    >
      <Printer className="w-3.5 h-3.5 text-[#2864DC]" />
      <span>{label}</span>
    </button>
  );
}
