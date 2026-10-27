import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale, type Locale } from '@/i18n/routing';

/**
 * Every page and layout under [locale] starts here: an unknown locale is a 404, and next-intl is
 * told the locale directly (the QR booth pages reach here through a rewrite, not the middleware).
 */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

/** Client components get only the namespaces they use, not the whole catalogue. */
export const CLIENT_NAMESPACES = [
  'common',
  'nav',
  'verifyClient',
  'tamperClient',
  'claimForm',
  'assistantFlow',
  'ops',
  'auth',
  'account',
] as const;
