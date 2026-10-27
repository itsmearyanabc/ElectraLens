import { z } from 'zod';

import { code, decimal6, isoDateTime, localeLongText } from './common.ts';

export const RULE_IDS = [
  'R01',
  'R02',
  'R03',
  'R04',
  'R05',
  'R06',
  'R07',
  'R08',
  'R09',
  'R10',
  'R11',
  'R12',
] as const;
export const SIGNAL_STRENGTHS = ['strong', 'moderate', 'weak', 'data_quality'] as const;
export const REVIEW_STATUSES = ['pending', 'accepted', 'downgraded', 'rejected'] as const;
export const AREA_LEVELS = ['state', 'district', 'ac', 'part'] as const;
export const CONTENT_LABELS = [
  'source_data',
  'analytical_finding',
  'user_claim',
  'unverified',
  'confirmed_correction',
] as const;

/** Evidence values: integers, fixed-scale decimal strings, or short codes. Never floats. */
const evidenceValue = z.union([z.int(), decimal6, z.string().max(200)]);

/** Public form of an analytical finding (Architecture §9.3). Row-level evidence is never included. */
export const findingV1 = z.strictObject({
  finding_id: z.string().regex(/^F-[0-9]{4}-[0-9]{6}$/),
  rule: z.strictObject({
    id: z.enum(RULE_IDS),
    version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    name_key: z.string().regex(/^rule\.R[0-9]{2}\.name$/),
  }),
  datasets: z.strictObject({
    baseline: z.uuid().nullable(),
    target: z.uuid(),
  }),
  area: z.strictObject({
    level: z.enum(AREA_LEVELS),
    code,
  }),
  evidence: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), evidenceValue),
  baseline: z
    .strictObject({
      type: z.string().regex(/^[a-z_]+$/),
      n_units: z.int().min(0),
      method: z.string().regex(/^[a-z_]+$/),
    })
    .nullable(),
  criterion: z.string().min(1).max(300),
  signal_strength: z.enum(SIGNAL_STRENGTHS),
  explanation: localeLongText,
  alternative_explanations: z.array(z.string().regex(/^alt\.[a-z0-9_]+$/)),
  limitations: z.array(z.string().regex(/^lim\.[a-z0-9_]+$/)),
  review: z.strictObject({
    status: z.enum(REVIEW_STATUSES),
    reviewed_at: isoDateTime.nullable(),
  }),
  label: z.literal('analytical_finding'),
});

export type FindingV1 = z.infer<typeof findingV1>;
