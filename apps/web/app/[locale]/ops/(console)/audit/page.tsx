import { getTranslations } from 'next-intl/server';

import { OpsHeader, OpsTable } from '@/components/ops/OpsUi';
import { requireStaff } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

/** O21 / B15.08: read-only. */
export default async function OpsAudit({ params }: PageProps<'/[locale]/ops/audit'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  const db = await sessionDb();
  const { data } = await db
    .from('audit_log')
    .select('id, at, actor_id, action, target_type, target_id, reason')
    .order('at', { ascending: false })
    .limit(200);
  const rows = data ?? [];
  return (
    <>
      <OpsHeader title={t('audit.title')} lede={t('audit.lede')} />
      <OpsTable
        head={[t('c.when'), t('audit.action'), t('audit.actor'), t('audit.target'), t('c.reason')]}
        empty={rows.length === 0 ? t('c.empty') : null}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap">{formatDateTime(locale, r.at)}</td>
            <td className="font-mono text-sm">{r.action}</td>
            <td className="font-mono text-sm">{r.actor_id?.slice(0, 8) ?? '—'}</td>
            <td className="font-mono text-sm">
              {r.target_type} {r.target_id?.slice(0, 8)}
            </td>
            <td className="text-sm text-muted">{r.reason ?? ''}</td>
          </tr>
        ))}
      </OpsTable>
    </>
  );
}
