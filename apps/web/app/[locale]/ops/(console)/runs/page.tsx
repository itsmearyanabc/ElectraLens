import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, StatusChip } from '@/components/ops/OpsUi';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O07 */
export default async function OpsRuns({ params }: PageProps<'/[locale]/ops/runs'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('audit_runs')
    .select('id, status, methodology_version, created_at, finished_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader
        title={t('ops.runs.title')}
        actions={
          staff.has('analyst') ? (
            <Link href="/ops/runs/new" className="btn btn-primary">
              {t('ops.runs.new')}
            </Link>
          ) : undefined
        }
      />
      <OpsTable
        head={['ID', t('ops.c.status'), t('ops.runs.methodology'), t('ops.c.created')]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <Link href={`/ops/runs/${row.id}`} className="font-mono font-bold">
                {row.id.slice(0, 8)}
              </Link>
            </td>
            <td>
              <StatusChip status={row.status} label={t(`runStatus.${row.status}`)} />
            </td>
            <td className="font-mono">{row.methodology_version}</td>
            <td>{formatDateTime(locale, row.created_at)}</td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
