import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

// Built per request, so the site's real origin comes from the server's environment.
export const dynamic = 'force-dynamic';

/** S06 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/en/ops', '/hi/ops', '/en/account', '/hi/account', '/auth/'],
      },
    ],
    sitemap: `${env.appOrigin()}/sitemap.xml`,
  };
}
