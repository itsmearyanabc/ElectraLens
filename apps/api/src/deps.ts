// Everything a route touches outside the process, so tests can swap in fakes.
import { createHash } from 'node:crypto';

import { signRequest } from '@electralens/anchor/hmac';
import type { Database } from '@electralens/database';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Config } from './config.ts';

export interface AnchorOutcome {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface Deps {
  config: Config;
  /** Secret key (service role): only for steps no user may do themselves. */
  service: SupabaseClient<Database>;
  /** Publishable key, no session: exactly what any visitor sees through RLS. */
  anon: SupabaseClient<Database>;
  /** The caller's own token: RLS and workflow functions see who is asking. */
  forUser: (accessToken: string) => SupabaseClient<Database>;
  verifyTurnstile: (token: string | undefined, ip: string, action: string) => Promise<boolean>;
  anchor: (publicationId: string) => Promise<AnchorOutcome>;
  hashIp: (ip: string) => string;
}

const noSession = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

export function createDeps(config: Config): Deps {
  return {
    config,
    service: createClient<Database>(config.supabaseUrl, config.secretKey, noSession),
    anon: createClient<Database>(config.supabaseUrl, config.publishableKey, noSession),
    forUser: (token) =>
      createClient<Database>(config.supabaseUrl, config.publishableKey, {
        ...noSession,
        global: { headers: { authorization: `Bearer ${token}` } },
      }),
    verifyTurnstile: (token, ip, action) => verifyTurnstile(config, token, ip, action),
    anchor: (publicationId) => callAnchor(config, publicationId),
    hashIp: (ip) => createHash('sha256').update(`${config.ipHashSalt}:${ip}`).digest('hex'),
  };
}

/** B07.05: siteverify with hostname and action checks; any failure or doubt is a refusal. */
async function verifyTurnstile(
  config: Config,
  token: string | undefined,
  ip: string,
  action: string,
): Promise<boolean> {
  if (!config.turnstileSecret) return config.turnstileDisabled;
  if (!token || token.length > 2048) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    return (
      result.success === true &&
      result.hostname === new URL(config.appOrigin).hostname &&
      result.action === action
    );
  } catch {
    return false;
  }
}

/** B07.10: the anchor service accepts only HMAC-signed, fresh, single-use requests. */
async function callAnchor(config: Config, publicationId: string): Promise<AnchorOutcome> {
  if (!config.anchorUrl || !config.anchorHmacKey)
    return { ok: false, status: 503, body: { code: 'anchor.not_configured' } };
  const body = JSON.stringify({ publication_id: publicationId });
  try {
    const response = await fetch(`${config.anchorUrl}/internal/anchor`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...signRequest(config.anchorHmacKey, body) },
      body,
      signal: AbortSignal.timeout(300_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.json().catch(() => null),
    };
  } catch {
    return { ok: false, status: 502, body: { code: 'anchor.unreachable' } };
  }
}
