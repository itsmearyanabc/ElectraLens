/** A lens over the lines of a roll: ink tile, orange lens, white lines, blue handle. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="40" height="40" rx="12" fill="#172033" />
      <path
        d="M11.5 13.5h11M11.5 17.5h11M11.5 21.5h6.5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="17.5" r="9.75" fill="none" stroke="#f07824" strokeWidth="3.25" />
      <path d="m24.5 25 6.5 6.5" stroke="#5b8ff0" strokeWidth="4.25" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display ${className}`}>
      <span className="text-ink">Electra</span>
      <span className="text-saffron">Lens</span>
    </span>
  );
}
