import 'server-only';

import { env } from './env';
import { sessionDb } from './supabase/server';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

/**
 * Calls the ElectraLens API from the web server, with the signed-in user's own access token, so
 * the API (and through it the database) sees exactly who is asking.
 */
export async function callApi<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; ip?: string } = {},
): Promise<ApiResult<T>> {
  const base = env.apiInternalUrl();
  if (!base) return { ok: false, status: 503, code: 'api.not_configured' };
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.auth !== false) {
    const { data } = await (await sessionDb()).auth.getSession();
    if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  }
  try {
    const response = await fetch(`${base}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(300_000),
    });
    const json = (await response.json().catch(() => null)) as (T & { code?: string }) | null;
    if (!response.ok)
      return { ok: false, status: response.status, code: json?.code ?? 'api.error' };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 502, code: 'api.unreachable' };
  }
}
