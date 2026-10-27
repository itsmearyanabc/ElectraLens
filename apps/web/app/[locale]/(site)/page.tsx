import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AnchorStatusBadge } from '@/components/site/AnchorStatus';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatTile } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { AggregateTable } from '@/lib/aggregates';
import { getAggregates, getArea, latestPublication } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { formatDate, formatNumber, formatSigned, shortHash } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('metaTitle') };
}

const HEADLINE_METRICS = [
  'electors_baseline',
  'electors_target',
  'additions',
  'deletions',
] as const;

const TOOLS: [string, string, string, IconName][] = [
  ['/findings', 'toolFindings', 'toolFindingsText', 'search'],
  ['/compare', 'toolCompare', 'toolCompareText', 'chart'],
  ['/verify', 'toolVerify', 'toolVerifyText', 'shield'],
  ['/claims', 'toolClaims', 'toolClaimsText', 'scale'],
  ['/booths', 'toolBooths', 'toolBoothsText', 'pin'],
  ['/assistant', 'toolAssistant', 'toolAssistantText', 'help'],
];

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const latest = await latestPublication();
  const area = latest ? await getArea(latest.series_id) : null;
  const table =
    latest && area ? new AggregateTable(await getAggregates(latest.id, [area.id])) : null;
  const evm = latest?.blockchain_anchors.find((a) => a.anchor_type === 'evm');
  const audience = t.raw('home.audience') as string[];

  return (
    <>
      {/* Hero */}
      <section className="glow relative overflow-hidden">
        <div className="container-page relative grid items-center gap-14 pt-16 pb-20 lg:grid-cols-[1.15fr_1fr] lg:pt-24 lg:pb-28">
          <div>
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1 className="mt-5 text-[2.75rem] leading-[1.02] sm:text-[4rem]">
              {t('home.titleA')}
              <br />
              <span className="text-blue">{t('home.titleB')}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              {t('home.lede')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/findings" className="btn btn-primary !min-h-14 !px-7 text-[1.0625rem]">
                {t('home.ctaFindings')} <Icon name="arrow" size={20} />
              </Link>
              <Link href="/verify" className="btn btn-outline !min-h-14 !px-7 text-[1.0625rem]">
                {t('home.ctaVerify')}
              </Link>
            </div>
            <p className="mt-8 flex items-start gap-2 text-sm text-muted">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron"
              />
              {t('common.syntheticNotice')}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-6 h-56 w-56 rounded-full bg-peach"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-10 -left-8 h-48 w-48 rounded-full bg-blue-tint"
            />
            <div
              aria-hidden="true"
              className="absolute top-8 -left-4 h-16 w-16 rotate-12 rounded-2xl bg-saffron"
            />
            <aside aria-labelledby="latest-title" className="card-float relative p-7 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p id="latest-title" className="mono-label">
                  {t('home.passportLabel')}
                </p>
                {latest && (
                  <Badge tone={latest.status === 'published' ? 'blue' : 'danger'}>
                    {t(`pubStatus.${latest.status}`)}
                  </Badge>
                )}
              </div>
              {latest ? (
                <>
                  <p className="display mt-5 text-[2.25rem] leading-none text-ink">
                    {latest.series_id}
                    <span className="text-saffron"> · </span>
                    <span className="text-blue">№ {latest.sequence}</span>
                  </p>
                  {area && <p className="mt-2 text-muted">{localName(area.name, locale)}</p>}
                  <dl className="mt-6 divide-y divide-line border-y border-line">
                    {[
                      [t('home.passportPublished'), formatDate(locale, latest.published_at)],
                      [t('home.passportApprovals'), t('home.passportApprovalsValue')],
                      [t('home.passportFiles'), t('home.passportFilesValue')],
                    ].map(([term, detail]) => (
                      <div key={term} className="flex items-baseline justify-between gap-4 py-3">
                        <dt className="mono-label">{term}</dt>
                        <dd className="text-right text-[0.9375rem] font-semibold">{detail}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="mono-label">{t('home.anchor')}</dt>
                      <dd>
                        <AnchorStatusBadge status={evm?.status ?? 'pending'} />
                      </dd>
                    </div>
                  </dl>
                  {latest.manifest_hash && (
                    <p className="mt-5 rounded-xl bg-mist px-3 py-2 font-mono text-[0.8125rem] text-muted">
                      <span className="text-subtle">sha256 </span>
                      {shortHash(latest.manifest_hash, 16)}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link href={`/verify/${latest.id}`} className="btn btn-blue flex-1">
                      <Icon name="shield" size={18} /> {t('nav.verify')}
                    </Link>
                    <Link href={`/publications/${latest.id}`} className="btn btn-ghost">
                      {t('home.viewPublication')}
                    </Link>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-muted">{t('home.latestEmpty')}</p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* Audience strip */}
      <section aria-label={t('home.audienceLabel')} className="border-y border-line bg-white">
        <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-3 py-6">
          <p className="mono-label">{t('home.audienceLabel')}</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {audience.map((who) => (
              <li key={who} className="display text-xl text-ink/80">
                {who}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Headline numbers */}
      {latest && area && table && table.size > 0 && (
        <section aria-labelledby="numbers-title" className="container-page pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t('compare.eyebrow')}</p>
              <h2 id="numbers-title" className="mt-3 text-[2.25rem] sm:text-[2.75rem]">
                {t('home.numbersTitle')}
              </h2>
              <p className="mt-3 text-muted">
                {t('home.numbersLede', { area: localName(area.name, locale) })}
              </p>
            </div>
            <Link href={`/compare?area=${area.code}`} className="btn btn-outline">
              {t('home.toolCompare')} <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HEADLINE_METRICS.map((metric, index) => {
              const value = table.value(area.id, metric);
              return (
                <StatTile
                  key={metric}
                  accent={index >= 2}
                  label={t(`metric.${metric}`)}
                  value={value === null ? '< 10' : formatNumber(locale, value)}
                />
              );
            })}
            <StatTile
              accent
              label={t('metric.net_change')}
              value={formatSigned(locale, table.value(area.id, 'net_change') ?? 0)}
            />
          </div>
        </section>
      )}

      {/* Tools */}
      <section aria-labelledby="tools-title" className="container-page pt-24">
        <p className="eyebrow">{t('home.toolsEyebrow')}</p>
        <h2 id="tools-title" className="mt-3 text-[2.25rem] sm:text-[2.75rem]">
          {t('home.toolsTitle')}
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(([href, title, text, icon], index) => (
            <li key={href}>
              <Link
                href={href}
                className="card group flex h-full flex-col gap-4 p-7 no-underline transition-all hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-float)]"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index % 2 === 0 ? 'bg-saffron-tint text-orange-ink' : 'bg-blue-tint text-blue'}`}
                >
                  <Icon name={icon} />
                </span>
                <span className="text-xl font-bold text-ink">{t(`home.${title}`)}</span>
                <span className="text-muted">{t(`home.${text}`)}</span>
                <span className="mt-auto flex items-center gap-1 font-bold text-blue">
                  {t('common.learnMore')}
                  <Icon
                    name="arrow"
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Tamper band */}
      <section aria-labelledby="tamper-title" className="container-page pt-24">
        <div className="on-dark glow-dark overflow-hidden rounded-[2rem] p-8 text-white sm:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow">{t('home.tamperEyebrow')}</p>
              <h2 id="tamper-title" className="mt-4 text-[2.25rem] !text-white sm:text-[2.75rem]">
                {t('home.tamperTitle')}
              </h2>
              <p className="mt-5 max-w-xl text-lg text-white/75">{t('home.tamperText')}</p>
              {latest && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={`/verify/${latest.id}/tamper`} className="btn btn-primary">
                    {t('home.tamperCta')} <Icon name="arrow" size={18} />
                  </Link>
                  <Link
                    href={`/verify/${latest.id}`}
                    className="btn border-white/30 text-white hover:bg-white/10"
                  >
                    {t('home.tamperSecondary')}
                  </Link>
                </div>
              )}
            </div>
            <ol aria-hidden="true" className="grid gap-3">
              {['manifest.json', 'report.json', 'aggregates.json'].map((file, index) => (
                <li
                  key={file}
                  className="dark-panel flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span>
                    <span className="block font-mono text-xs tracking-wider text-white/50">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-semibold">{file}</span>
                  </span>
                  <span className="rounded-full bg-blue/25 px-3 py-1 font-mono text-xs font-semibold text-blue-soft">
                    sha256 ✓
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Is / is not */}
      <section aria-labelledby="is-title" className="container-page pt-24">
        <p className="eyebrow">{t('home.isEyebrow')}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="card p-8">
            <h2 id="is-title" className="text-[1.875rem]">
              {t('home.isTitle')}
            </h2>
            <ul className="mt-6 space-y-4">
              {(['is1', 'is2', 'is3'] as const).map((key) => (
                <li key={key} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-tint text-blue">
                    <Icon name="check" size={15} />
                  </span>
                  <span>{t(`home.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card bg-saffron-tint/60 p-8">
            <h2 className="text-[1.875rem]">{t('home.isNotTitle')}</h2>
            <ul className="mt-6 space-y-4">
              {(['isNot1', 'isNot2', 'isNot3'] as const).map((key) => (
                <li key={key} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-peach font-bold text-orange-deep"
                  >
                    ✕
                  </span>
                  <span>{t(`home.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="container-page pt-24">
        <p className="eyebrow">{t('home.howEyebrow')}</p>
        <h2 id="how-title" className="mt-3 text-[2.25rem] sm:text-[2.75rem]">
          {t('home.howTitle')}
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((step) => (
            <li key={step} className="card relative overflow-hidden p-7">
              <span
                aria-hidden="true"
                className="display absolute -top-3 -right-1 text-[6rem] leading-none text-mist"
              >
                {step}
              </span>
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-ink font-bold text-white">
                {step}
              </span>
              <h3 className="relative mt-5 text-lg">{t(`home.how${step}Title`)}</h3>
              <p className="relative mt-2 text-muted">{t(`home.how${step}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing call to action */}
      <section className="container-page pt-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-saffron-tint px-8 py-14 text-center sm:px-14">
          <div
            aria-hidden="true"
            className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-peach"
          />
          <div
            aria-hidden="true"
            className="absolute -right-12 -bottom-20 h-56 w-56 rounded-full bg-blue-tint"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[2.25rem] sm:text-[2.75rem]">
              {t('home.ctaTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{t('home.ctaText')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/verify" className="btn btn-primary">
                {t('home.ctaPrimary')} <Icon name="arrow" size={18} />
              </Link>
              <Link href="/methodology" className="btn btn-outline">
                {t('home.ctaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
