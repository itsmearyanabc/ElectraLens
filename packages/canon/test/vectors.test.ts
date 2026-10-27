// AC-7: the TypeScript canonicaliser must reproduce every shared vector byte for byte.
// The vectors are written by the Python engine (`uv run el vectors --write`).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DatasetSchemaName, ManifestV1 } from '@electralens/schemas';
import { describe, expect, it } from 'vitest';

import {
  canonicalRow,
  CanonError,
  datasetCommitment,
  fromHex,
  hashDocument,
  inclusionProof,
  leafHash,
  manifestHash,
  merkleRoot,
  toHex,
  type Json,
} from '../src/index.ts';

const dir = join(import.meta.dirname, '..', '..', '..', 'test-vectors', 'canon');

interface CommitmentVector {
  kind: 'commitment';
  name: string;
  schema: DatasetSchemaName;
  salt: string;
  rows: Record<string, unknown>[];
  assert?: { same_root_as?: string; different_root_from?: string };
  expected: { row_count: number; root: string; canonical_rows: string[]; leaf_hashes: string[] };
}
interface ErrorsVector {
  kind: 'errors';
  cases: {
    name: string;
    schema: DatasetSchemaName;
    row: Record<string, unknown>;
    expected: { code: string; field: string | null };
  }[];
}
interface MerkleVector {
  kind: 'merkle';
  salt: string;
  leaf_data: string[];
  roots: string[];
  proofs_size_7: string[][];
}
interface DocumentsVector {
  kind: 'documents';
  cases: { name: string; doc: Json; hash: string }[];
  manifest: { doc: ManifestV1; hash: string };
}
type Vector = CommitmentVector | ErrorsVector | MerkleVector | DocumentsVector;

const vectors = new Map<string, Vector>(
  readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const vector = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Vector & { name: string };
      return [vector.name, vector];
    }),
);
const commitments = [...vectors.values()].filter(
  (v): v is CommitmentVector => v.kind === 'commitment',
);

describe('shared canonicalisation vectors', () => {
  it('found the vector files', () => {
    expect(commitments.length).toBeGreaterThanOrEqual(7);
  });

  it.each(commitments.map((v) => [v.name, v] as const))('%s', (_name, vector) => {
    const c = datasetCommitment(vector.rows, vector.schema, fromHex(vector.salt));
    expect(c.canonicalRows).toEqual(vector.expected.canonical_rows);
    expect(c.leafHashes.map(toHex)).toEqual(vector.expected.leaf_hashes);
    expect(c.rowCount).toBe(vector.expected.row_count);
    expect(c.root).toBe(vector.expected.root);

    const same = vector.assert?.same_root_as;
    const different = vector.assert?.different_root_from;
    const rootOf = (name: string) => (vectors.get(name) as CommitmentVector).expected.root;
    if (same) expect(c.root).toBe(rootOf(same));
    if (different) expect(c.root).not.toBe(rootOf(different));
  });

  const errors = vectors.get('errors') as ErrorsVector;
  it.each(errors.cases.map((c) => [c.name, c] as const))('rejects: %s', (_name, testCase) => {
    let caught: unknown;
    try {
      canonicalRow(testCase.row, testCase.schema);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CanonError);
    expect({ code: (caught as CanonError).code, field: (caught as CanonError).field }).toEqual(
      testCase.expected,
    );
  });

  it('salted Merkle roots and proofs for sizes 0 to 7', () => {
    const merkle = vectors.get('merkle-sizes') as MerkleVector;
    const salt = fromHex(merkle.salt);
    const leaves = merkle.leaf_data.map((hex) => leafHash(salt, fromHex(hex)));
    merkle.roots.forEach((root, size) => {
      expect(toHex(merkleRoot(leaves.slice(0, size)))).toBe(root);
    });
    merkle.proofs_size_7.forEach((proof, index) => {
      expect(inclusionProof(index, leaves).map(toHex)).toEqual(proof);
    });
  });

  it('document and manifest hashes', () => {
    const documents = vectors.get('documents') as DocumentsVector;
    for (const testCase of documents.cases) {
      expect(hashDocument(testCase.doc), testCase.name).toBe(testCase.hash);
    }
    expect(manifestHash(documents.manifest.doc)).toBe(documents.manifest.hash);
  });
});
