// How unusual an area's additions or deletions are next to its neighbours: the other areas at the
// same level under the same parent. Deterministic and checkable from the published aggregates, so
// the same data always gets the same level; an AI model only ever explains it in words.
//
// The rate (additions or deletions over the earlier roll) is compared with the neighbours' median
// using a robust z-score: 0.6745 × (rate − median) / MAD. The median absolute deviation is not
// pulled about by one extreme area, which a mean and standard deviation would be.

export type Level = 'normal' | 'unusual' | 'highly_unusual';
export type Direction = 'higher' | 'lower';

export interface RateLevel {
  rate: number;
  peerMedian: number;
  score: number;
  level: Level;
  direction: Direction;
}

/** Below 2 is normal; 2 to 3.5 unusual; above 3.5 highly unusual (Iglewicz and Hoaglin). */
export const UNUSUAL_AT = 2;
export const HIGHLY_UNUSUAL_AT = 3.5;
/** Fewer comparable neighbours than this and no level is given. */
export const MIN_PEERS = 4;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/**
 * The level of each rate among `rates` (the area and its neighbours together). Areas without a
 * rate (suppressed or no earlier roll) get null, and so does everyone when there are too few.
 */
export function rateLevels(rates: (number | null)[]): (RateLevel | null)[] {
  const known = rates.filter((rate): rate is number => rate !== null && Number.isFinite(rate));
  if (known.length < MIN_PEERS) return rates.map(() => null);
  const med = median(known);
  // A MAD of zero (most areas identical) would make every difference infinite; use a small floor.
  const mad = Math.max(median(known.map((rate) => Math.abs(rate - med))), 0.001);
  return rates.map((rate) => {
    if (rate === null || !Number.isFinite(rate)) return null;
    const score = (0.6745 * (rate - med)) / mad;
    const size = Math.abs(score);
    return {
      rate,
      peerMedian: med,
      score,
      level:
        size >= HIGHLY_UNUSUAL_AT ? 'highly_unusual' : size >= UNUSUAL_AT ? 'unusual' : 'normal',
      direction: score >= 0 ? 'higher' : 'lower',
    };
  });
}

/** Additions or deletions over the earlier roll; null when either is missing or suppressed. */
export function changeRate(change: number | null, baseline: number | null): number | null {
  if (change === null || baseline === null || baseline <= 0) return null;
  return change / baseline;
}
