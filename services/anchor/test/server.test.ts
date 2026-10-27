import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AnchorRefused } from '../src/anchor.ts';
import { signRequest } from '../src/hmac.ts';
import { buildServer } from '../src/server.ts';

const KEY = Buffer.from('k'.repeat(32));
const GOOD_ID = '00000000-0000-4000-8000-000000000001';
const REFUSED_ID = '00000000-0000-4000-8000-000000000002';

const server = buildServer({
  hmacKey: KEY,
  anchor: async (id) => {
    if (id === REFUSED_ID) throw new AnchorRefused('missing_approvals');
    return {
      publicationId: id,
      manifestHash: 'a'.repeat(64),
      txHash: '0x1',
      blockNumber: 1,
      logIndex: 0,
      sequence: 1,
      recovered: false,
    };
  },
  health: async () => ({ ok: true }),
});
let base = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const post = (body: string, headers: Record<string, string>) =>
  fetch(`${base}/internal/anchor`, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });

describe('anchor HTTP endpoint', () => {
  it('rejects unsigned requests', async () => {
    const res = await post(JSON.stringify({ publication_id: GOOD_ID }), {});
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: 'auth.missing_headers' });
  });

  it('anchors a signed request and refuses its replay', async () => {
    const body = JSON.stringify({ publication_id: GOOD_ID });
    const headers = signRequest(KEY, body);
    const first = await post(body, headers);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ status: 'published', publicationId: GOOD_ID });
    const replay = await post(body, headers);
    expect(replay.status).toBe(401);
  });

  it('maps a refusal to 409 with a stable code', async () => {
    const body = JSON.stringify({ publication_id: REFUSED_ID });
    const res = await post(body, signRequest(KEY, body));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ code: 'anchor.missing_approvals' });
  });

  it('rejects a malformed id even when signed', async () => {
    const body = JSON.stringify({ publication_id: 'not-a-uuid' });
    expect((await post(body, signRequest(KEY, body))).status).toBe(400);
  });

  it('rejects oversized bodies and unknown routes', async () => {
    const body = JSON.stringify({ publication_id: GOOD_ID, pad: 'x'.repeat(5000) });
    expect((await post(body, signRequest(KEY, body))).status).toBe(413);
    expect((await fetch(`${base}/anything`)).status).toBe(404);
  });

  it('reports health', async () => {
    expect(await (await fetch(`${base}/internal/health`)).json()).toEqual({ ok: true });
  });
});
