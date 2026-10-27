'use server';

import {
  CLAIM_METRICS,
  CLAIM_TYPES,
  COMPARATORS,
  evaluateClaim,
  type Claim,
  type ClaimResult,
} from '@/lib/claims';
import { callApi } from '@/lib/api';
import { turnstileToken } from '@/lib/turnstile';

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

export type SubmitState = { status: 'idle' | 'sent' | 'error'; code?: string };

/** B11.05: send a checked claim for moderation. It is never published automatically. */
export async function submitClaim(_previous: SubmitState, form: FormData): Promise<SubmitState> {
  const text = String(form.get('text') ?? '')
    .trim()
    .slice(0, 2000);
  const language = form.get('language') === 'hi' ? 'hi' : 'en';
  let claim: Claim;
  try {
    claim = JSON.parse(String(form.get('claim') ?? '')) as Claim;
  } catch {
    return { status: 'error', code: 'invalid' };
  }
  if (text.length < 5) return { status: 'error', code: 'too_short' };
  const reply = await callApi('/claims', {
    method: 'POST',
    body: {
      claim: {
        area_code: claim.areaCode,
        metric: claim.metric,
        comparator: claim.comparator,
        value: claim.value,
        claim_type: claim.claimType,
      },
      text,
      language,
      turnstile_token: turnstileToken(form),
    },
  });
  return reply.ok ? { status: 'sent' } : { status: 'error', code: reply.code };
}
