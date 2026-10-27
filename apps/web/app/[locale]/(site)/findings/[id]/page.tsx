import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AiExplanation } from '@/components/findings/AiExplanation';
import { LabelBadge, ReviewBadge, SignalBadge } from '@/components/ui/Badge';
import { DefinitionList, Notice, PageHeader, TableWrap } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { areaLabels } from '@/lib/areas';
import { getFinding } from '@/lib/data/public';
import { env } from '@/lib/env';
import { evidenceRows } from '@/lib/evidence';
import { catalogueText, explanationText, parseFinding, ruleName } from '@/lib/findings';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/findings/[id]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { id } = await params;
  const row = await getFinding(id);
  const t = await getTranslations({ locale, namespace: 'finding' });
  if (!row) return {};
  return {
    title: `${t('metaTitle', { code: row.finding_code })} · ${ruleName(locale, row.rule_id)}`,
  };
}

export default async function FindingPage({ params }: PageProps<'/[locale]/findings/[id]'>) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const row = await getFinding(id);
  if (!row) notFound();
  const t = await getTranslations();
  const finding = parseFinding(row.finding);
  const area = (await areaLabels([row.jurisdiction_id], locale)).get(row.jurisdiction_id);
  const permalink = `${env.appOrigin()}/${locale}/findings/${row.id}`;

  return (
    <>
      <PageHeader
        eyebrow={t('finding.eyebrow', { code: row.finding_code })}
        title={`${row.rule_id} · ${ruleName(locale, row.rule_id)}`}
        lede={area ? `${t('finding.inArea', { area: area.label })} · ${area.code}` : undefined}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SignalBadge strength={row.signal_strength} />
          <ReviewBadge status={row.review_status} />
          <LabelBadge label={row.label} />
        </div>
      </PageHeader>

      <div className="container-page py-8">
        {!finding ? (
          <Notice tone="danger" title={t('finding.unavailable')} />
        ) : (
          <div className="space-y-8">
            <section aria-labelledby="explanation-title" className="max-w-3xl">
              <h2 id="explanation-title" className="text-2xl">
                {t('finding.explanation')}
              </h2>
              <p className="mt-3 text-lg leading-relaxed">{explanationText(finding, locale)}</p>
              <p className="mt-3 text-sm text-muted">
                {t(`strength.help_${finding.signal_strength}`)}
              </p>
            </section>

            <AiExplanation
              findingId={row.id}
              locale={locale}
              text={{
                title: t('finding.ai.title'),
                intro: t('finding.ai.intro'),
                button: t('finding.ai.button'),
                working: t('finding.ai.working'),
                badge: t('finding.ai.badge'),
                disclaimer: t('finding.ai.disclaimer'),
                unavailable: t('finding.ai.unavailable'),
                refused: t('finding.ai.refused'),
              }}
            />

            {/* B09.06: alternatives are shown as prominently as the evidence, side by side. */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section
                aria-labelledby="evidence-title"
                className="card border-t-4 border-t-blue p-6"
              >
                <h2 id="evidence-title" className="text-xl">
                  {t('finding.evidence')}
                </h2>
                <p className="mt-1 text-sm text-muted">{t('finding.evidenceHelp')}</p>
                <div className="mt-4">
                  <TableWrap label={t('finding.evidence')}>
                    <thead>
                      <tr>
                        <th scope="col">{t('finding.measure')}</th>
                        <th scope="col" className="text-right">
                          {t('common.value')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceRows(finding.evidence, locale).map((item) => (
                        <tr key={item.key}>
                          <th scope="row" className="!bg-white font-normal !text-ink">
                            {t.has(`evidence.${item.key}`) ? t(`evidence.${item.key}`) : item.key}
                          </th>
                          <td className="text-right font-semibold tabular-nums">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </div>
                <div className="mt-5">
                  <DefinitionList
                    items={[
                      ...(finding.baseline
                        ? [
                            {
                              term: t('finding.comparedWith'),
                              detail: t('finding.baselineText', {
                                units: finding.baseline.n_units,
                                type: t.has(`finding.baselineType.${finding.baseline.type}`)
                                  ? t(`finding.baselineType.${finding.baseline.type}`)
                                  : finding.baseline.type,
                                method: t.has(`finding.method.${finding.baseline.method}`)
                                  ? t(`finding.method.${finding.baseline.method}`)
                                  : finding.baseline.method,
                              }),
                            },
                          ]
                        : []),
                      {
                        term: t('finding.criterion'),
                        detail: <code className="hash">{finding.criterion}</code>,
                      },
                    ]}
                  />
                </div>
              </section>

              <section
                aria-labelledby="alternatives-title"
                className="card border-t-4 border-t-saffron bg-saffron-tint/40 p-6"
              >
                <h2 id="alternatives-title" className="text-xl">
                  {t('finding.alternatives')}
                </h2>
                <p className="mt-1 text-sm text-muted">{t('finding.alternativesHelp')}</p>
                <ul className="mt-4 space-y-3">
                  {finding.alternative_explanations.map((key) => (
                    <li key={key} className="flex gap-3">
                      <span aria-hidden="true" className="mt-0.5 font-bold text-orange-ink">
                        ◆
                      </span>
                      <span>{catalogueText(locale, key)}</span>
                    </li>
                  ))}
                </ul>
                <h3 className="mt-6 text-lg">{t('finding.limitations')}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                  {finding.limitations.map((key) => (
                    <li key={key}>{catalogueText(locale, key)}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section aria-labelledby="details-title" className="card p-6">
              <h2 id="details-title" className="sr-only">
                {t('finding.review')}
              </h2>
              <DefinitionList
                items={[
                  {
                    term: t('finding.review'),
                    detail: (
                      <span className="flex flex-wrap items-center gap-2">
                        <ReviewBadge status={row.review_status} />
                        {finding.review.reviewed_at
                          ? t('finding.reviewedOn', {
                              date: formatDate(locale, finding.review.reviewed_at),
                            })
                          : t('finding.notReviewed')}
                      </span>
                    ),
                  },
                  {
                    term: t('common.rule'),
                    detail: (
                      <>
                        {t('finding.rule', { id: finding.rule.id, version: finding.rule.version })}{' '}
                        · <Link href="/methodology">{t('finding.methodologyLink')}</Link>
                      </>
                    ),
                  },
                  {
                    term: t('finding.datasets'),
                    detail: (
                      <span className="flex flex-col gap-1">
                        {finding.datasets.baseline && (
                          <Link href={`/datasets/${finding.datasets.baseline}`}>
                            {t('datasets.roleBaseline')}
                          </Link>
                        )}
                        <Link href={`/datasets/${finding.datasets.target}`}>
                          {t('datasets.roleTarget')}
                        </Link>
                      </span>
                    ),
                  },
                  {
                    term: t('finding.permalink'),
                    detail: <code className="hash">{permalink}</code>,
                  },
                ]}
              />
              <p className="mt-5 text-sm text-muted">{t('finding.shareNote')}</p>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
