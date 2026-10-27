import 'server-only';

import { AggregateTable } from './aggregates';
import { getAggregates, getArea, isAreaCode, latestPublication } from './data/public';
import type { Enums } from './data/types';

// B11.02–B11.03: a claim is matched to one published figure and judged with a fixed tolerance.
// It reads only published aggregates, so it can run anywhere; the API reuses it for submissions.

export const CLAIM_METHOD = 'claims-2026.1';
export const CLAIM_METRICS = [
  'additions',
  'deletions',
  'corrections',
  'net_change',
  'electors_target',
] as const;
export const COMPARATORS = ['about', 'more_than', 'less_than'] as const;
export const CLAIM_TYPES = ['quantity', 'cause_or_intent'] as const;

export interface Claim {
  areaCode: string;
  metric: (typeof CLAIM_METRICS)[number];
  comparator: (typeof COMPARATORS)[number];
  value: number;
  claimType: (typeof CLAIM_TYPES)[number];
}

export type ClaimReason =
  'cause_or_intent' | 'no_publication' | 'no_area' | 'no_figure' | 'suppressed' | 'checked';

export interface ClaimResult {
  verdict: Enums['claim_verdict'];
  reason: ClaimReason;
  published: number | null;
  tolerance: number | null;
  publicationId: string | null;
  series: string | null;
  sequence: number | null;
  method: string;
}

/** Counts within max(1 %, 10) of the published figure are consistent. */
export const tolerance = (published: number) => Math.max(Math.ceil(Math.abs(published) * 0.01), 10);

export function judge(
  claim: Pick<Claim, 'comparator' | 'value'>,
  published: number,
): Enums['claim_verdict'] {
  const tol = tolerance(published);
  switch (claim.comparator) {
    case 'about':
      return Math.abs(published - claim.value) <= tol ? 'consistent' : 'contradicted';
    case 'more_than':
      return published > claim.value - tol ? 'consistent' : 'contradicted';
    case 'less_than':
      return published < claim.value + tol ? 'consistent' : 'contradicted';
  }
}

export async function evaluateClaim(claim: Claim): Promise<ClaimResult> {
  const base = { published: null, tolerance: null, method: CLAIM_METHOD };
  // FR-CLM-4: roll data records what changed, never why or with what intent.
  if (claim.claimType === 'cause_or_intent') {
    return {
      ...base,
      verdict: 'cannot_establish',
      reason: 'cause_or_intent',
      publicationId: null,
      series: null,
      sequence: null,
    };
  }
  const publication = await latestPublication();
  if (!publication) {
    return {
      ...base,
      verdict: 'cannot_establish',
      reason: 'no_publication',
      publicationId: null,
      series: null,
      sequence: null,
    };
  }
  const ref = {
    publicationId: publication.id,
    series: publication.series_id,
    sequence: publication.sequence,
  };
  const area = isAreaCode(claim.areaCode) ? await getArea(claim.areaCode) : null;
  if (!area) return { ...base, ...ref, verdict: 'cannot_establish', reason: 'no_area' };
  const cell = new AggregateTable(await getAggregates(publication.id, [area.id])).get(
    area.id,
    claim.metric,
  );
  if (!cell) return { ...base, ...ref, verdict: 'cannot_establish', reason: 'no_figure' };
  if (cell.value === null)
    return { ...base, ...ref, verdict: 'cannot_establish', reason: 'suppressed' };
  return {
    ...ref,
    verdict: judge(claim, cell.value),
    reason: 'checked',
    published: cell.value,
    tolerance: tolerance(cell.value),
    method: CLAIM_METHOD,
  };
}
