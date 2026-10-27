import { describe, expect, it } from 'vitest';

import {
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
  NonceCache,
  signRequest,
  verifyRequest,
} from '../src/hmac.ts';

const KEY = Buffer.from('k'.repeat(32));
const BODY = '{"publication_id":"00000000-0000-4000-8000-000000000001"}';
const NOW = 1_800_000_000_000;

describe('request signing', () => {
  it('accepts a correctly signed request once', () => {
    const nonces = new NonceCache();
    const headers = signRequest(KEY, BODY, NOW);
    expect(verifyRequest(KEY, headers, BODY, nonces, NOW + 1000)).toEqual({ ok: true });
    expect(verifyRequest(KEY, headers, BODY, nonces, NOW + 2000)).toEqual({
      ok: false,
      reason: 'replayed',
    });
  });

  it('rejects a changed body', () => {
    const headers = signRequest(KEY, BODY, NOW);
    const result = verifyRequest(KEY, headers, BODY.replace('1"', '2"'), new NonceCache(), NOW);
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects the wrong key', () => {
    const headers = signRequest(Buffer.from('x'.repeat(32)), BODY, NOW);
    expect(verifyRequest(KEY, headers, BODY, new NonceCache(), NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects old or future timestamps', () => {
    const headers = signRequest(KEY, BODY, NOW);
    expect(verifyRequest(KEY, headers, BODY, new NonceCache(), NOW + 61_000).ok).toBe(false);
    expect(verifyRequest(KEY, headers, BODY, new NonceCache(), NOW - 61_000).ok).toBe(false);
  });

  it('rejects missing or malformed headers', () => {
    const headers = signRequest(KEY, BODY, NOW);
    const unsigned = Object.fromEntries(
      Object.entries(headers).filter(([name]) => name !== HEADER_SIGNATURE),
    );
    expect(verifyRequest(KEY, unsigned, BODY, new NonceCache(), NOW)).toEqual({
      ok: false,
      reason: 'missing_headers',
    });
    expect(
      verifyRequest(KEY, { ...headers, [HEADER_TIMESTAMP]: 'soon' }, BODY, new NonceCache(), NOW)
        .ok,
    ).toBe(false);
    expect(
      verifyRequest(KEY, { ...headers, [HEADER_SIGNATURE]: 'zz' }, BODY, new NonceCache(), NOW),
    ).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('forged requests do not burn nonces', () => {
    const nonces = new NonceCache();
    const good = signRequest(KEY, BODY, NOW, 'nonce-aaaaaaaaaaaaaaaa');
    const forged = { ...good, [HEADER_SIGNATURE]: '0'.repeat(64) };
    expect(verifyRequest(KEY, forged, BODY, nonces, NOW).ok).toBe(false);
    expect(verifyRequest(KEY, good, BODY, nonces, NOW)).toEqual({ ok: true });
  });
});
