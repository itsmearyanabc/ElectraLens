import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable, StatusChip } from '@/components/ops/OpsUi';
import { Link } from '@/i18n/navigation';
import { requireStaff } from '@/lib/auth';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O16: booth lists come in as polling_stations_v1 dataset versions. */
export default async function OpsBooths({ params }: PageProps<'/[locale]/ops/booths'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations();
  const db = await sessionDb();
  const { data } = await db
    .from('polling_stations')
    .select('id, public_code, station_code, name, published')
    .order('station_code')
    .limit(300);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader
        title={t('ops.booths.title')}
        lede={t('ops.booths.lede')}
        actions={
          <Link href="/ops/datasets/new" className="btn btn-primary">
            {t('ops.booths.import')}
          </Link>
        }
      />
      <OpsTable
        head={['Code', t('booth.posterTitle'), t('ops.c.status')]}
        empty={rows.length === 0 ? t('ops.c.empty') : null}
      >
        {rows.map((b) => (
          <tr key={b.id}>
            <td className="font-mono">{b.public_code}</td>
            <td>{localName(b.name, locale)}</td>
            <td>
              <StatusChip
                status={b.published ? 'published' : 'draft'}
                label={b.published ? t('ops.booths.published') : t('pubStatus.draft')}
              />
            </td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
