import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel, StatusChip } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { DefinitionList, Hash } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { isUuid } from '@/lib/data/public';
import { formatDate, formatNumber } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O06: ingestion report and approval. */
export default async function OpsDataset({ params }: PageProps<'/[locale]/ops/datasets/[id]'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTranslations();
  const db = await sessionDb();
  const { data: row } = await db
    .from('dataset_versions')
    .select(
      'id, label, kind, status, row_count, canonical_root, original_sha256, qualifying_date, ingestion_report, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!row) notFound();
  return (
    <>
      <OpsHeader
        title={row.label}
        actions={<StatusChip status={row.status} label={t(`datasetStatus.${row.status}`)} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <DefinitionList
            items={[
              { term: t('ops.datasets.kind'), detail: t(`ops.datasets.kinds.${row.kind}`) },
              {
                term: t('ops.datasets.qualifyingDate'),
                detail: formatDate(locale, row.qualifying_date) || '—',
              },
              {
                term: t('ops.datasets.rows'),
                detail: row.row_count === null ? '—' : formatNumber(locale, row.row_count),
              },
              {
                term: t('ops.datasets.root'),
                detail: row.canonical_root ? <Hash value={row.canonical_root} /> : '—',
              },
              {
                term: 'SHA-256',
                detail: row.original_sha256 ? <Hash value={row.original_sha256} /> : '—',
              },
            ]}
          />
        </Panel>
        {staff.has('data_steward') && row.status === 'validated' && (
          <Panel title={t('ops.datasets.approve')}>
            <WorkflowForm
              op="approve_dataset"
              fields={{ id: row.id }}
              submitLabel={t('ops.c.approve')}
            />
          </Panel>
        )}
      </div>
      <Panel title={t('ops.datasets.report')} className="mt-6">
        {row.ingestion_report ? (
          <pre className="hash overflow-x-auto rounded-xl bg-mist p-4 whitespace-pre-wrap">
            {JSON.stringify(row.ingestion_report, null, 2)}
          </pre>
        ) : (
          <p className="text-muted">{t('ops.datasets.reportEmpty')}</p>
        )}
      </Panel>
    </>
  );
}
