import 'server-only';

import { env } from './env';

/** The token field Turnstile adds inside the form it is rendered in. */
export const TURNSTILE_FIELD = 'cf-turnstile-response';

/**
 * Cloudflare Turnstile check for a form posted to this server (B07.05). Without
 * TURNSTILE_SECRET_KEY the check is off, as on a local machine; with it, a missing, expired,
 * reused or foreign token fails, and so does any doubt (network error, wrong host or action).
 */
export async function turnstileOk(form: FormData, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const token = form.get(TURNSTILE_FIELD);
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    return (
      result.success === true &&
      result.hostname === new URL(env.appOrigin()).hostname &&
      result.action === action
    );
  } catch {
    return false;
  }
}

/** The token as the API expects it, for forms the API verifies itself. */
export function turnstileToken(form: FormData): string | undefined {
  const token = form.get(TURNSTILE_FIELD);
  return typeof token === 'string' && token ? token.slice(0, 2048) : undefined;
}
