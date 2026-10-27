import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { SyntheticBadge } from '@/components/ui/Badge';
import { ExternalLink, Notice } from '@/components/ui/Page';
import { LogoMark, Wordmark } from '@/components/ui/Logo';
import { HistoryForm } from '@/components/voter/HistoryForm';
import { areaLabels } from '@/lib/areas';
import { getBooth, getVoterCard } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { OFFICIAL } from '@/lib/official';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/v/[code]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'voterCard' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * Reached from the QR code on a synthetic demo voter card: the holder's polling booth. The
 * participation history needs the card's PIN. The code in the URL is random, not a card number.
 */
export default async function VoterCardPage({ params }: PageProps<'/[locale]/v/[code]'>) {
  const locale = await pageLocale(params);
  const { code } = await params;
  const card = await getVoterCard(code);
  if (!card) notFound();
  const booth = await getBooth(card.booth_code);
  if (!booth) notFound();
  const t = await getTranslations();
  const ac = (await areaLabels([booth.ac_id], locale)).get(booth.ac_id);

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
      <main id="main" className="mx-auto max-w-2xl space-y-6 px-5 py-10">
        <a href={`/${locale}`} className="inline-flex items-center gap-2.5 no-underline">
          <LogoMark size={34} />
          <Wordmark className="text-xl" />
        </a>

        <article className="card-float relative overflow-hidden p-7 sm:p-9">
          <p
            aria-hidden="true"
            className="display pointer-events-none absolute top-6 -right-14 rotate-[18deg] bg-saffron px-16 py-1 text-sm tracking-widest text-ink"
          >
            {t('booth.demoWatermark')}
          </p>
          <p className="mono-label">{t('voterCard.eyebrow')}</p>
          <h1 className="mt-3 pr-10 text-[2rem] leading-tight">
            {t('voterCard.hello', { name: card.holder_name })}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SyntheticBadge />
            <span className="hash text-sm">{card.card_number}</span>
          </div>

          <h2 className="mt-8 text-xl">{t('voterCard.yourBooth')}</h2>
          <p className="display mt-2 text-2xl text-blue">{localName(booth.name, locale)}</p>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('booth.address')}</dt>
              <dd>{localName(booth.address, locale)}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
              <dt className="mono-label">{t('voterCard.partSerial')}</dt>
              <dd className="font-semibold">
                {t('voterCard.partSerialValue', {
                  part: card.part_number ?? '—',
                  serial: card.serial_number ?? '—',
                })}
                {ac && <span className="font-normal text-muted"> · {ac.label}</span>}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href={`/${locale}/b/${booth.public_code}`} className="btn btn-primary">
              {t('voterCard.boothDetails')}
            </a>
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
          </div>
        </article>

        <HistoryForm
          code={code}
          text={{
            title: t('voterCard.historyTitle'),
            intro: t('voterCard.historyIntro'),
            pin: t('voterCard.pin'),
            show: t('voterCard.show'),
            wrong: t('voterCard.wrong'),
            locked: t('voterCard.locked'),
            failed: t('voterCard.failed'),
            voted: t('voterCard.voted'),
            missed: t('voterCard.missed'),
            summary: t.raw('voterCard.summary') as string,
            allVoted: t('voterCard.allVoted'),
            synthetic: t('voterCard.synthetic'),
          }}
        />

        <Notice tone="caution">{t('voterCard.notOfficial')}</Notice>
      </main>
    </div>
  );
}
