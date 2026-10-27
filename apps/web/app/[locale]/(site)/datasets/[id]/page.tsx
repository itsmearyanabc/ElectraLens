import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { SyntheticBadge } from '@/components/ui/Badge';
import {
  DefinitionList,
  EmptyState,
  Hash,
  PageHeader,
  Section,
  TableWrap,
} from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { areaLabels } from '@/lib/areas';
import { getDataset, runsUsingDataset } from '@/lib/data/public';
import { formatDate, formatNumber } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/datasets/[id]'>): Promise<Metadata> {
  await pageLocale(params);
  const { id } = await params;
  const dataset = await getDataset(id);
  return dataset ? { title: dataset.label } : {};
}

export default async function DatasetPage({ params }: PageProps<'/[locale]/datasets/[id]'>) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) notFound();
  const t = await getTranslations();
  const [runs, areas] = await Promise.all([
    runsUsingDataset(dataset.id),
    areaLabels([dataset.jurisdiction_id], locale),
  ]);
  const source = dataset.data_sources;

  return (
    <>
      <PageHeader eyebrow={t('datasets.eyebrow')} title={dataset.label}>
        {dataset.is_synthetic && (
          <div className="mt-4">
            <SyntheticBadge />
          </div>
        )}
      </PageHeader>
      <div className="container-page py-4">
        <Section>
          <div className="card p-6">
            <DefinitionList
              items={[
                {
                  term: t('datasets.area'),
                  detail: areas.get(dataset.jurisdiction_id)?.label ?? '—',
                },
                {
                  term: t('datasets.kind'),
                  detail:
                    dataset.kind === 'electoral_roll'
                      ? t('datasets.kindElectoral')
                      : t('datasets.kindStations'),
                },
                {
                  term: t('datasets.qualifyingDate'),
                  detail: formatDate(locale, dataset.qualifying_date) || '—',
                },
                {
                  term: t('datasets.stage'),
                  detail: dataset.roll_stage ? t(`rollStage.${dataset.roll_stage}`) : '—',
                },
                { term: t('datasets.status'), detail: t(`datasetStatus.${dataset.status}`) },
                {
                  term: t('datasets.rows'),
                  detail:
                    dataset.row_count === null ? '—' : formatNumber(locale, dataset.row_count),
                },
                {
                  term: t('datasets.root'),
                  detail: dataset.canonical_root ? <Hash value={dataset.canonical_root} /> : '—',
                },
                {
                  term: t('datasets.schema'),
                  detail: <code className="hash">{dataset.schema_version}</code>,
                },
              ]}
            />
            <p className="mt-5 text-sm text-muted">{t('datasets.rootHelp')}</p>
          </div>
        </Section>

        {source && (
          <Section title={t('datasets.source')} id="source">
            <div className="card p-6">
              <DefinitionList
                items={[
                  { term: t('datasets.source'), detail: source.name },
                  { term: t('datasets.publisher'), detail: source.publisher },
                  {
                    term: t('datasets.permission'),
                    detail: t(`permission.${source.permission_basis}`),
                  },
                  ...(source.licence_note
                    ? [{ term: t('datasets.licence'), detail: source.licence_note }]
                    : []),
                ]}
              />
            </div>
          </Section>
        )}

        <Section title={t('datasets.runsTitle')} id="runs">
          {runs.length === 0 ? (
            <EmptyState title={t('datasets.runsEmpty')} />
          ) : (
            <TableWrap label={t('datasets.runsTitle')}>
              <thead>
                <tr>
                  <th scope="col">{t('datasets.role')}</th>
                  <th scope="col">{t('datasets.methodology')}</th>
                  <th scope="col">{t('datasets.finished')}</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      {run.baseline_version_id === dataset.id
                        ? t('datasets.roleBaseline')
                        : t('datasets.roleTarget')}
                    </td>
                    <td>
                      <Link href={`/methodology/${run.methodology_version}`}>
                        {run.methodology_version}
                      </Link>
                    </td>
                    <td>{formatDate(locale, run.finished_at)}</td>
                    <td>
                      <Link href={`/findings?run=${run.id}`}>{t('nav.findings')}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Section>
      </div>
    </>
  );
}
