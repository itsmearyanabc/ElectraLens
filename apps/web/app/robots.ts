import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

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
