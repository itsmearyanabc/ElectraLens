import { z } from 'zod';

import { hex64 } from './common.ts';

/** Payload of a row in the `jobs` table, keyed by job kind. */
export const jobPayloadV1 = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ingest'), dataset_version_id: z.uuid() }),
  z.strictObject({ kind: z.literal('analyze'), run_id: z.uuid() }),
  z.strictObject({ kind: z.literal('publish_prepare'), publication_id: z.uuid() }),
  z.strictObject({
    kind: z.literal('ots_stamp'),
    publication_id: z.uuid(),
    manifest_hash: hex64,
  }),
  z.strictObject({ kind: z.literal('ots_upgrade'), anchor_id: z.uuid() }),
  z.strictObject({ kind: z.literal('notify'), publication_id: z.uuid() }),
  z.strictObject({ kind: z.literal('retention') }),
  z.strictObject({ kind: z.literal('benchmark'), run_id: z.uuid() }),
]);

export type JobPayloadV1 = z.infer<typeof jobPayloadV1>;
