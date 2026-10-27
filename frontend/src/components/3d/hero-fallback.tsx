"use client";

import Image from "next/image";
import { ShieldCheck, Eye, Compass, Layers } from "lucide-react";

export function HeroFallback({ reason = "loading" }: { reason?: "loading" | "unsupported" }) {
  return (
    <div
      className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-6 text-center select-none"
      role="img"
      aria-label="Monumental Four-Lion Capital sculpture representing four-directional vigilance and electoral transparency"
    >
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
        {/* Ambient Architectural Aura */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FFF4EC] via-[#EAF0FC] to-[#E7F6EE] opacity-80 blur-2xl" />

        {/* Circular Abacus Architectural Ring */}
        <div className="absolute w-[290px] h-[290px] sm:w-[350px] sm:h-[350px] rounded-full border border-[#E4E7EC] bg-white/60 shadow-lg backdrop-blur-xs flex items-center justify-center">
          <div className="w-[230px] h-[230px] sm:w-[280px] sm:h-[280px] rounded-full border border-dashed border-[#2864DC]/30 flex items-center justify-center">
            {/* Primary Emblem Graphic */}
            <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
              <Image
                src="/emblem.png"
                alt="Four-Lion Capital Emblem"
                fill
                priority
                className="object-contain filter drop-shadow-[0_16px_24px_rgba(23,32,51,0.18)]"
              />
            </div>
          </div>
        </div>

        {/* Four Cardinal Vigilance Markers */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white border border-[#E4E7EC] text-[10px] font-mono font-bold text-[#172033] shadow-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F07824]" />
          NORTH · VIGILANCE
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white border border-[#E4E7EC] text-[10px] font-mono font-bold text-[#172033] shadow-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14663F]" />
          SOUTH · INTEGRITY
        </div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-white border border-[#E4E7EC] text-[10px] font-mono font-bold text-[#172033] shadow-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2864DC]" />
          WEST · EVIDENCE
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-white border border-[#E4E7EC] text-[10px] font-mono font-bold text-[#172033] shadow-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#172033]" />
          EAST · CONSISTENCY
        </div>
      </div>

      {reason === "loading" && (
        <p className="mt-4 text-xs font-mono font-semibold text-[#475467] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2864DC] animate-ping" />
          INITIALIZING WEBGL 3D PERSPECTIVE ENGINE...
        </p>
      )}

      {reason === "unsupported" && (
        <p className="mt-4 text-xs text-[#475467] font-medium">
          Mauryan Four-Lion Capital — Monumental architectural emblem for four-directional civic oversight.
        </p>
      )}
    </div>
  );
}
