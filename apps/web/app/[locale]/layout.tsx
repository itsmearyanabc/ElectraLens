import type { Metadata } from 'next';
import { Caprasimo, Figtree, Mukta, Rozha_One } from 'next/font/google';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { CLIENT_NAMESPACES, pageLocale } from '@/lib/locale';

import '../globals.css';

// Caprasimo and Figtree (as on ORIGINX) for Latin; Rozha One and Mukta carry the same weight and
// feel in Devanagari, so Hindi pages look like the same site.
const caprasimo = Caprasimo({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-caprasimo',
  display: 'swap',
});
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-figtree',
  display: 'swap',
});
const rozha = Rozha_One({
  subsets: ['devanagari'],
  weight: '400',
  variable: '--font-rozha',
  display: 'swap',
});
const mukta = Mukta({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mukta',
  display: 'swap',
});

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    metadataBase: new URL(env.appOrigin()),
    title: { default: `${t('appName')} · ${t('tagline')}`, template: `%s · ${t('appName')}` },
    description: `${t('tagline')}. ${t('independence')}`,
    applicationName: 'ElectraLens',
    alternates: {
      languages: Object.fromEntries(routing.locales.map((code) => [code, `/${code}`])),
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await pageLocale(params);
  // Reading the request makes every page render per request, which the CSP nonce requires.
  await headers();
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  );
  return (
    <html
      lang={locale}
      className={`${caprasimo.variable} ${figtree.variable} ${rozha.variable} ${mukta.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-white">
        <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
