import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PublicationStatusBadge, SyntheticBadge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, Section } from '@/components/ui/Page';
import { ManifestFileCheck } from '@/components/verify/ManifestFileCheck';
import { Link } from '@/i18n/navigation';
import { listPublications } from '@/lib/data/public';
import { formatDate, shortHash } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/verify'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'verify' });
  return { title: t('metaTitle') };
}

export default async function VerifyIndexPage({ params }: PageProps<'/[locale]/verify'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const publications = (await listPublications()).filter((p) => p.manifest_hash);

  return (
    <>
      <PageHeader eyebrow={t('verify.eyebrow')} title={t('verify.title')} lede={t('verify.lede')} />
      <div className="container-page grid gap-8 py-4 lg:grid-cols-[1.4fr_1fr]">
        <Section title={t('verify.chooseTitle')} id="choose">
          {publications.length === 0 ? (
            <EmptyState title={t('verify.empty')} />
          ) : (
            <ul className="space-y-3">
              {publications.map((publication) => (
                <li key={publication.id}>
                  <Link
                    href={`/verify/${publication.id}`}
                    className="card flex flex-wrap items-center justify-between gap-3 p-5 no-underline hover:border-blue"
                  >
                    <span>
                      <span className="block text-lg font-bold text-navy">
                        {t('publication.title', {
                          series: publication.series_id,
                          sequence: publication.sequence,
                        })}
                      </span>
                      <span className="text-sm text-muted">
                        {formatDate(locale, publication.published_at)} ·{' '}
                        <code className="hash">
                          {shortHash(publication.manifest_hash as string)}
                        </code>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <PublicationStatusBadge status={publication.status} />
                      {publication.is_synthetic && <SyntheticBadge />}
                      <span aria-hidden="true" className="text-xl text-blue">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={t('verify.fileTitle')} id="file" description={t('verify.fileHelp')}>
          <div className="card p-5">
            <ManifestFileCheck
              known={publications.map((p) => ({
                id: p.id,
                label: t('publication.title', { series: p.series_id, sequence: p.sequence }),
                hash: p.manifest_hash as string,
              }))}
            />
          </div>
        </Section>
      </div>
    </>
  );
}
