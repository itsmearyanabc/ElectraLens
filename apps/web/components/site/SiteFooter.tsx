import { getTranslations } from 'next-intl/server';

import { LogoMark } from '@/components/ui/Logo';
import { Link } from '@/i18n/navigation';

const REPOSITORY = 'https://github.com/itsmearyanabc/ElectraLens';

export async function SiteFooter() {
  const t = await getTranslations();
  const columns = [
    {
      title: t('footer.explore'),
      links: [
        ['/findings', t('nav.findings')],
        ['/compare', t('nav.compare')],
        ['/datasets', t('nav.datasets')],
        ['/booths', t('nav.booths')],
      ],
    },
    {
      title: t('footer.trust'),
      links: [
        ['/publications', t('nav.publications')],
        ['/verify', t('nav.verify')],
        ['/methodology', t('nav.methodology')],
        ['/claims', t('nav.claims')],
      ],
    },
    {
      title: t('footer.help'),
      links: [
        ['/assistant', t('nav.assistant')],
        ['/official-links', t('nav.officialLinks')],
        ['/account', t('nav.account')],
      ],
    },
    {
      title: t('footer.project'),
      links: [
        ['/about', t('nav.about')],
        ['/privacy', t('nav.privacy')],
        ['/ops', t('nav.ops')],
      ],
    },
  ] as const;

  return (
    <footer className="on-dark glow-dark mt-24 text-white">
      <div className="container-page grid gap-12 pt-16 pb-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <span className="display text-[1.75rem] leading-none">
              Electra<span className="text-saffron">Lens</span>
            </span>
          </div>
          <p className="mt-5 max-w-sm text-white/80">{t('footer.notOfficial')}</p>
          <p className="mt-3 max-w-sm text-white/80">{t('footer.openData')}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow !font-mono !text-[0.75rem]">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-white/90 no-underline hover:text-white hover:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-white/65">
          <p>{t('common.independence')}</p>
          <p>
            {t('footer.openSource')} ·{' '}
            <a href={REPOSITORY} className="text-white" rel="noopener noreferrer" target="_blank">
              {t('footer.sourceCode')}
              <span className="sr-only"> ({t('common.external')})</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
