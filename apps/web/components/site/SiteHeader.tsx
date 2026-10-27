import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { LogoMark, Wordmark } from '@/components/ui/Logo';
import { Link } from '@/i18n/navigation';

import { LanguageSwitcher } from './LanguageSwitcher';
import { NavLinks, type NavItem } from './NavLinks';

export async function SiteHeader() {
  const t = await getTranslations();
  const items: NavItem[] = [
    { href: '/findings', label: t('nav.findings') },
    { href: '/compare', label: t('nav.compare') },
    { href: '/publications', label: t('nav.publications') },
    { href: '/verify', label: t('nav.verify') },
    { href: '/claims', label: t('nav.claims') },
    { href: '/booths', label: t('nav.booths') },
  ];
  const menu: NavItem[] = [
    ...items,
    { href: '/datasets', label: t('nav.datasets') },
    { href: '/methodology', label: t('nav.methodology') },
    { href: '/assistant', label: t('nav.assistant') },
    { href: '/official-links', label: t('nav.officialLinks') },
    { href: '/account', label: t('nav.account') },
  ];
  return (
    <header className="sticky top-0 z-40">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-saffron px-5 py-2 font-bold text-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        {t('common.skipToContent')}
      </a>
      {/* T25: the independence notice is on every page, before anything else. */}
      <div className="on-dark bg-ink text-white">
        <div className="container-page flex items-center justify-between gap-4 py-1.5 text-[0.8125rem]">
          <p className="flex items-center gap-2 text-white/85">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
            {t('common.independence')}
          </p>
          <Suspense>
            <LanguageSwitcher label={t('nav.language')} onDark />
          </Suspense>
        </div>
      </div>
      <div className="border-b border-line/80 bg-white/85 backdrop-blur-md">
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 no-underline"
            aria-label={`${t('common.appName')}, ${t('nav.home')}`}
          >
            <LogoMark size={38} />
            <span className="flex flex-col leading-none">
              <Wordmark className="text-[1.5rem] leading-none" />
              <span className="mt-1 hidden text-[9px] font-bold tracking-[0.14em] text-muted uppercase sm:block">
                {t('nav.brandLine')}
              </span>
            </span>
          </Link>

          <nav aria-label={t('nav.primary')} className="hidden xl:block">
            <NavLinks items={items} />
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/verify" className="btn btn-primary btn-sm hidden sm:inline-flex xl:hidden">
              {t('nav.verify')}
            </Link>
            <Link href="/account" className="btn btn-outline btn-sm hidden xl:inline-flex">
              {t('nav.account')}
            </Link>
            <details className="relative xl:hidden">
              <summary
                className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm hover:bg-mist [&::-webkit-details-marker]:hidden"
                aria-label={t('nav.menu')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </summary>
              <nav
                aria-label={t('nav.primary')}
                className="card-float absolute right-0 z-50 mt-3 w-72 overflow-hidden"
              >
                <NavLinks vertical items={menu} />
              </nav>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
