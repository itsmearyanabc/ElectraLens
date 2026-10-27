import { SCHEMAS, toJsonSchema, type DatasetSchemaName } from '@electralens/schemas';

import { CanonError } from './errors.ts';
import { toHex } from './hash.ts';
import { jcs } from './jcs.ts';
import { leafHash, merkleRoot } from './merkle.ts';
import { normalizeRow, type PropertySchema } from './normalize.ts';

export const CANON_VERSION = 'elcanon-1';
export const SALT_BYTES = 32;

export interface DatasetCommitment {
  /** Merkle root, lowercase hex. */
  root: string;
  rowCount: number;
  /** Canonical rows (RFC 8785 JSON), sorted by their UTF-8 bytes. */
  canonicalRows: string[];
  leafHashes: Uint8Array[];
}

const encoder = new TextEncoder();
const propertiesCache = new Map<DatasetSchemaName, Record<string, PropertySchema>>();

function propertiesOf(schema: DatasetSchemaName): Record<string, PropertySchema> {
  let properties = propertiesCache.get(schema);
  if (!properties) {
    properties = (toJsonSchema(schema) as { properties: Record<string, PropertySchema> })
      .properties;
    propertiesCache.set(schema, properties);
  }
  return properties;
}

/** Normalises, validates and serialises one row. Errors carry the field, never the value. */
export function canonicalRow(
  raw: Readonly<Record<string, unknown>>,
  schema: DatasetSchemaName,
): string {
  const row = normalizeRow(raw, propertiesOf(schema));
  const result = SCHEMAS[schema].safeParse(row);
  if (!result.success) {
    const field = result.error.issues[0]?.path[0];
    throw new CanonError('schema', field === undefined ? null : String(field));
  }
  return jcs(row);
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const d = (a[i] as number) - (b[i] as number);
    if (d !== 0) return d;
  }
  return a.length - b.length;
}

function commit(rows: { text: string; bytes: Uint8Array }[], salt: Uint8Array): DatasetCommitment {
  const leafHashes = rows.map((row) => leafHash(salt, row.bytes));
  return {
    root: toHex(merkleRoot(leafHashes)),
    rowCount: rows.length,
    canonicalRows: rows.map((row) => row.text),
    leafHashes,
  };
}

function checkSalt(salt: Uint8Array): void {
  if (salt.length !== SALT_BYTES) throw new CanonError('bad_salt');
}

/** Commitment over raw rows: canonicalise each row, sort, then build the salted Merkle tree. */
export function datasetCommitment(
  rows: Iterable<Readonly<Record<string, unknown>>>,
  schema: DatasetSchemaName,
  salt: Uint8Array,
): DatasetCommitment {
  checkSalt(salt);
  const encoded: { text: string; bytes: Uint8Array }[] = [];
  let index = 0;
  for (const raw of rows) {
    try {
      const text = canonicalRow(raw, schema);
      encoded.push({ text, bytes: encoder.encode(text) });
    } catch (error) {
      throw error instanceof CanonError ? error.atRow(index) : error;
    }
    index += 1;
  }
  encoded.sort((a, b) => compareBytes(a.bytes, b.bytes));
  return commit(encoded, salt);
}

/**
 * Recomputes the commitment of a published canonical file (one row per line, sorted).
 * Each line must already be canonical, so an edited file can't hide behind re-normalisation.
 */
export function commitmentFromCanonicalLines(
  lines: readonly string[],
  schema: DatasetSchemaName,
  salt: Uint8Array,
): DatasetCommitment {
  checkSalt(salt);
  const encoded: { text: string; bytes: Uint8Array }[] = [];
  lines.forEach((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new CanonError('not_canonical', null, index);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new CanonError('not_canonical', null, index);
    }
    let again: string;
    try {
      again = canonicalRow(parsed as Record<string, unknown>, schema);
    } catch (error) {
      throw error instanceof CanonError ? error.atRow(index) : error;
    }
    if (again !== line) throw new CanonError('not_canonical', null, index);
    const bytes = encoder.encode(line);
    const previous = encoded.at(-1);
    if (previous && compareBytes(previous.bytes, bytes) > 0) {
      throw new CanonError('not_sorted', null, index);
    }
    encoded.push({ text: line, bytes });
  });
  return commit(encoded, salt);
}
