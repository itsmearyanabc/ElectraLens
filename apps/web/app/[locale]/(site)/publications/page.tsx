import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AnchorStatusBadge } from '@/components/site/AnchorStatus';
import { PublicationStatusBadge, SyntheticBadge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, TableWrap } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { listPublications, type PublicationSummary } from '@/lib/data/public';
import { formatDate, shortHash } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/publications'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'publications' });
  return { title: t('metaTitle') };
}

export default async function PublicationsPage({ params }: PageProps<'/[locale]/publications'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const publications = await listPublications();
  const series = new Map<string, PublicationSummary[]>();
  for (const publication of publications) {
    const list = series.get(publication.series_id) ?? [];
    list.push(publication);
    series.set(publication.series_id, list);
  }

  return (
    <>
      <PageHeader
        eyebrow={t('publications.eyebrow')}
        title={t('publications.title')}
        lede={t('publications.lede')}
      />
      <div className="container-page space-y-10 py-8">
        {series.size === 0 && <EmptyState title={t('publications.empty')} />}
        {[...series].map(([seriesId, items]) => (
          <section key={seriesId} aria-labelledby={`series-${seriesId}`}>
            <h2 id={`series-${seriesId}`} className="flex flex-wrap items-center gap-3 text-2xl">
              {t('publications.series', { series: seriesId })}
              {items[0]?.is_synthetic && <SyntheticBadge />}
            </h2>
            <div className="mt-4">
              <TableWrap label={t('publications.series', { series: seriesId })}>
                <thead>
                  <tr>
                    <th scope="col">{t('publications.sequence')}</th>
                    <th scope="col">{t('publications.status')}</th>
                    <th scope="col">{t('publications.published')}</th>
                    <th scope="col">{t('publications.manifest')}</th>
                    <th scope="col">{t('publications.anchors')}</th>
                    <th scope="col">{t('publications.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((publication) => (
                    <tr key={publication.id}>
                      <td className="font-bold text-navy">{publication.sequence}</td>
                      <td>
                        <PublicationStatusBadge status={publication.status} />
                      </td>
                      <td className="whitespace-nowrap">
                        {formatDate(locale, publication.published_at)}
                      </td>
                      <td>
                        {publication.manifest_hash && (
                          <code className="hash" title={publication.manifest_hash}>
                            {shortHash(publication.manifest_hash)}
                          </code>
                        )}
                      </td>
                      <td>
                        <span className="flex flex-wrap gap-1.5">
                          {publication.blockchain_anchors.map((anchor) => (
                            <span
                              key={anchor.anchor_type}
                              className="flex items-center gap-1 text-sm"
                            >
                              <span className="font-semibold uppercase text-muted">
                                {anchor.anchor_type}
                              </span>
                              <AnchorStatusBadge status={anchor.status} />
                            </span>
                          ))}
                        </span>
                      </td>
                      <td>
                        <span className="flex gap-3 whitespace-nowrap">
                          <Link href={`/publications/${publication.id}`}>
                            {t('publications.view')}
                          </Link>
                          <Link href={`/verify/${publication.id}`}>{t('publications.verify')}</Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
