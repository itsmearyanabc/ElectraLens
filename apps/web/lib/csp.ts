// B17: Content-Security-Policy with a per-request nonce. Scripts run only from this origin or
// with the nonce; nothing is framed; forms post only here and to the sign-in providers.

const TURNSTILE = 'https://challenges.cloudflare.com';
const GOOGLE_SIGN_IN = 'https://accounts.google.com';

export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export interface CspOptions {
  dev: boolean;
  supabaseUrl?: string;
  rpcUrl?: string | null;
}

export function contentSecurityPolicy(nonce: string, options: CspOptions): string {
  const origins = (...values: (string | null | undefined)[]) =>
    values.filter((value): value is string => Boolean(value)).join(' ');
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.dev ? " 'unsafe-eval'" : ''}`,
    // The development overlay injects inline styles; production styles are files or nonced.
    options.dev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${origins("'self'", options.supabaseUrl, options.rpcUrl, TURNSTILE)}`,
    `frame-src ${TURNSTILE}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${origins("'self'", options.supabaseUrl, GOOGLE_SIGN_IN)}`,
    "frame-ancestors 'none'",
  ];
  if (!options.dev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
