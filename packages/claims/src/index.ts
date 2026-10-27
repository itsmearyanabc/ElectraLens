// B11.02–B11.03: a claim is matched to one published figure and judged with a fixed tolerance.
// Pure functions only, so the web app and the API give the same verdict for the same claim.

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

export type ClaimMetric = (typeof CLAIM_METRICS)[number];
export type Comparator = (typeof COMPARATORS)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];
export type Verdict = 'consistent' | 'contradicted' | 'disputed' | 'cannot_establish';

export interface Claim {
  areaCode: string;
  metric: ClaimMetric;
  comparator: Comparator;
  value: number;
  claimType: ClaimType;
}

export type ClaimReason =
  'cause_or_intent' | 'no_publication' | 'no_area' | 'no_figure' | 'suppressed' | 'checked';

export interface ClaimResult {
  verdict: Verdict;
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

export function judge(claim: Pick<Claim, 'comparator' | 'value'>, published: number): Verdict {
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

/** What the evaluator needs to know about the latest publication and the claimed figure. */
export interface PublishedFigure {
  publication: { id: string; series: string; sequence: number } | null;
  areaFound: boolean;
  cell: { value: number | null } | null;
}

/** FR-CLM-4: roll data records what changed, never why or with what intent. */
export function evaluate(claim: Claim, figure: PublishedFigure): ClaimResult {
  const empty = { published: null, tolerance: null, method: CLAIM_METHOD };
  const none = { publicationId: null, series: null, sequence: null };
  if (claim.claimType === 'cause_or_intent')
    return { ...empty, ...none, verdict: 'cannot_establish', reason: 'cause_or_intent' };
  if (!figure.publication)
    return { ...empty, ...none, verdict: 'cannot_establish', reason: 'no_publication' };
  const ref = {
    publicationId: figure.publication.id,
    series: figure.publication.series,
    sequence: figure.publication.sequence,
  };
  if (!figure.areaFound)
    return { ...empty, ...ref, verdict: 'cannot_establish', reason: 'no_area' };
  if (!figure.cell) return { ...empty, ...ref, verdict: 'cannot_establish', reason: 'no_figure' };
  if (figure.cell.value === null)
    return { ...empty, ...ref, verdict: 'cannot_establish', reason: 'suppressed' };
  return {
    ...ref,
    verdict: judge(claim, figure.cell.value),
    reason: 'checked',
    published: figure.cell.value,
    tolerance: tolerance(figure.cell.value),
    method: CLAIM_METHOD,
  };
}
