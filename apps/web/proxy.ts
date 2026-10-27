import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { isLocale, routing, type Locale } from './i18n/routing';
import { contentSecurityPolicy, newNonce } from './lib/csp';
import { refreshSession } from './lib/supabase/proxy';

const intl = createIntlMiddleware(routing);

// QR codes encode only https://<host>/b/<code>, with no language in the path (B13.05).
const BOOTH_PAGE = /^\/b\/[0-9A-HJKMNP-TV-Z]{10}(\/poster)?$/;
const SESSION_PAGE = new RegExp(`^/(${routing.locales.join('|')})/(account|ops)(/|$)`);

function boothLocale(request: NextRequest): Locale {
  const fromQuery = request.nextUrl.searchParams.get('lang');
  if (isLocale(fromQuery)) return fromQuery;
  const fromCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accepted = request.headers.get('accept-language') ?? '';
  return routing.locales.find((locale) => accepted.toLowerCase().startsWith(locale)) ?? 'en';
}

export default async function proxy(request: NextRequest) {
  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === 'development',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  });
  // Next.js reads the nonce from the request's CSP header and adds it to its own scripts.
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);

  const { pathname } = request.nextUrl;
  let response: NextResponse;
  if (BOOTH_PAGE.test(pathname)) {
    const url = new URL(`/${boothLocale(request)}${pathname}`, request.url);
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    const forwarded = new NextRequest(request, { headers });
    response = intl(forwarded);
    if (SESSION_PAGE.test(pathname)) await refreshSession(forwarded, response);
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not assets, files, auth handlers or the health check.
      source: '/((?!_next/static|_next/image|auth/|healthz|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
