// Line icons drawn with stroke="currentColor", so they take the colour of their container.
const PATHS = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm5.2 12.2L20 20',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  shield:
    'M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Zm-3.2 9 2.2 2.2 4.2-4.4',
  scale: 'M12 4v16M5 8h14M5 8l-3 6a3 3 0 0 0 6 0L5 8Zm14 0-3 6a3 3 0 0 0 6 0l-3-6ZM8 20h8',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.7M12 17.2v.3',
  file: 'M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  check: 'M5 12.5 10 17 19 7',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-9a3 3 0 1 0 0-6m2 15a5 5 0 0 0-3-4.6',
  lock: 'M6 11h12v10H6V11Zm2.5 0V8a3.5 3.5 0 0 1 7 0v3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
