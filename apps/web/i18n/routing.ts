import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // The third language is added here and in messages/ once chosen (decision D4).
  locales: ['en', 'hi'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (routing.locales as readonly string[]).includes(value);
