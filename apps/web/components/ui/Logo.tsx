/** The ElectraLens emblem: the Four-Lion Capital. */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/emblem.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
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
