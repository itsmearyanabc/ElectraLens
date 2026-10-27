import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';

// Built per request, so the site's real origin comes from the server's environment.
export const dynamic = 'force-dynamic';

const PAGES = [
  '',
  '/findings',
  '/compare',
  '/datasets',
  '/publications',
  '/verify',
  '/claims',
  '/assistant',
  '/booths',
  '/methodology',
  '/official-links',
  '/about',
  '/privacy',
];

/** S07: the public pages in every language. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = env.appOrigin();
  return PAGES.map((page) => ({
    url: `${origin}/${routing.defaultLocale}${page}`,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${origin}/${l}${page}`])),
    },
  }));
}
