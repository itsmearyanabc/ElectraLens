import path from 'node:path';

import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const repoRoot = path.join(import.meta.dirname, '../..');

// The Content-Security-Policy header carries a per-request nonce, so it is set in proxy.ts.
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // The microphone is used only by the assistant's voice input, on this origin.
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=()' },
];

const config: NextConfig = {
  turbopack: { root: repoRoot },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default createNextIntlPlugin('./i18n/request.ts')(config);
