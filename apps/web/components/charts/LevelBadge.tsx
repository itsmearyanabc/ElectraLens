import type { RateLevel } from '@/lib/levels';

const STYLE = {
  normal: { chip: 'bg-mist text-muted ring-1 ring-line', dot: 'bg-subtle' },
  unusual: { chip: 'bg-saffron-tint text-orange-deep', dot: 'bg-saffron' },
  highly_unusual: { chip: 'bg-danger-tint text-danger', dot: 'bg-danger' },
} as const;

/** The level of one rate among its neighbours, in words with an arrow (never colour alone). */
export function LevelBadge({
  level,
  labels,
}: {
  level: RateLevel | null;
  labels: Record<'normal' | 'unusual' | 'highly_unusual' | 'none' | 'higher' | 'lower', string>;
}) {
  if (!level) {
    return <span className="text-sm text-subtle">{labels.none}</span>;
  }
  const style = STYLE[level.level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${style.chip}`}
      title={level.level === 'normal' ? undefined : labels[level.direction]}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {labels[level.level]}
      {level.level !== 'normal' && (
        <span aria-label={labels[level.direction]}>{level.direction === 'higher' ? '↑' : '↓'}</span>
      )}
    </span>
  );
}
