import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, StatusChip } from '@/components/ops/OpsUi';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O12 */
export default async function OpsPublications({ params }: PageProps<'/[locale]/ops/publications'>) {
  const locale = await pageLocale(params);
  const staff = await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('publications')
    .select('id, series_id, sequence, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader
        title={t('ops.publications.title')}
        actions={
          staff.has('publisher') ? (
            <Link href="/ops/publications/new" className="btn btn-primary">
              {t('ops.publications.new')}
            </Link>
          ) : undefined
        }
      />
      <OpsTable
        head={['Series', t('publications.sequence'), t('ops.c.status'), t('ops.c.created')]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((p) => (
          <tr key={p.id}>
            <td>
              <Link href={`/ops/publications/${p.id}`} className="font-bold">
                {p.series_id}
              </Link>
            </td>
            <td className="tabular-nums">{p.sequence}</td>
            <td>
              <StatusChip status={p.status} label={t(`pubStatus.${p.status}`)} />
            </td>
            <td>{formatDateTime(locale, p.created_at)}</td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
