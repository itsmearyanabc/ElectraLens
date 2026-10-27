import { z } from 'zod';

import { pollingStationsV1 } from './booths.ts';
import { claimV1 } from './claim.ts';
import { findingV1 } from './finding.ts';
import { jobPayloadV1 } from './jobs.ts';
import { manifestV1 } from './manifest.ts';
import { electoralRollV1 } from './roll.ts';

export * from './booths.ts';
export * from './claim.ts';
export * from './common.ts';
export * from './finding.ts';
export * from './jobs.ts';
export * from './manifest.ts';
export * from './meta.ts';
export * from './roll.ts';

/** Every published contract, by its stable name. */
export const SCHEMAS = {
  electoral_roll_v1: electoralRollV1,
  polling_stations_v1: pollingStationsV1,
  finding_v1: findingV1,
  manifest_v1: manifestV1,
  claim_v1: claimV1,
  job_payload_v1: jobPayloadV1,
} as const;

export type SchemaName = keyof typeof SCHEMAS;
export const SCHEMA_NAMES = Object.keys(SCHEMAS) as SchemaName[];

/** Dataset schemas that go through ingestion and canonicalisation. */
export const DATASET_SCHEMAS = ['electoral_roll_v1', 'polling_stations_v1'] as const;
export type DatasetSchemaName = (typeof DATASET_SCHEMAS)[number];

/**
 * JSON Schema (draft-07) for a contract. Draft-07 keeps it readable by fastjsonschema in the
 * Python engine. `x-canon` and `x-classification` annotations travel with each field.
 */
export function toJsonSchema(name: SchemaName): Record<string, unknown> {
  const body = z.toJSONSchema(SCHEMAS[name], { target: 'draft-7', io: 'input' }) as Record<
    string,
    unknown
  >;
  const { $schema, ...rest } = body;
  return {
    $schema,
    $id: `urn:electralens:schema:${name}`,
    title: name,
    ...rest,
  };
}
