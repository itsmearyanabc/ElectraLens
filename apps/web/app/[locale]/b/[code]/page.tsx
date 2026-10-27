import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { SyntheticBadge } from '@/components/ui/Badge';
import { ExternalLink, Notice } from '@/components/ui/Page';
import { LogoMark, Wordmark } from '@/components/ui/Logo';
import { areaLabels } from '@/lib/areas';
import { getBooth } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { OFFICIAL } from '@/lib/official';
import { boothUrl } from '@/lib/qr';

const ACCESS_KEYS = ['ramp', 'ground_floor', 'wheelchair', 'drinking_water', 'toilet'] as const;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/b/[code]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { code } = await params;
  const booth = await getBooth(code);
  if (!booth) return {};
  return {
    title: localName(booth.name, locale),
    alternates: { canonical: boothUrl(booth.public_code) },
    robots: booth.is_synthetic ? { index: false } : undefined,
  };
}

/** Q01: reached from a QR code. Never linked to an account, and query strings aren't logged (B13.08). */
export default async function BoothPage({ params }: PageProps<'/[locale]/b/[code]'>) {
  const locale = await pageLocale(params);
  const { code } = await params;
  const booth = await getBooth(code);
  if (!booth) notFound();
  const t = await getTranslations();
  const ac = (await areaLabels([booth.ac_id], locale)).get(booth.ac_id);
  const access = (booth.accessibility ?? {}) as Record<string, boolean>;

  return (
    <div className="glow min-h-dvh">
      <header className="on-dark bg-ink text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-2 text-[0.8125rem]">
          <span className="text-white/85">{t('common.independence')}</span>
          <Suspense>
            <LanguageSwitcher label={t('nav.language')} onDark />
          </Suspense>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-2xl px-5 py-10">
        <a href={`/${locale}`} className="inline-flex items-center gap-2.5 no-underline">
          <LogoMark size={34} />
          <Wordmark className="text-xl" />
        </a>

        <article className="card-float relative mt-8 overflow-hidden p-7 sm:p-9">
          {booth.is_synthetic && (
            <p
              aria-hidden="true"
              className="display pointer-events-none absolute top-6 -right-14 rotate-[18deg] bg-saffron px-16 py-1 text-sm tracking-widest text-ink"
            >
              {t('booth.demoWatermark')}
            </p>
          )}
          <p className="mono-label">{t('booth.posterTitle')}</p>
          <h1 className="mt-3 pr-10 text-[2rem] leading-tight">{localName(booth.name, locale)}</h1>
          {booth.is_synthetic && (
            <div className="mt-3">
              <SyntheticBadge />
            </div>
          )}

          <dl className="mt-7 divide-y divide-line border-y border-line">
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.address')}</dt>
              <dd>{localName(booth.address, locale)}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.partsServed')}</dt>
              <dd className="font-semibold">
                {booth.parts_served.join(', ')}
                {ac && <span className="font-normal text-muted"> · {ac.label}</span>}
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.accessibility')}</dt>
              <dd>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {ACCESS_KEYS.map((key) => (
                    <li key={key} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${access[key] ? 'bg-blue text-white' : 'bg-mist text-subtle'}`}
                      >
                        {access[key] ? '✓' : '–'}
                      </span>
                      <span>
                        {t(`booth.access.${key}`)}
                        <span className="sr-only">
                          : {access[key] ? t('booth.available') : t('booth.notAvailable')}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.lastVerified')}</dt>
              <dd>{formatDate(locale, booth.verified_at) || '—'}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.source')}</dt>
              <dd>{booth.is_synthetic ? t('booth.sourceSynthetic') : (booth.source_url ?? '—')}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.code')}</dt>
              <dd className="hash text-base">{booth.public_code}</dd>
            </div>
          </dl>

          <div className="mt-7">
            <Notice tone="caution">{t('booth.notOfficial')}</Notice>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span className="rounded-full border border-line px-5 py-3">
              <ExternalLink
                href={OFFICIAL.electoralSearch}
                official
                externalLabel={t('common.external')}
                officialLabel={t('common.official')}
              >
                {t('booth.checkOfficial')}
              </ExternalLink>
            </span>
            <a href={`/b/${booth.public_code}/poster`} className="text-sm font-bold">
              {t('booths.poster')}
            </a>
          </div>
        </article>
      </main>
    </div>
  );
}
