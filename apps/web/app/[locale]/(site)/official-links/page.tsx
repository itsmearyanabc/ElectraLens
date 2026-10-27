import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Notice, PageHeader } from '@/components/ui/Page';
import { pageLocale } from '@/lib/locale';
import { OFFICIAL } from '@/lib/official';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/official-links'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'officialLinks' });
  return { title: t('metaTitle') };
}

const SERVICES: [href: string, key: string, icon: IconName][] = [
  [OFFICIAL.votersPortal, 'portal', 'file'],
  [OFFICIAL.electoralSearch, 'search', 'search'],
  [OFFICIAL.eci, 'eci', 'link'],
  [OFFICIAL.helpline, 'helpline', 'help'],
];

export default async function OfficialLinksPage({ params }: PageProps<'/[locale]/official-links'>) {
  await pageLocale(params);
  const t = await getTranslations();
  return (
    <>
      <PageHeader
        eyebrow={t('officialLinks.eyebrow')}
        title={t('officialLinks.title')}
        lede={t('officialLinks.lede')}
      />
      <div className="container-page py-12">
        <Notice tone="caution">{t('officialLinks.neverAsk')}</Notice>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {SERVICES.map(([href, key, icon]) => {
            const external = href.startsWith('http');
            return (
              <li key={key}>
                <a
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className="card group flex h-full gap-5 p-7 no-underline transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-tint text-blue">
                    <Icon name={icon} />
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-bold text-ink">
                        {t(`officialLinks.${key}`)}
                      </span>
                      <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-wider text-white uppercase">
                        {t('common.official')}
                      </span>
                    </span>
                    <span className="text-muted">{t(`officialLinks.${key}Text`)}</span>
                    {external && (
                      <span className="mt-1 font-mono text-sm text-blue">
                        {new URL(href).host} ↗
                        <span className="sr-only"> ({t('common.external')})</span>
                      </span>
                    )}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
