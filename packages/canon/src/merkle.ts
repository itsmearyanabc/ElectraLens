// RFC 6962 Merkle Tree Hash with domain-separated leaves (0x00) and nodes (0x01).
// Dataset leaves also carry a per-dataset salt; with an empty salt this is plain RFC 6962.
import { sha256 } from '@noble/hashes/sha2.js';

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;

function concat(prefix: number, ...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(1 + parts.reduce((n, p) => n + p.length, 0));
  out[0] = prefix;
  let offset = 1;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function leafHash(salt: Uint8Array, data: Uint8Array): Uint8Array {
  return sha256(concat(LEAF_PREFIX, salt, data));
}

export function nodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(NODE_PREFIX, left, right));
}

/** Largest power of two strictly smaller than n (n >= 2). */
function split(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

function subtreeRoot(leaves: readonly Uint8Array[], start: number, end: number): Uint8Array {
  if (end - start === 1) return leaves[start] as Uint8Array;
  const k = split(end - start);
  return nodeHash(subtreeRoot(leaves, start, start + k), subtreeRoot(leaves, start + k, end));
}

/** Root over already-hashed leaves. The empty tree's root is SHA-256 of the empty string. */
export function merkleRoot(leaves: readonly Uint8Array[]): Uint8Array {
  if (leaves.length === 0) return sha256(new Uint8Array());
  return subtreeRoot(leaves, 0, leaves.length);
}

/** Audit path for leaf `index` (RFC 6962 §2.1.1). */
export function inclusionProof(index: number, leaves: readonly Uint8Array[]): Uint8Array[] {
  if (!Number.isInteger(index) || index < 0 || index >= leaves.length) {
    throw new RangeError('leaf index out of range');
  }
  const path = (m: number, start: number, end: number): Uint8Array[] => {
    if (end - start === 1) return [];
    const k = split(end - start);
    return m < k
      ? [...path(m, start, start + k), subtreeRoot(leaves, start + k, end)]
      : [...path(m - k, start + k, end), subtreeRoot(leaves, start, start + k)];
  };
  return path(index, 0, leaves.length);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] as number) ^ (b[i] as number);
  return diff === 0;
}

/** Verifies an audit path (RFC 9162 §2.1.3.2). */
export function verifyInclusion(
  leaf: Uint8Array,
  index: number,
  treeSize: number,
  proof: readonly Uint8Array[],
  root: Uint8Array,
): boolean {
  if (index < 0 || index >= treeSize) return false;
  let fn = index;
  let sn = treeSize - 1;
  let r = leaf;
  for (const p of proof) {
    if (sn === 0) return false;
    if (fn % 2 === 1 || fn === sn) {
      r = nodeHash(p, r);
      if (fn % 2 === 0) {
        while (fn % 2 === 0 && fn !== 0) {
          fn = Math.floor(fn / 2);
          sn = Math.floor(sn / 2);
        }
      }
    } else {
      r = nodeHash(r, p);
    }
    fn = Math.floor(fn / 2);
    sn = Math.floor(sn / 2);
  }
  return sn === 0 && equalBytes(r, root);
}
