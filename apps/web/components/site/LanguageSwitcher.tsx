'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

// Each language is named in itself, so a reader can find theirs whatever the page language.
const NATIVE_NAMES: Record<Locale, string> = { en: 'English', hi: 'हिन्दी' };

/** A segmented pill: one segment per language. */
export function LanguageSwitcher({ label, onDark = false }: { label: string; onDark?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = Object.fromEntries(search.entries());
  return (
    <nav aria-label={label}>
      <ul
        className={`flex items-center rounded-full p-0.5 ${onDark ? 'bg-white/10' : 'border border-line bg-white'}`}
      >
        {routing.locales.map((code) => {
          const current = code === locale;
          return (
            <li key={code}>
              <Link
                href={{ pathname, query }}
                locale={code}
                lang={code}
                hrefLang={code}
                aria-current={current ? 'true' : undefined}
                className={`block rounded-full px-3 py-1 text-sm font-semibold no-underline transition-colors ${
                  current
                    ? onDark
                      ? 'bg-white text-ink'
                      : 'bg-ink text-white'
                    : onDark
                      ? 'text-white/80 hover:text-white'
                      : 'text-muted hover:text-ink'
                }`}
              >
                {NATIVE_NAMES[code]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
