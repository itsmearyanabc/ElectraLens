import { z } from 'zod';

import { code, hex64, isoDateTime } from './common.ts';

export const MANIFEST_SCHEMA = 'electralens.manifest.v1';
export const CANON_VERSION = 'elcanon-1';

/** Publication manifest (Architecture §8.3). Its hash is what gets anchored on-chain. */
export const manifestV1 = z.strictObject({
  schema: z.literal(MANIFEST_SCHEMA),
  series_id: code,
  sequence: z.int().min(1),
  previous_manifest_hash: hex64.nullable(),
  is_synthetic: z.boolean(),
  datasets: z
    .array(
      z.strictObject({
        role: z.enum(['baseline', 'target', 'booths']),
        version_id: z.uuid(),
        root: hex64,
        row_count: z.int().min(0),
        schema: z.enum(['electoral_roll_v1', 'polling_stations_v1']),
        canon: z.literal(CANON_VERSION),
      }),
    )
    .min(1),
  // Null for publications without an audit run, such as booth-only releases.
  audit_run: z
    .strictObject({
      id: z.uuid(),
      engine: z.string().regex(/^git:[0-9a-f]{7,40}$/),
      image: z
        .string()
        .regex(/^sha256:[0-9a-f]{64}$/)
        .nullable(),
      methodology: z.string().regex(/^[0-9]{4}\.[0-9]+$/),
      params_hash: hex64,
    })
    .nullable(),
  report_hash: hex64.nullable(),
  aggregates_hash: hex64.nullable(),
  published_at: isoDateTime,
  publisher: z.string().min(1).max(200),
});

export type ManifestV1 = z.infer<typeof manifestV1>;
