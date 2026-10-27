import { z } from 'zod';

import { code, decimal6, isoDate, LOCALE_PATTERN } from './common.ts';
import { DELETION_REASONS } from './roll.ts';

export const CLAIM_METRICS = [
  'additions',
  'deletions',
  'deletions_by_reason',
  'corrections',
  'net_change',
  'electors',
] as const;
export const CLAIM_VERDICTS = [
  'consistent',
  'contradicted',
  'disputed',
  'cannot_establish',
] as const;

/**
 * A structured claim (FR-CLM-1). Claims about cause or intent carry no numbers: they can
 * never be established from roll data, so the checker always answers "cannot be established".
 */
export const claimV1 = z
  .strictObject({
    claim_type: z.enum(['number', 'cause_or_intent']),
    area_code: code,
    metric: z.enum(CLAIM_METRICS).nullable(),
    deletion_reason: z.enum(DELETION_REASONS).nullable(),
    comparator: z.enum(['equals', 'at_least', 'at_most']).nullable(),
    value: z.union([z.int().min(0), decimal6]).nullable(),
    unit: z.enum(['count', 'percent']).nullable(),
    period: z.strictObject({ baseline: isoDate, target: isoDate }).nullable(),
    language: z.string().regex(LOCALE_PATTERN),
  })
  .superRefine((claim, ctx) => {
    if (claim.claim_type !== 'number') return;
    for (const key of ['metric', 'comparator', 'value', 'unit', 'period'] as const) {
      if (claim[key] === null) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'required for number claims' });
      }
    }
    if ((claim.metric === 'deletions_by_reason') !== (claim.deletion_reason !== null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['deletion_reason'],
        message: 'deletion_reason is required exactly when metric is deletions_by_reason',
      });
    }
  });

export type ClaimV1 = z.infer<typeof claimV1>;
