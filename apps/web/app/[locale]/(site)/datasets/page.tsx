import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SyntheticBadge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, TableWrap } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { areaLabels } from '@/lib/areas';
import { listDatasets } from '@/lib/data/public';
import { formatDate, formatNumber, shortHash } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/datasets'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'datasets' });
  return { title: t('metaTitle') };
}

export default async function DatasetsPage({ params }: PageProps<'/[locale]/datasets'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const datasets = await listDatasets();
  const areas = await areaLabels(
    datasets.map((d) => d.jurisdiction_id),
    locale,
  );

  return (
    <>
      <PageHeader
        eyebrow={t('datasets.eyebrow')}
        title={t('datasets.title')}
        lede={t('datasets.lede')}
      />
      <div className="container-page py-8">
        {datasets.length === 0 ? (
          <EmptyState title={t('datasets.empty')} />
        ) : (
          <>
            <TableWrap label={t('datasets.title')}>
              <thead>
                <tr>
                  <th scope="col">{t('datasets.label')}</th>
                  <th scope="col">{t('datasets.area')}</th>
                  <th scope="col">{t('datasets.qualifyingDate')}</th>
                  <th scope="col">{t('datasets.stage')}</th>
                  <th scope="col" className="text-right">
                    {t('datasets.rows')}
                  </th>
                  <th scope="col">{t('datasets.root')}</th>
                  <th scope="col">{t('datasets.source')}</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td>
                      <Link href={`/datasets/${dataset.id}`} className="font-semibold">
                        {dataset.label}
                      </Link>
                      {dataset.is_synthetic && (
                        <span className="ml-2">
                          <SyntheticBadge />
                        </span>
                      )}
                    </td>
                    <td>{areas.get(dataset.jurisdiction_id)?.label}</td>
                    <td className="whitespace-nowrap">
                      {formatDate(locale, dataset.qualifying_date)}
                    </td>
                    <td>{dataset.roll_stage ? t(`rollStage.${dataset.roll_stage}`) : '—'}</td>
                    <td className="text-right tabular-nums">
                      {dataset.row_count === null ? '—' : formatNumber(locale, dataset.row_count)}
                    </td>
                    <td>
                      {dataset.canonical_root && (
                        <code className="hash" title={dataset.canonical_root}>
                          {shortHash(dataset.canonical_root)}
                        </code>
                      )}
                    </td>
                    <td>{dataset.data_sources?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <p className="mt-4 text-sm text-muted">{t('datasets.rootHelp')}</p>
          </>
        )}
      </div>
    </>
  );
}
