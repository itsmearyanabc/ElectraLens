import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp, type App } from '../src/app.ts';
import type { Config } from '../src/config.ts';
import type { Deps } from '../src/deps.ts';
import { fromDatabase } from '../src/errors.ts';

// A chainable stand-in for the Supabase query builder: every call returns itself and awaiting
// it yields the configured response.
function query(response: { data: unknown; error: unknown; count?: number }) {
  const builder: Record<string, unknown> = {};
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(response);
      return () => self;
    },
  });
  return self;
}

const config: Config = {
  port: 0,
  appOrigin: 'http://localhost:3100',
  supabaseUrl: 'http://supabase.test',
  publishableKey: 'pk',
  secretKey: 'sk',
  turnstileSecret: null,
  turnstileDisabled: false,
  anchorUrl: null,
  anchorHmacKey: null,
  ipHashSalt: 'salt',
};

const token = (aal: string) => `x.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.y`;
const anchor = vi.fn(async () => ({ ok: true, status: 200, body: { status: 'published' } }));
let rpcResult: { data: unknown; error: { message: string } | null } = {
  data: 'approved',
  error: null,
};
let roles: { id: string; role: string; jurisdiction_id: null }[] = [];

const fakeClient = {
  from: () => query({ data: roles, error: null }),
  rpc: async () => rpcResult,
  auth: {
    getUser: async (t: string) =>
      t.startsWith('x.')
        ? { data: { user: { id: 'u1', email: 'a@b.c' } }, error: null }
        : { data: { user: null }, error: { message: 'bad' } },
  },
  storage: { from: () => ({ list: async () => ({ data: [], error: null }) }) },
};

const deps = {
  config,
  service: fakeClient,
  anon: { ...fakeClient, from: () => query({ data: [], error: null, count: 0 }) },
  forUser: () => fakeClient,
  verifyTurnstile: async () => false,
  anchor,
  hashIp: () => 'h'.repeat(64),
} as unknown as Deps;

let app: App;
beforeAll(async () => {
  app = await buildApp(deps, { logger: false });
});
afterAll(() => app.close());

describe('API', () => {
  it('answers health checks', async () => {
    expect((await app.inject('/health')).json()).toEqual({ ok: true });
  });

  it('returns problem+json for unknown routes', async () => {
    const response = await app.inject('/api/v1/nope');
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'not_found' });
  });

  it('requires a signed-in user for /me', async () => {
    expect((await app.inject('/api/v1/me')).json()).toMatchObject({ code: 'auth.required' });
    const bad = await app.inject({ url: '/api/v1/me', headers: { authorization: 'Bearer nope' } });
    expect(bad.json()).toMatchObject({ code: 'auth.invalid' });
  });

  it('refuses claims when Turnstile fails, closed by default', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/claims/check',
      payload: {
        claim: {
          area_code: 'DEMO-HR',
          metric: 'deletions',
          comparator: 'about',
          value: 1,
          claim_type: 'quantity',
        },
      },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'turnstile.failed' });
  });

  it('rejects malformed claims before anything else', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/claims/check',
      payload: { claim: { area_code: 'x' } },
    });
    expect(response.json()).toMatchObject({ status: 400, code: 'validation.failed' });
  });

  it('requires a staff role and a second factor', async () => {
    roles = [];
    const noRole = await app.inject({
      method: 'POST',
      url: `/api/v1/staff/jobs/${crypto.randomUUID()}/retry`,
      headers: { authorization: `Bearer ${token('aal2')}` },
    });
    expect(noRole.json()).toMatchObject({ code: 'auth.forbidden' });
    roles = [{ id: 'r', role: 'publisher', jurisdiction_id: null }];
    const aal1 = await app.inject({
      method: 'POST',
      url: `/api/v1/staff/publications/${crypto.randomUUID()}/approve`,
      headers: { authorization: `Bearer ${token('aal1')}` },
      payload: { step: 'publish', manifest_hash: 'a'.repeat(64) },
    });
    expect(aal1.json()).toMatchObject({ code: 'auth.mfa_required' });
  });

  it('anchors once the second approval makes a publication approved', async () => {
    roles = [{ id: 'r', role: 'publisher', jurisdiction_id: null }];
    rpcResult = { data: 'approved', error: null };
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/staff/publications/${crypto.randomUUID()}/approve`,
      headers: { authorization: `Bearer ${token('aal2')}` },
      payload: { step: 'publish', manifest_hash: 'a'.repeat(64) },
    });
    expect(response.json()).toMatchObject({ status: 'approved', anchor: { ok: true } });
    expect(anchor).toHaveBeenCalledTimes(1);
  });

  it('passes the database refusal through as a stable code', async () => {
    roles = [{ id: 'r', role: 'reviewer', jurisdiction_id: null }];
    rpcResult = { data: null, error: { message: 'workflow.same_person' } };
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/staff/publications/${crypto.randomUUID()}/approve`,
      headers: { authorization: `Bearer ${token('aal2')}` },
      payload: { step: 'review', manifest_hash: 'a'.repeat(64) },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'workflow.same_person' });
  });

  it('maps database errors to HTTP statuses', () => {
    expect(fromDatabase('auth.forbidden').status).toBe(403);
    expect(fromDatabase('workflow.illegal_transition').status).toBe(409);
    expect(fromDatabase('something else').status).toBe(500);
  });
});
