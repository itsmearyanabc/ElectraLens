import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, StatusChip } from '@/components/ops/OpsUi';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { formatDate, formatNumber } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O04 */
export default async function OpsDatasets({ params }: PageProps<'/[locale]/ops/datasets'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('dataset_versions')
    .select('id, label, kind, status, row_count, qualifying_date, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader
        title={t('ops.datasets.title')}
        actions={
          staff.has('data_steward') ? (
            <Link href="/ops/datasets/new" className="btn btn-primary">
              {t('ops.datasets.new')}
            </Link>
          ) : undefined
        }
      />
      <OpsTable
        head={[
          t('ops.datasets.label'),
          t('ops.datasets.kind'),
          t('ops.c.status'),
          t('ops.datasets.rows'),
          t('ops.datasets.qualifyingDate'),
        ]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <Link href={`/ops/datasets/${row.id}`} className="font-bold">
                {row.label}
              </Link>
            </td>
            <td>{t(`ops.datasets.kinds.${row.kind}`)}</td>
            <td>
              <StatusChip status={row.status} label={t(`datasetStatus.${row.status}`)} />
            </td>
            <td className="tabular-nums">
              {row.row_count === null ? '—' : formatNumber(locale, row.row_count)}
            </td>
            <td>{formatDate(locale, row.qualifying_date)}</td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
