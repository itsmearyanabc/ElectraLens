import canonicalize from 'canonicalize';

import { CanonError } from './errors.ts';
import type { Json } from './normalize.ts';

const encoder = new TextEncoder();

/** Hashed documents may not contain binary floats: decimals must be fixed-scale strings. */
function assertHashable(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new CanonError('float_not_allowed', path);
  } else if (typeof value === 'string') {
    if (!value.isWellFormed()) throw new CanonError('not_well_formed', path);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => assertHashable(item, `${path}[${i}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) assertHashable(item, `${path}.${key}`);
  } else if (value !== null && typeof value !== 'boolean') {
    throw new CanonError('type', path);
  }
}

/** RFC 8785 JSON Canonicalization Scheme. */
export function jcs(value: Json): string {
  assertHashable(value, '$');
  const out = canonicalize(value);
  if (out === undefined) throw new CanonError('type', '$');
  return out;
}

export function jcsBytes(value: Json): Uint8Array {
  return encoder.encode(jcs(value));
}
