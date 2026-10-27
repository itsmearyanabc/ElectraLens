import { getRequestConfig } from 'next-intl/server';

import { isLocale, routing } from './routing';

/** Messages are split by area so translators can work on one file at a time. */
export const MESSAGE_FILES = ['common', 'public', 'account', 'ops'] as const;

export async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  const parts = await Promise.all(
    MESSAGE_FILES.map(
      async (file) =>
        (await import(`../messages/${locale}/${file}.json`)).default as Record<string, unknown>,
    ),
  );
  return Object.assign({}, ...parts);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;
  return { locale, messages: await loadMessages(locale), timeZone: 'Asia/Kolkata' };
});
