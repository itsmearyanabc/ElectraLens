// Request signing between the API and the anchor service (trust boundary TB4).
// The signature covers a timestamp, a single-use nonce and the body hash, so a captured request
// can't be replayed or altered. The API imports signRequest from this package.
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const HEADER_TIMESTAMP = 'x-el-timestamp';
export const HEADER_NONCE = 'x-el-nonce';
export const HEADER_SIGNATURE = 'x-el-signature';
export const MAX_SKEW_MS = 60_000;
export const MIN_KEY_BYTES = 32;

const NONCE = /^[A-Za-z0-9-]{16,64}$/;
const SIGNATURE = /^[0-9a-f]{64}$/;

function payload(timestamp: string, nonce: string, body: string): string {
  const bodyHash = createHash('sha256').update(body, 'utf8').digest('hex');
  return `${timestamp}.${nonce}.${bodyHash}`;
}

export function signRequest(
  key: Uint8Array,
  body: string,
  now: number = Date.now(),
  nonce: string = randomUUID(),
): Record<string, string> {
  const timestamp = String(now);
  const signature = createHmac('sha256', key)
    .update(payload(timestamp, nonce, body))
    .digest('hex');
  return { [HEADER_TIMESTAMP]: timestamp, [HEADER_NONCE]: nonce, [HEADER_SIGNATURE]: signature };
}

/** Remembers recently used nonces for twice the allowed clock skew. */
export class NonceCache {
  readonly #seen = new Map<string, number>();

  /** Records the nonce; returns false if it was already used. */
  claim(nonce: string, now: number = Date.now()): boolean {
    for (const [value, expires] of this.#seen) {
      if (expires < now) this.#seen.delete(value);
    }
    if (this.#seen.has(nonce)) return false;
    this.#seen.set(nonce, now + 2 * MAX_SKEW_MS);
    return true;
  }
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifyRequest(
  key: Uint8Array,
  headers: Readonly<Record<string, string | string[] | undefined>>,
  body: string,
  nonces: NonceCache,
  now: number = Date.now(),
): VerifyResult {
  const header = (name: string) => {
    const value = headers[name];
    return typeof value === 'string' ? value : undefined;
  };
  const timestamp = header(HEADER_TIMESTAMP);
  const nonce = header(HEADER_NONCE);
  const signature = header(HEADER_SIGNATURE);
  if (!timestamp || !nonce || !signature) return { ok: false, reason: 'missing_headers' };
  if (!/^[0-9]{1,16}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > MAX_SKEW_MS) {
    return { ok: false, reason: 'stale_timestamp' };
  }
  if (!NONCE.test(nonce) || !SIGNATURE.test(signature)) return { ok: false, reason: 'malformed' };
  const expected = createHmac('sha256', key)
    .update(payload(timestamp, nonce, body))
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
    return { ok: false, reason: 'bad_signature' };
  // Claim the nonce only after the signature checks out, so forged requests can't burn nonces.
  if (!nonces.claim(nonce, now)) return { ok: false, reason: 'replayed' };
  return { ok: true };
}
