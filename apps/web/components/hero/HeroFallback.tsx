/** Shown while the 3D scene loads, and instead of it where WebGL is unavailable. */
export function HeroFallback({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-full w-full items-center justify-center select-none"
    >
      <div className="relative flex h-[300px] w-[300px] items-center justify-center rounded-full border border-line bg-white/60 shadow-lg sm:h-[360px] sm:w-[360px]">
        <div className="flex h-[78%] w-[78%] items-center justify-center rounded-full border border-dashed border-blue/30">
          <img src="/emblem.png" alt="" className="h-[70%] w-[70%] object-contain" />
        </div>
      </div>
    </div>
  );
}
