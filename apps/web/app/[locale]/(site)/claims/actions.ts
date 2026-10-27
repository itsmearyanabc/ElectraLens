'use server';

import {
  CLAIM_METRICS,
  CLAIM_TYPES,
  COMPARATORS,
  evaluateClaim,
  type Claim,
  type ClaimResult,
} from '@/lib/claims';

export type CheckState =
  | { status: 'idle' }
  | { status: 'invalid' }
  | { status: 'done'; claim: Claim; result: ClaimResult };

const pick = <T extends string>(
  value: FormDataEntryValue | null,
  allowed: readonly T[],
): T | null =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/** Checks a structured claim against published data. Read-only: nothing is stored. */
export async function checkClaim(_previous: CheckState, form: FormData): Promise<CheckState> {
  const claimType = pick(form.get('claimType'), CLAIM_TYPES);
  const metric = pick(form.get('metric'), CLAIM_METRICS);
  const comparator = pick(form.get('comparator'), COMPARATORS);
  const areaCode = String(form.get('area') ?? '').slice(0, 64);
  const rawValue = String(form.get('value') ?? '').replace(/[,\s]/g, '');
  const value = rawValue === '' ? 0 : Number(rawValue);
  if (!claimType || !metric || !comparator || !areaCode) return { status: 'invalid' };
  if (claimType === 'quantity' && (!Number.isSafeInteger(value) || Math.abs(value) > 1e9)) {
    return { status: 'invalid' };
  }
  const claim: Claim = { areaCode, metric, comparator, value, claimType };
  return { status: 'done', claim, result: await evaluateClaim(claim) };
}
