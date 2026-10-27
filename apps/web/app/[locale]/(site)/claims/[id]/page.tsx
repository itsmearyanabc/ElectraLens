import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { VerdictBadge } from '@/components/claims/VerdictBadge';
import { LabelBadge } from '@/components/ui/Badge';
import { DefinitionList, PageHeader, Section } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { getPublishedClaim } from '@/lib/data/public';
import { formatDate, formatNumber } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/claims/[id]'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'claims' });
  return { title: t('submitted') };
}

export default async function ClaimPage({ params }: PageProps<'/[locale]/claims/[id]'>) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const claim = await getPublishedClaim(id);
  if (!claim) notFound();
  const t = await getTranslations();
  const assessment = claim.claim_assessments[0];
  const explanation = (assessment?.explanation ?? {}) as Record<string, string>;
  const evidence = (assessment?.evidence ?? {}) as { published_value?: number | null };

  return (
    <>
      <PageHeader eyebrow={t('claims.submitted')} title={`“${claim.text ?? ''}”`}>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <LabelBadge label="user_claim" />
          {assessment && <VerdictBadge verdict={assessment.verdict} />}
        </div>
      </PageHeader>
      <div className="container-page py-4">
        {assessment && (
          <Section title={t('claims.verdictTitle')} id="verdict">
            <div className="card max-w-3xl p-6">
              <p className="text-2xl font-bold text-navy">
                {t(`claims.verdict.${assessment.verdict}`)}
              </p>
              <p className="mt-3 text-lg">{explanation[locale] ?? explanation.en}</p>
              <div className="mt-5">
                <DefinitionList
                  items={[
                    ...(typeof evidence.published_value === 'number'
                      ? [
                          {
                            term: t('claims.publishedFigure'),
                            detail: formatNumber(locale, evidence.published_value),
                          },
                        ]
                      : []),
                    { term: t('common.date'), detail: formatDate(locale, assessment.created_at) },
                    {
                      term: t('claims.methodLabel'),
                      detail: <code className="hash">{assessment.method_version}</code>,
                    },
                    ...(assessment.publication_id
                      ? [
                          {
                            term: t('claims.basedOn'),
                            detail: (
                              <Link href={`/publications/${assessment.publication_id}`}>
                                {t('nav.publications')}
                              </Link>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>
          </Section>
        )}
        <p className="pb-4">
          <Link href="/claims" className="font-semibold">
            ← {t('nav.claims')}
          </Link>
        </p>
      </div>
    </>
  );
}
